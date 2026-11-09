
package com.carequeue.push.queue;

import com.carequeue.push.auth.UserAccount;
import com.carequeue.push.auth.UserAccountRepository;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/queue")
@CrossOrigin(origins = "${app.frontend-origin}")
public class AdminPatientController {

    private final QueueStateRepository stateRepository;
    private final QueueTicketRepository ticketRepository;
    private final UserAccountRepository userRepository;

    public AdminPatientController(
        QueueStateRepository stateRepository,
        QueueTicketRepository ticketRepository,
        UserAccountRepository userRepository
    ) {
        this.stateRepository = stateRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/current-patient")
    public ResponseEntity<?> getCurrentPatient() {

        QueueState state = stateRepository.findById(1L)
            .orElse(null);

        // DEBUG LOGS
        System.out.println("===== CURRENT PATIENT DEBUG =====");
        System.out.println("State found: " + (state != null));

        if (state != null) {
            System.out.println(
                "Now Serving: " + state.getNowServing()
            );

            System.out.println(
                "Queue Session: " + state.getQueueSessionId()
            );
        }

        System.out.println("=================================");

        if (state == null
            || state.getNowServing() == null
            || state.getNowServing() <= 0
            || state.getQueueSessionId() == null) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                    "message", "No active patient is being served."
                ));
        }

        Integer token = state.getNowServing();
        String sessionId = state.getQueueSessionId();

        QueueTicket ticket = ticketRepository
            .findByQueueSessionIdAndToken(sessionId, token)
            .orElse(null);

        if (ticket == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                    "message",
                    "No registered patient is linked to this token."
                ));
        }

        UserAccount patient = userRepository
            .findByEmailIgnoreCase(ticket.getPatientEmail())
            .orElse(null);

        if (patient == null
            || !"PATIENT".equals(patient.getRole())) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                    "message",
                    "The patient account could not be found."
                ));
        }

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("token", token);
        response.put("queueSessionId", sessionId);
        response.put("ticketStatus", ticket.getStatus());
        response.put("patientRecordId", patient.getId());
        response.put("name", patient.getName());
        response.put("age", patient.getAge());
        response.put("email", patient.getEmail());
        response.put("phone", patient.getPhone());
        response.put("address", patient.getAddress());

        return ResponseEntity.ok(response);
    }
}
