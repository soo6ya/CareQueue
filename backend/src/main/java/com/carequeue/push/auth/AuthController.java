
package com.carequeue.push.auth;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static com.carequeue.push.auth.AuthDtos.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${app.frontend-origin}")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // =========================
    // REGISTER
    // =========================

    @PostMapping("/register")
    public ResponseEntity<?> register(
        @RequestBody RegisterRequest request
    ) {
        authService.register(request);

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(
                Map.of(
                    "message",
                    "Registration successful. Please check your email for the verification code."
                )
            );
    }

    // =========================
    // VERIFY EMAIL
    // =========================

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(
        @RequestBody VerifyEmailRequest request
    ) {
        boolean verified = authService.verifyEmail(request);

        if (!verified) {
            return ResponseEntity.badRequest()
                .body(
                    Map.of(
                        "message",
                        "Invalid or expired verification code. Please check your code and try again."
                    )
                );
        }

        return ResponseEntity.ok(
            Map.of(
                "message",
                "Email verified successfully. You can now log in."
            )
        );
    }

    // =========================
    // FORGOT PASSWORD
    // =========================

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
        @RequestBody ForgotPasswordRequest request
    ) {
        authService.requestPasswordReset(request);

        // Same response whether the email exists or not.
        return ResponseEntity.ok(
            Map.of(
                "message",
                "If an eligible account exists, a password reset code has been sent to its email."
            )
        );
    }

    // =========================
    // RESET PASSWORD
    // =========================

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
        @RequestBody ResetPasswordRequest request
    ) {
        boolean reset = authService.resetPassword(request);

        if (!reset) {
            return ResponseEntity.badRequest()
                .body(
                    Map.of(
                        "message",
                        "Invalid or expired OTP, or the password details are incorrect."
                    )
                );
        }

        return ResponseEntity.ok(
            Map.of(
                "message",
                "Password reset successfully. You can now log in."
            )
        );
    }

    // =========================
    // LOGIN
    // =========================

    @PostMapping("/login")
    public ResponseEntity<?> login(
        @RequestBody LoginRequest request
    ) {
        AuthService.LoginResult result =
            authService.login(request);

        return ResponseEntity.ok(result.response());
    }

    // =========================
    // REFRESH TOKEN
    // =========================

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
        jakarta.servlet.http.HttpServletRequest request
    ) {
        String refreshToken = extractRefreshToken(request);

        AuthService.LoginResult result =
            authService.refresh(refreshToken);

        return ResponseEntity.ok(result.response());
    }

    // =========================
    // LOGOUT
    // =========================

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
        jakarta.servlet.http.HttpServletRequest request
    ) {
        String refreshToken = extractRefreshToken(request);

        authService.logout(refreshToken);

        return ResponseEntity.ok(
            Map.of("message", "Logged out successfully.")
        );
    }

    // =========================
    // GET CURRENT USER
    // =========================

    @GetMapping("/me")
    public ResponseEntity<?> me(
        Authentication authentication
    ) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Authentication required."));
        }

        return ResponseEntity.ok(
            authService.getUser(authentication.getName())
        );
    }

    // =========================
    // UPDATE PATIENT PROFILE
    // =========================

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
        Authentication authentication,
        @RequestBody ProfileUpdateRequest request
    ) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Authentication required."));
        }

        try {
            return ResponseEntity.ok(
                authService.updatePatientProfile(
                    authentication.getName(),
                    request
                )
            );
        } catch (ResponseStatusException exception) {
            return errorResponse(exception);
        }
    }

    // =========================
    // CHANGE PATIENT PASSWORD
    // =========================

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
        Authentication authentication,
        @RequestBody ChangePasswordRequest request
    ) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Authentication required."));
        }

        try {
            authService.changePatientPassword(
                authentication.getName(),
                request
            );

            return ResponseEntity.ok(
                Map.of("message", "Password changed successfully.")
            );
        } catch (ResponseStatusException exception) {
            return errorResponse(exception);
        }
    }

    // =========================
    // ERROR RESPONSE
    // =========================

    private ResponseEntity<?> errorResponse(
        ResponseStatusException exception
    ) {
        return ResponseEntity
            .status(exception.getStatusCode())
            .body(
                Map.of(
                    "message",
                    exception.getReason() != null
                        ? exception.getReason()
                        : "Request failed."
                )
            );
    }

    // =========================
    // REFRESH COOKIE
    // =========================

    private String extractRefreshToken(
        jakarta.servlet.http.HttpServletRequest request
    ) {
        if (request.getCookies() == null) {
            return null;
        }

        for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
            if ("carequeue_refresh".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }
}
