
package com.carequeue.push.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

import com.carequeue.push.EmailService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static com.carequeue.push.auth.AuthDtos.*;

@Service
public class AuthService {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private static final Pattern PHONE_PATTERN =
        Pattern.compile("^\\+?[0-9\\s-]{7,15}$");

    private static final Set<String> ALLOWED_GENDERS = Set.of(
        "Male",
        "Female",
        "Other",
        "Prefer not to say"
    );

    private static final int MAX_PHOTO_DATA_LENGTH = 2_100_000;
    private static final int MAX_OTP_ATTEMPTS = 5;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserAccountRepository repository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final long refreshExpiration;

    public AuthService(
        UserAccountRepository repository,
        RefreshTokenRepository refreshTokenRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtService jwtService,
        EmailService emailService,
        @Value("${carequeue.security.refresh.expiration}") long refreshExpiration
    ) {
        this.repository = repository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.refreshExpiration = refreshExpiration;
    }

    public record LoginResult(
        AuthResponse response,
        String refreshToken
    ) {
    }

    // =========================
    // PATIENT REGISTRATION
    // =========================

    @Transactional
    public void register(RegisterRequest request) {

        if (request == null) {
            throw badRequest("Registration details are required.");
        }

        String name = clean(request.name());
        String email = normalizeEmail(request.email());
        String phone = clean(request.phone());
        String address = clean(request.address());
        String gender = clean(request.gender());
        String password = request.password();
        String confirmPassword = request.confirmPassword();
        String photoData = request.profilePhotoData();

        if (name.isBlank() || email.isBlank()
            || phone.isBlank() || address.isBlank()
            || gender.isBlank() || request.age() == null) {
            throw badRequest("Please complete all required fields.");
        }

        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw badRequest("Please enter a valid email address.");
        }

        if (!PHONE_PATTERN.matcher(phone).matches()) {
            throw badRequest("Please enter a valid phone number.");
        }

        if (request.age() < 1 || request.age() > 120) {
            throw badRequest("Please enter a valid age.");
        }

        if (!ALLOWED_GENDERS.contains(gender)) {
            throw badRequest("Please select a valid gender.");
        }

        if (password == null || password.length() < 8
            || password.length() > 72) {
            throw badRequest(
                "Password must contain between 8 and 72 characters."
            );
        }

        if (confirmPassword == null
            || !password.equals(confirmPassword)) {
            throw badRequest("Passwords do not match.");
        }

        validatePhoto(photoData);

        if (repository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "An account with this email already exists."
            );
        }

        UserAccount user = new UserAccount(
            email,
            passwordEncoder.encode(password),
            "PATIENT",
            name,
            phone,
            address,
            request.age(),
            gender,
            photoData
        );

        user.setEmailVerified(false);

        String otp = generateOtp();

        user.setEmailOtpHash(hashOtp(email, otp));
        user.setEmailOtpExpiresAt(Instant.now().plusSeconds(300));
        user.setEmailOtpAttempts(0);

        repository.save(user);

        emailService.sendOtpEmail(email, otp);
    }

    // =========================
    // VERIFY EMAIL
    // =========================

    @Transactional
    public boolean verifyEmail(VerifyEmailRequest request) {

        if (request == null
            || request.email() == null
            || request.otp() == null
            || request.email().isBlank()
            || request.otp().isBlank()) {
            return false;
        }

        String email = normalizeEmail(request.email());
        String otp = request.otp().trim();

        if (!otp.matches("\\d{6}")) {
            return false;
        }

        UserAccount user = repository.findByEmailIgnoreCase(email)
            .orElse(null);

        if (user == null) {
            return false;
        }

        if (user.isEmailVerified()) {
            return true;
        }

        if (user.getEmailOtpHash() == null
            || user.getEmailOtpExpiresAt() == null) {
            return false;
        }

        if (user.getEmailOtpAttempts() != null
            && user.getEmailOtpAttempts() >= MAX_OTP_ATTEMPTS) {
            user.clearEmailOtp();
            repository.save(user);
            return false;
        }

        if (Instant.now().isAfter(user.getEmailOtpExpiresAt())) {
            user.clearEmailOtp();
            repository.save(user);
            return false;
        }

        String submittedHash = hashOtp(email, otp);

        boolean matches = MessageDigest.isEqual(
            user.getEmailOtpHash().getBytes(StandardCharsets.UTF_8),
            submittedHash.getBytes(StandardCharsets.UTF_8)
        );

        if (!matches) {
            int attempts = user.getEmailOtpAttempts() == null
                ? 1
                : user.getEmailOtpAttempts() + 1;

            user.setEmailOtpAttempts(attempts);

            if (attempts >= MAX_OTP_ATTEMPTS) {
                user.clearEmailOtp();
            }

            repository.save(user);
            return false;
        }

        user.setEmailVerified(true);
        user.clearEmailOtp();

        repository.save(user);

        return true;
    }

    // =========================
    // FORGOT PASSWORD - SEND OTP
    // =========================

    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {

        // Always return the same response to avoid revealing
        // whether an email address is registered.
        if (request == null
            || request.email() == null
            || request.email().isBlank()) {
            return;
        }

        String email = normalizeEmail(request.email());

        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return;
        }

        UserAccount user = repository.findByEmailIgnoreCase(email)
            .orElse(null);

        // Only verified patient accounts can reset passwords.
        if (user == null
            || !user.isEmailVerified()
            || !"PATIENT".equalsIgnoreCase(user.getRole())) {
            return;
        }

        String otp = generateOtp();

        user.setPasswordResetOtpHash(
            hashPasswordResetOtp(email, otp)
        );

        user.setPasswordResetOtpExpiresAt(
            Instant.now().plusSeconds(300)
        );

        user.setPasswordResetOtpAttempts(0);

        repository.save(user);

        emailService.sendPasswordResetOtpEmail(email, otp);
    }

    // =========================
    // RESET PASSWORD USING OTP
    // =========================

    @Transactional
    public boolean resetPassword(ResetPasswordRequest request) {

        if (request == null
            || request.email() == null
            || request.otp() == null
            || request.newPassword() == null
            || request.confirmPassword() == null) {
            throw badRequest("Please complete all required fields.");
        }

        String email = normalizeEmail(request.email());
        String otp = request.otp().trim();
        String newPassword = request.newPassword();

        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return false;
        }

        if (!otp.matches("\\d{6}")) {
            return false;
        }

        if (newPassword.length() < 8 || newPassword.length() > 72) {
            throw badRequest(
                "Password must contain between 8 and 72 characters."
            );
        }

        if (!newPassword.equals(request.confirmPassword())) {
            throw badRequest("Passwords do not match.");
        }

        UserAccount user = repository.findByEmailIgnoreCase(email)
            .orElse(null);

        if (user == null
            || !user.isEmailVerified()
            || !"PATIENT".equalsIgnoreCase(user.getRole())) {
            return false;
        }

        if (user.getPasswordResetOtpHash() == null
            || user.getPasswordResetOtpExpiresAt() == null) {
            return false;
        }

        Integer currentAttempts = user.getPasswordResetOtpAttempts();

        if (currentAttempts != null
            && currentAttempts >= MAX_OTP_ATTEMPTS) {
            user.clearPasswordResetOtp();
            repository.save(user);
            return false;
        }

        if (Instant.now().isAfter(
            user.getPasswordResetOtpExpiresAt()
        )) {
            user.clearPasswordResetOtp();
            repository.save(user);
            return false;
        }

        String submittedHash = hashPasswordResetOtp(email, otp);

        boolean matches = MessageDigest.isEqual(
            user.getPasswordResetOtpHash().getBytes(
                StandardCharsets.UTF_8
            ),
            submittedHash.getBytes(StandardCharsets.UTF_8)
        );

        if (!matches) {

            int attempts = currentAttempts == null
                ? 1
                : currentAttempts + 1;

            user.setPasswordResetOtpAttempts(attempts);

            if (attempts >= MAX_OTP_ATTEMPTS) {
                user.clearPasswordResetOtp();
            }

            repository.save(user);

            return false;
        }

        user.setPasswordHash(
            passwordEncoder.encode(newPassword)
        );

        user.clearPasswordResetOtp();

        repository.save(user);

        return true;
    }

    // =========================
    // LOGIN
    // =========================

    @Transactional
    public LoginResult login(LoginRequest request) {

        if (request == null
            || request.email() == null
            || request.password() == null
            || request.email().isBlank()
            || request.password().isBlank()) {
            throw badRequest("Email and password are required.");
        }

        String email = normalizeEmail(request.email());

        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    email,
                    request.password()
                )
            );
        } catch (org.springframework.security.core.AuthenticationException exception) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Incorrect email or password."
            );
        }

        UserAccount user = repository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Incorrect email or password."
            ));

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Please verify your email before logging in."
            );
        }

        return createLoginResult(user);
    }

    // =========================
    // REFRESH ACCESS TOKEN
    // =========================

    @Transactional
    public LoginResult refresh(String rawRefreshToken) {

        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw unauthorized("Refresh token is missing.");
        }

        String tokenHash = hashToken(rawRefreshToken);

        RefreshToken existing = refreshTokenRepository
            .findByTokenHash(tokenHash)
            .orElseThrow(() -> unauthorized("Invalid refresh token."));

        if (existing.isRevoked() || existing.isExpired()) {
            existing.revoke();
            refreshTokenRepository.save(existing);

            throw unauthorized(
                "Refresh token has expired. Please log in again."
            );
        }

        UserAccount user = existing.getUser();

        existing.revoke();
        refreshTokenRepository.save(existing);

        return createLoginResult(user);
    }

    // =========================
    // LOGOUT
    // =========================

    @Transactional
    public void logout(String rawRefreshToken) {

        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }

        String tokenHash = hashToken(rawRefreshToken);

        refreshTokenRepository.findByTokenHash(tokenHash)
            .ifPresent(token -> {
                token.revoke();
                refreshTokenRepository.save(token);
            });
    }

    // =========================
    // GET CURRENT USER
    // =========================

    @Transactional(readOnly = true)
    public UserResponse getUser(String email) {

        UserAccount user = repository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Account not found."
            ));

        return toUserResponse(user);
    }

    // =========================
    // UPDATE PATIENT PROFILE
    // =========================

    @Transactional
    public UserResponse updatePatientProfile(
        String email,
        ProfileUpdateRequest request
    ) {

        if (request == null) {
            throw badRequest("Profile details are required.");
        }

        UserAccount user = repository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Account not found."
            ));

        if (!"PATIENT".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only patient accounts can update these details."
            );
        }

        String name = clean(request.name());
        String phone = clean(request.phone());
        String address = clean(request.address());
        String gender = clean(request.gender());

        if (name.isBlank() || phone.isBlank()
            || address.isBlank() || gender.isBlank()
            || request.age() == null) {
            throw badRequest("Please complete all required fields.");
        }

        if (!PHONE_PATTERN.matcher(phone).matches()) {
            throw badRequest("Please enter a valid phone number.");
        }

        if (request.age() < 1 || request.age() > 120) {
            throw badRequest("Please enter a valid age.");
        }

        if (!ALLOWED_GENDERS.contains(gender)) {
            throw badRequest("Please select a valid gender.");
        }

        validatePhoto(request.profilePhotoData());

        user.setName(name);
        user.setPhone(phone);
        user.setAddress(address);
        user.setAge(request.age());
        user.setGender(gender);
        user.setProfilePhotoData(request.profilePhotoData());

        UserAccount savedUser = repository.save(user);

        return toUserResponse(savedUser);
    }

    // =========================
    // CHANGE PATIENT PASSWORD
    // =========================

    @Transactional
    public void changePatientPassword(
        String email,
        ChangePasswordRequest request
    ) {

        if (request == null
            || request.currentPassword() == null
            || request.newPassword() == null
            || request.confirmPassword() == null) {
            throw badRequest("Please complete all password fields.");
        }

        UserAccount user = repository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Account not found."
            ));

        if (!"PATIENT".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only patient accounts can change passwords here."
            );
        }

        if (!passwordEncoder.matches(
            request.currentPassword(),
            user.getPasswordHash()
        )) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Your current password is incorrect."
            );
        }

        String newPassword = request.newPassword();

        if (newPassword.length() < 8 || newPassword.length() > 72) {
            throw badRequest(
                "New password must contain between 8 and 72 characters."
            );
        }

        if (!newPassword.equals(request.confirmPassword())) {
            throw badRequest("New passwords do not match.");
        }

        if (passwordEncoder.matches(
            newPassword,
            user.getPasswordHash()
        )) {
            throw badRequest(
                "Your new password must be different from your current password."
            );
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));

        repository.save(user);
    }

    // =========================
    // CONVERT USER TO RESPONSE
    // =========================

    private UserResponse toUserResponse(UserAccount user) {

        return new UserResponse(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getPhone(),
            user.getAddress(),
            user.getAge(),
            user.getGender(),
            user.getProfilePhotoData(),
            user.getRole()
        );
    }

    // =========================
    // CREATE LOGIN RESULT
    // =========================

    private LoginResult createLoginResult(UserAccount user) {

        String accessToken = jwtService.generateToken(
            user.getEmail(),
            user.getRole()
        );

        byte[] randomBytes = new byte[64];
        SECURE_RANDOM.nextBytes(randomBytes);

        String rawRefreshToken = Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(randomBytes);

        RefreshToken storedToken = new RefreshToken(
            hashToken(rawRefreshToken),
            user,
            Instant.now().plusMillis(refreshExpiration)
        );

        refreshTokenRepository.save(storedToken);

        AuthResponse response = new AuthResponse(
            accessToken,
            "Bearer",
            jwtService.getExpiration(),
            user.getEmail(),
            user.getName(),
            user.getRole()
        );

        return new LoginResult(response, rawRefreshToken);
    }

    // =========================
    // GENERATE OTP
    // =========================

    private String generateOtp() {
        return String.valueOf(
            SECURE_RANDOM.nextInt(900000) + 100000
        );
    }

    // =========================
    // HASH EMAIL VERIFICATION OTP
    // =========================

    private String hashOtp(String email, String otp) {

        return hashValue(email + ":" + otp);
    }

    // =========================
    // HASH PASSWORD RESET OTP
    // =========================

    private String hashPasswordResetOtp(String email, String otp) {

        return hashValue("PASSWORD_RESET:" + email + ":" + otp);
    }

    // =========================
    // COMMON HASH HELPER
    // =========================

    private String hashValue(String value) {

        try {
            MessageDigest digest =
                MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                value.getBytes(StandardCharsets.UTF_8)
            );

            return Base64.getEncoder().encodeToString(hash);

        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                "Unable to hash OTP.",
                exception
            );
        }
    }

    // =========================
    // HASH REFRESH TOKEN
    // =========================

    private String hashToken(String token) {

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                token.getBytes(StandardCharsets.UTF_8)
            );

            return Base64.getEncoder().encodeToString(hash);

        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                "Unable to hash refresh token.",
                exception
            );
        }
    }

    // =========================
    // PROFILE PHOTO VALIDATION
    // =========================

    private void validatePhoto(String photoData) {

        if (photoData == null || photoData.isBlank()) {
            return;
        }

        if (photoData.length() > MAX_PHOTO_DATA_LENGTH) {
            throw badRequest(
                "Profile photo must be smaller than 1.5 MB."
            );
        }

        boolean validImage =
            photoData.startsWith("data:image/jpeg;base64,")
            || photoData.startsWith("data:image/png;base64,")
            || photoData.startsWith("data:image/webp;base64,")
            || photoData.startsWith("data:image/gif;base64,");

        if (!validImage) {
            throw badRequest("Please upload a supported image file.");
        }
    }

    // =========================
    // COMMON HELPERS
    // =========================

    private static ResponseStatusException badRequest(String message) {

        return new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            message
        );
    }

    private static ResponseStatusException unauthorized(String message) {

        return new ResponseStatusException(
            HttpStatus.UNAUTHORIZED,
            message
        );
    }

    private static String normalizeEmail(String email) {

        return email == null
            ? ""
            : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String clean(String value) {

        return value == null ? "" : value.trim();
    }
}
