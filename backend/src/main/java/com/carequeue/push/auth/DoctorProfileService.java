
package com.carequeue.push.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static com.carequeue.push.auth.DoctorProfileDtos.*;

@Service
public class DoctorProfileService {

    private final UserAccountRepository userRepository;

    public DoctorProfileService(UserAccountRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Admin loads their complete doctor profile.
    @Transactional(readOnly = true)
    public AdminProfileResponse getAdminProfile(String email) {

        UserAccount account = getAdminAccount(email);

        return new AdminProfileResponse(
            account.getName(),
            account.getEmail(),
            account.getPhone(),
            account.getEmergencyNumber(),
            account.getProfilePhotoData(),
            account.getQualification(),
            account.getSpecialization(),
            account.getExperienceYears(),
            account.getAboutMe(),
            account.getConsultationTimings()
        );
    }

    // Admin updates their doctor profile.
    @Transactional
    public AdminProfileResponse updateAdminProfile(
        String email,
        UpdateRequest request
    ) {

        if (request == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Profile information is required."
            );
        }

        UserAccount account = getAdminAccount(email);

        String name = clean(request.name());
        String phone = clean(request.phone());
        String emergencyNumber = clean(request.emergencyNumber());
        String qualification = clean(request.qualification());
        String specialization = clean(request.specialization());
        String aboutMe = clean(request.aboutMe());
        String consultationTimings = clean(request.consultationTimings());
        String photo = clean(request.profilePhotoData());

        if (name == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Doctor name is required."
            );
        }

        if (name.length() > 120) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Doctor name cannot exceed 120 characters."
            );
        }

        if (phone != null && phone.length() > 30) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Phone number cannot exceed 30 characters."
            );
        }

        if (emergencyNumber != null &&
            emergencyNumber.length() > 30) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Emergency number cannot exceed 30 characters."
            );
        }

        if (qualification != null && qualification.length() > 150) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Qualification cannot exceed 150 characters."
            );
        }

        if (specialization != null && specialization.length() > 150) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Specialization cannot exceed 150 characters."
            );
        }

        if (consultationTimings != null &&
            consultationTimings.length() > 500) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Consultation timings cannot exceed 500 characters."
            );
        }

        if (request.experienceYears() != null &&
            (request.experienceYears() < 0 ||
             request.experienceYears() > 80)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Experience must be between 0 and 80 years."
            );
        }

        if (aboutMe != null && aboutMe.length() > 10000) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "About Me cannot exceed 10000 characters."
            );
        }

        validatePhoto(photo);

        account.setName(name);
        account.setPhone(phone);
        account.setEmergencyNumber(emergencyNumber);
        account.setProfilePhotoData(photo);
        account.setQualification(qualification);
        account.setSpecialization(specialization);
        account.setExperienceYears(request.experienceYears());
        account.setAboutMe(aboutMe);
        account.setConsultationTimings(consultationTimings);

        userRepository.save(account);

        return getAdminProfile(email);
    }

    // Patients receive only public doctor information.
    @Transactional(readOnly = true)
    public PublicProfileResponse getPublicProfile() {

        UserAccount account = userRepository
            .findFirstByRoleIgnoreCase("ADMIN")
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Doctor profile is not available yet."
            ));

        return new PublicProfileResponse(
            account.getName(),
            account.getProfilePhotoData(),
            account.getQualification(),
            account.getSpecialization(),
            account.getExperienceYears(),
            account.getAboutMe(),
            account.getConsultationTimings()
        );
    }

    // Get the admin email for patient appointment requests.
    @Transactional(readOnly = true)
    public AppointmentEmailResponse getAppointmentEmail() {

        UserAccount account = userRepository
            .findFirstByRoleIgnoreCase("ADMIN")
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Appointment email is not available."
            ));

        return new AppointmentEmailResponse(
            account.getEmail()
        );
    }

    // Get the emergency number for patients.
    @Transactional(readOnly = true)
    public EmergencyNumberResponse getEmergencyNumber() {

        UserAccount account = userRepository
            .findFirstByRoleIgnoreCase("ADMIN")
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Emergency contact is not available."
            ));

        String number = account.getEmergencyNumber();

        if (number == null || number.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Emergency contact number has not been added by Admin."
            );
        }

        return new EmergencyNumberResponse(number);
    }

    private UserAccount getAdminAccount(String email) {

        UserAccount account = userRepository
            .findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Admin account not found."
            ));

        if (!"ADMIN".equalsIgnoreCase(account.getRole())) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only the Admin can manage the doctor profile."
            );
        }

        return account;
    }

    private String clean(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private void validatePhoto(String photo) {

        if (photo == null) {
            return;
        }

        if (photo.length() > 2_100_000) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Profile photo is too large. Choose an image smaller than 2 MB."
            );
        }

        boolean validFormat =
            photo.startsWith("data:image/jpeg;base64,") ||
            photo.startsWith("data:image/png;base64,") ||
            photo.startsWith("data:image/webp;base64,") ||
            photo.startsWith("data:image/gif;base64,");

        if (!validFormat) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only JPEG, PNG, WEBP and GIF profile photos are supported."
            );
        }
    }
}
