
package com.carequeue.push.queue;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/queue")
@CrossOrigin(origins = "${app.frontend-origin}")
public class QueueController {

    private final QueueService queueService;

    public QueueController(QueueService queueService) {
        this.queueService = queueService;
    }

    // Public: View queue state.
    @GetMapping("/state")
    public ResponseEntity<?> getState() {
        return ResponseEntity.ok(queueService.getState());
    }

    // Admin: Update complete queue state.
    @PutMapping("/state")
    public ResponseEntity<?> updateState(
        @RequestBody QueueDtos.QueueStateRequest request
    ) {
        try {
            return ResponseEntity.ok(
                queueService.updateState(request)
            );
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                Map.of("message", ex.getMessage())
            );
        }
    }

    // Patient: Join queue using authenticated identity.
    @PostMapping("/join")
    public ResponseEntity<?> joinQueue(
        Authentication authentication
    ) {
        try {
            return ResponseEntity.ok(
                queueService.registerPatient(
                    authentication.getName()
                )
            );
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                Map.of("message", ex.getMessage())
            );
        }
    }

    // Patient: Leave only their own queue ticket.
    @DeleteMapping("/leave")
    public ResponseEntity<?> leaveQueue(
        @RequestBody QueueDtos.LeaveRequest request,
        Authentication authentication
    ) {
        try {
            return ResponseEntity.ok(
                queueService.leaveQueue(
                    authentication.getName(),
                    request.token(),
                    request.queueSessionId()
                )
            );
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                Map.of("message", ex.getMessage())
            );
        }
    }
}
