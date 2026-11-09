
package com.carequeue.push.consultation;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/consultations")
@CrossOrigin(origins = "${app.frontend-origin:http://localhost:5173}")
public class ConsultationController {

    private final ConsultationService consultationService;

    public ConsultationController(
        ConsultationService consultationService
    ) {
        this.consultationService = consultationService;
    }

    @PostMapping
    public ResponseEntity<?> saveConsultation(
        @RequestBody ConsultationService.ConsultationRequest request
    ) {
        try {
            ConsultationService.ConsultationResponse saved =
                consultationService.saveConsultation(request);

            return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                .badRequest()
                .body(Map.of("message", exception.getMessage()));

        } catch (IllegalStateException exception) {
            return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("message", exception.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getConsultations(
        Authentication authentication
    ) {
        try {
            if (authentication == null ||
                !authentication.isAuthenticated()) {
                return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                        "message",
                        "Authentication required."
                    ));
            }

            // Always use the authenticated user's email.
            // Never trust an email supplied by the client.
            String patientEmail = authentication.getName();

            List<ConsultationService.ConsultationResponse> consultations =
                consultationService.getPatientConsultations(
                    patientEmail
                );

            return ResponseEntity.ok(consultations);

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                .badRequest()
                .body(Map.of("message", exception.getMessage()));
        }
    }
}
