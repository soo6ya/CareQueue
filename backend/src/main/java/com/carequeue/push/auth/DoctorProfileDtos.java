
package com.carequeue.push.auth;

public final class DoctorProfileDtos {

    private DoctorProfileDtos() {
    }

    // Request received when Admin updates the doctor profile.
    public record UpdateRequest(
        String name,
        String phone,
        String emergencyNumber,
        String profilePhotoData,
        String qualification,
        String specialization,
        Integer experienceYears,
        String aboutMe,
        String consultationTimings
    ) {
    }

    // Complete profile returned to Admin.
    public record AdminProfileResponse(
        String name,
        String email,
        String phone,
        String emergencyNumber,
        String profilePhotoData,
        String qualification,
        String specialization,
        Integer experienceYears,
        String aboutMe,
        String consultationTimings
    ) {
    }

    // Only public information returned to patients.
    public record PublicProfileResponse(
        String name,
        String profilePhotoData,
        String qualification,
        String specialization,
        Integer experienceYears,
        String aboutMe,
        String consultationTimings
    ) {
    }

    // Admin email returned to authenticated patients.
    public record AppointmentEmailResponse(
        String email
    ) {
    }

    // Emergency number returned to authenticated patients.
    public record EmergencyNumberResponse(
        String emergencyNumber
    ) {
    }
}
