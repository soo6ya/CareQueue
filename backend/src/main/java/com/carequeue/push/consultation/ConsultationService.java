
package com.carequeue.push.consultation;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.carequeue.push.consultation.Consultation.MedicinePrescription;
import com.carequeue.push.consultation.Consultation.PatientDetails;

@Service
public class ConsultationService {

    private final ConsultationRepository consultationRepository;

    public ConsultationService(
        ConsultationRepository consultationRepository
    ) {
        this.consultationRepository = consultationRepository;
    }

    @Transactional
    public ConsultationResponse saveConsultation(
        ConsultationRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException(
                "Consultation data is required."
            );
        }

        if (request.token() == null || request.token() <= 0) {
            throw new IllegalArgumentException(
                "A valid patient token is required."
            );
        }

        String sessionId = required(
            request.queueSessionId(),
            "Queue session ID"
        );

        String email = required(
            request.patientEmail(),
            "Patient email"
        ).toLowerCase(Locale.ROOT);

        String patientName = required(
            request.patientName(),
            "Patient name"
        );

        String reason = required(
            request.reason(),
            "Reason for visit"
        );

        if (consultationRepository.existsByQueueSessionIdAndToken(
            sessionId,
            request.token()
        )) {
            throw new IllegalStateException(
                "This consultation has already been saved."
            );
        }

        PatientDetailsRequest detailsRequest =
            request.patientDetails();

        PatientDetails details = detailsRequest == null
            ? new PatientDetails(
                patientName,
                "",
                email,
                ""
            )
            : new PatientDetails(
                detailsRequest.name(),
                detailsRequest.phone(),
                detailsRequest.email(),
                detailsRequest.address()
            );

        List<MedicinePrescription> medicines =
            request.medicines() == null
                ? List.of()
                : request.medicines().stream()
                    .filter(medicine ->
                        medicine != null &&
                        medicine.name() != null &&
                        !medicine.name().isBlank()
                    )
                    .map(medicine ->
                        new MedicinePrescription(
                            medicine.name().trim(),
                            clean(medicine.dosage()),
                            clean(medicine.frequency()),
                            clean(medicine.duration()),
                            clean(medicine.instructions())
                        )
                    )
                    .toList();

        Instant completedAt = request.completedAt() == null
            ? Instant.now()
            : request.completedAt();

        Instant consultationAt = request.consultationAt() == null
            ? completedAt
            : request.consultationAt();

        Consultation consultation = new Consultation(
            request.token(),
            sessionId,
            clean(request.patientRecordId()),
            email,
            patientName,
            details,
            clean(request.department()),
            clean(request.doctor()),
            reason,
            clean(request.diagnosis()),
            clean(request.notes()),
            medicines,
            consultationAt,
            completedAt
        );

        Consultation saved = consultationRepository.save(consultation);

        // Convert the entity to a DTO before the transaction closes.
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> getPatientConsultations(
        String patientEmail
    ) {
        String email = required(
            patientEmail,
            "Patient email"
        ).toLowerCase(Locale.ROOT);

        return consultationRepository
            .findAllByPatientEmailIgnoreCaseOrderByCompletedAtDesc(email)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> getAllConsultations() {
        return consultationRepository
            .findAllByOrderByCompletedAtDesc()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    private ConsultationResponse toResponse(
        Consultation consultation
    ) {
        // Access the medicines while the transaction is still active.
        List<MedicineResponse> medicineResponses =
            consultation.getMedicines()
                .stream()
                .map(medicine ->
                    new MedicineResponse(
                        medicine.getName(),
                        medicine.getDosage(),
                        medicine.getFrequency(),
                        medicine.getDuration(),
                        medicine.getInstructions()
                    )
                )
                .toList();

        PatientDetails details = consultation.getPatientDetails();

        PatientDetailsResponse patientDetailsResponse =
            details == null
                ? null
                : new PatientDetailsResponse(
                    details.getName(),
                    details.getPhone(),
                    details.getEmail(),
                    details.getAddress()
                );

        return new ConsultationResponse(
            consultation.getId(),
            consultation.getToken(),
            consultation.getQueueSessionId(),
            consultation.getPatientRecordId(),
            consultation.getPatientEmail(),
            consultation.getPatientName(),
            patientDetailsResponse,
            consultation.getDepartment(),
            consultation.getDoctor(),
            consultation.getReason(),
            consultation.getDiagnosis(),
            consultation.getNotes(),
            medicineResponses,
            consultation.getConsultationAt(),
            consultation.getCompletedAt()
        );
    }

    private static String required(
        String value,
        String fieldName
    ) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                fieldName + " is required."
            );
        }

        return value.trim();
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    public record ConsultationRequest(
        Integer token,
        String queueSessionId,
        String patientRecordId,
        String patientEmail,
        String patientName,
        PatientDetailsRequest patientDetails,
        String department,
        String doctor,
        String reason,
        String diagnosis,
        String notes,
        List<MedicineRequest> medicines,
        Instant consultationAt,
        Instant completedAt
    ) {
    }

    public record PatientDetailsRequest(
        String name,
        String phone,
        String email,
        String address
    ) {
    }

    public record MedicineRequest(
        String name,
        String dosage,
        String frequency,
        String duration,
        String instructions
    ) {
    }

    public record ConsultationResponse(
        Long id,
        Integer token,
        String queueSessionId,
        String patientRecordId,
        String patientEmail,
        String patientName,
        PatientDetailsResponse patientDetails,
        String department,
        String doctor,
        String reason,
        String diagnosis,
        String notes,
        List<MedicineResponse> medicines,
        Instant consultationAt,
        Instant completedAt
    ) {
    }

    public record PatientDetailsResponse(
        String name,
        String phone,
        String email,
        String address
    ) {
    }

    public record MedicineResponse(
        String name,
        String dosage,
        String frequency,
        String duration,
        String instructions
    ) {
    }
}
