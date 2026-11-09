
package com.carequeue.push.auth;

import java.time.Instant;

import jakarta.persistence.*;

@Entity
@Table(
    name = "user_accounts",
    indexes = {
        @Index(name = "idx_user_accounts_email", columnList = "email", unique = true)
    }
)
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 190)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 30)
    private String phone;

    // Admin emergency contact number
    @Column(name = "emergency_number", length = 30)
    private String emergencyNumber;

    @Column(length = 500)
    private String address;

    private Integer age;

    @Column(length = 40)
    private String gender;

    @Column(columnDefinition = "TEXT")
    private String profilePhotoData;

    // Doctor profile information
    @Column(length = 150)
    private String qualification;

    @Column(length = 150)
    private String specialization;

    private Integer experienceYears;

    @Column(columnDefinition = "TEXT")
    private String aboutMe;

    @Column(length = 500)
    private String consultationTimings;

    // Email verification
    // Null is treated as verified to preserve existing accounts.
    @Column(name = "email_verified")
    private Boolean emailVerified = true;

    @Column(name = "email_otp_hash", length = 100)
    private String emailOtpHash;

    @Column(name = "email_otp_expires_at")
    private Instant emailOtpExpiresAt;

    @Column(name = "email_otp_attempts")
    private Integer emailOtpAttempts = 0;

    // Password reset OTP
    @Column(name = "password_reset_otp_hash", length = 100)
    private String passwordResetOtpHash;

    @Column(name = "password_reset_otp_expires_at")
    private Instant passwordResetOtpExpiresAt;

    @Column(name = "password_reset_otp_attempts")
    private Integer passwordResetOtpAttempts = 0;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected UserAccount() {
    }

    // Retained for compatibility with the existing admin seeder.
    public UserAccount(
        String email,
        String passwordHash,
        String role,
        String name,
        String phone,
        String address
    ) {
        this(
            email,
            passwordHash,
            role,
            name,
            phone,
            address,
            null,
            null,
            null
        );
    }

    public UserAccount(
        String email,
        String passwordHash,
        String role,
        String name,
        String phone,
        String address,
        Integer age,
        String gender,
        String profilePhotoData
    ) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.name = name;
        this.phone = phone;
        this.address = address;
        this.age = age;
        this.gender = gender;
        this.profilePhotoData = profilePhotoData;
        this.emailVerified = true;
        this.emailOtpAttempts = 0;
        this.passwordResetOtpAttempts = 0;
        this.createdAt = Instant.now();
    }

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getRole() {
        return role;
    }

    public String getName() {
        return name;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmergencyNumber() {
        return emergencyNumber;
    }

    public String getAddress() {
        return address;
    }

    public Integer getAge() {
        return age;
    }

    public String getGender() {
        return gender;
    }

    public String getProfilePhotoData() {
        return profilePhotoData;
    }

    public String getQualification() {
        return qualification;
    }

    public String getSpecialization() {
        return specialization;
    }

    public Integer getExperienceYears() {
        return experienceYears;
    }

    public String getAboutMe() {
        return aboutMe;
    }

    public String getConsultationTimings() {
        return consultationTimings;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    // Email verification methods
    public boolean isEmailVerified() {
        return emailVerified == null || emailVerified;
    }

    public String getEmailOtpHash() {
        return emailOtpHash;
    }

    public Instant getEmailOtpExpiresAt() {
        return emailOtpExpiresAt;
    }

    public Integer getEmailOtpAttempts() {
        return emailOtpAttempts;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public void setEmailOtpHash(String emailOtpHash) {
        this.emailOtpHash = emailOtpHash;
    }

    public void setEmailOtpExpiresAt(Instant emailOtpExpiresAt) {
        this.emailOtpExpiresAt = emailOtpExpiresAt;
    }

    public void setEmailOtpAttempts(Integer emailOtpAttempts) {
        this.emailOtpAttempts = emailOtpAttempts;
    }

    public void clearEmailOtp() {
        this.emailOtpHash = null;
        this.emailOtpExpiresAt = null;
        this.emailOtpAttempts = 0;
    }

    // Password reset OTP methods
    public String getPasswordResetOtpHash() {
        return passwordResetOtpHash;
    }

    public Instant getPasswordResetOtpExpiresAt() {
        return passwordResetOtpExpiresAt;
    }

    public Integer getPasswordResetOtpAttempts() {
        return passwordResetOtpAttempts;
    }

    public void setPasswordResetOtpHash(String hash) {
        this.passwordResetOtpHash = hash;
    }

    public void setPasswordResetOtpExpiresAt(Instant expiresAt) {
        this.passwordResetOtpExpiresAt = expiresAt;
    }

    public void setPasswordResetOtpAttempts(Integer attempts) {
        this.passwordResetOtpAttempts = attempts;
    }

    public void clearPasswordResetOtp() {
        this.passwordResetOtpHash = null;
        this.passwordResetOtpExpiresAt = null;
        this.passwordResetOtpAttempts = 0;
    }

    // Existing profile methods
    public void setName(String name) {
        this.name = name;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setEmergencyNumber(String emergencyNumber) {
        this.emergencyNumber = emergencyNumber;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public void setProfilePhotoData(String profilePhotoData) {
        this.profilePhotoData = profilePhotoData;
    }

    public void setQualification(String qualification) {
        this.qualification = qualification;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public void setExperienceYears(Integer experienceYears) {
        this.experienceYears = experienceYears;
    }

    public void setAboutMe(String aboutMe) {
        this.aboutMe = aboutMe;
    }

    public void setConsultationTimings(String consultationTimings) {
        this.consultationTimings = consultationTimings;
    }
}
