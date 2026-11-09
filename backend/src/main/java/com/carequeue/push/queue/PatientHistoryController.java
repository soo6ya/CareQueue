
package com.carequeue.push.queue;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.carequeue.push.consultation.ConsultationService;
import com.carequeue.push.consultation.ConsultationService.ConsultationResponse;

@RestController
@RequestMapping("/api/patient/history")
public class PatientHistoryController {

    private final QueueTicketRepository ticketRepository;
    private final ConsultationService consultationService;

    public PatientHistoryController(
        QueueTicketRepository ticketRepository,
        ConsultationService consultationService
    ) {
        this.ticketRepository = ticketRepository;
        this.consultationService = consultationService;
    }

    @GetMapping
    public ResponseEntity<List<HistoryRecord>> getPatientHistory(
        Authentication authentication
    ) {
        if (authentication == null
            || authentication.getName() == null
            || authentication.getName().isBlank()) {
            return ResponseEntity.status(401).build();
        }

        // Always use the email from the verified login token.
        // Never accept a patient email from the request.
        String patientEmail = authentication.getName();

        Map<String, HistoryRecord> records =
            new LinkedHashMap<>();

        // Load all queue visits belonging to this patient.
        List<QueueTicket> tickets =
            ticketRepository
                .findByPatientEmailIgnoreCaseOrderByJoinedAtDesc(
                    patientEmail
                );

        for (QueueTicket ticket : tickets) {
            String key = createKey(
                ticket.getQueueSessionId(),
                ticket.getToken()
            );

            records.put(
                key,
                new HistoryRecord(
                    "ticket-" + ticket.getId(),
                    ticket.getToken(),
                    "",
                    "",
                    ticket.getJoinedAt(),
                    convertStatus(ticket.getStatus())
                )
            );
        }

        // Load completed consultations from PostgreSQL.
        // ConsultationService converts lazy medicines to DTOs
        // inside its read-only transaction.
        List<ConsultationResponse> consultations =
            consultationService.getPatientConsultations(
                patientEmail
            );

        for (ConsultationResponse consultation : consultations) {
            String key = createKey(
                consultation.queueSessionId(),
                consultation.token()
            );

            Instant visitDate = consultation.completedAt() != null
                ? consultation.completedAt()
                : consultation.consultationAt();

            records.put(
                key,
                new HistoryRecord(
                    "consultation-" + consultation.id(),
                    consultation.token(),
                    consultation.department(),
                    consultation.doctor(),
                    visitDate,
                    "Consulted"
                )
            );
        }

        List<HistoryRecord> result =
            new ArrayList<>(records.values());

        result.sort(
            Comparator.comparing(
                HistoryRecord::createdAt,
                Comparator.nullsLast(Comparator.reverseOrder())
            )
        );

        return ResponseEntity.ok(result);
    }

    private String createKey(String sessionId, Integer token) {
        return String.valueOf(sessionId) + "|" + token;
    }

    private String convertStatus(String status) {
        if (status == null) {
            return "Waiting";
        }

        return switch (status.toUpperCase()) {
            case "CALLED", "IN_PROGRESS" -> "In Progress";
            case "LEFT_QUEUE" -> "Left Queue";
            case "WAITING" -> "Waiting";
            default -> "Waiting";
        };
    }

    public record HistoryRecord(
        String id,
        Integer token,
        String department,
        String doctor,
        Instant createdAt,
        String status
    ) {
    }
}
