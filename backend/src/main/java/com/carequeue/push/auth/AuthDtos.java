
package com.carequeue.push.auth;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
        String name,
        String email,
        String phone,
        String address,
        Integer age,
        String gender,
        String password,
        String confirmPassword,
        String profilePhotoData
    ) {
    }

    public record LoginRequest(
        String email,
        String password
    ) {
    }

    public record VerifyEmailRequest(
        String email,
        String otp
    ) {
    }

    // Forgot password: request an OTP
    public record ForgotPasswordRequest(
        String email
    ) {
    }

    // Reset password using OTP
    public record ResetPasswordRequest(
        String email,
        String otp,
        String newPassword,
        String confirmPassword
    ) {
    }

    public record AuthResponse(
        String token,
        String tokenType,
        long expiresIn,
        String email,
        String name,
        String role
    ) {
    }

    public record UserResponse(
        Long id,
        String email,
        String name,
        String phone,
        String address,
        Integer age,
        String gender,
        String profilePhotoData,
        String role
    ) {
    }

    public record ProfileUpdateRequest(
        String name,
        String phone,
        String address,
        Integer age,
        String gender,
        String profilePhotoData
    ) {
    }

    public record ChangePasswordRequest(
        String currentPassword,
        String newPassword,
        String confirmPassword
    ) {
    }
}
