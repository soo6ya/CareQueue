
package com.carequeue.push.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import static com.carequeue.push.auth.DoctorProfileDtos.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${app.frontend-origin}")
public class DoctorProfileController {

    private final DoctorProfileService profileService;

    public DoctorProfileController(
        DoctorProfileService profileService
    ) {
        this.profileService = profileService;
    }

    // Public endpoint: patients can view the doctor profile.
    @GetMapping("/doctor-profile/public")
    public ResponseEntity<PublicProfileResponse> getPublicProfile() {

        return ResponseEntity.ok(
            profileService.getPublicProfile()
        );
    }

    // Emergency number for patients.
    @GetMapping("/doctor-profile/emergency-number")
    public ResponseEntity<EmergencyNumberResponse> getEmergencyNumber() {

        return ResponseEntity.ok(
            profileService.getEmergencyNumber()
        );
    }

    // Appointment recipient email.
    @GetMapping("/doctor-profile/appointment-email")
    public ResponseEntity<AppointmentEmailResponse> getAppointmentEmail() {

        return ResponseEntity.ok(
            profileService.getAppointmentEmail()
        );
    }

    // Admin endpoint: load complete profile.
    @GetMapping("/admin/doctor-profile")
    public ResponseEntity<AdminProfileResponse> getAdminProfile(
        Authentication authentication
    ) {

        return ResponseEntity.ok(
            profileService.getAdminProfile(authentication.getName())
        );
    }

    // Admin endpoint: update doctor profile.
    @PutMapping("/admin/doctor-profile")
    public ResponseEntity<AdminProfileResponse> updateAdminProfile(
        @RequestBody UpdateRequest request,
        Authentication authentication
    ) {

        return ResponseEntity.ok(
            profileService.updateAdminProfile(
                authentication.getName(),
                request
            )
        );
    }
}
