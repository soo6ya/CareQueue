
package com.carequeue.push.queue;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface QueueTicketRepository
        extends JpaRepository<QueueTicket, Long> {

    Optional<QueueTicket> findByQueueSessionIdAndToken(
        String queueSessionId,
        Integer token
    );

    // Find a ticket belonging to a specific patient.
    Optional<QueueTicket>
        findByQueueSessionIdAndTokenAndPatientEmailIgnoreCase(
            String queueSessionId,
            Integer token,
            String patientEmail
        );

    // Find a patient's existing waiting ticket in the active session.
    Optional<QueueTicket>
        findFirstByQueueSessionIdAndPatientEmailIgnoreCaseAndStatus(
            String queueSessionId,
            String patientEmail,
            String status
        );

    List<QueueTicket> findByQueueSessionIdAndStatusOrderByTokenAsc(
        String queueSessionId,
        String status
    );

    List<QueueTicket> findByPatientEmailIgnoreCaseOrderByJoinedAtDesc(
        String patientEmail
    );

    List<QueueTicket> findByStatusAndEstimatedConsultationAtIsNotNull(
        String status
    );

    List<QueueTicket> findByStatusInAndEstimatedConsultationAtIsNotNull(
        List<String> statuses
    );

    List<QueueTicket> findByStatusAndCalledNotificationSentFalse(
        String status
    );

    // Analytics: retrieve tickets that joined within a date range.
    List<QueueTicket>
        findByJoinedAtGreaterThanEqualAndJoinedAtLessThanOrderByJoinedAtAsc(
            Instant start,
            Instant end
        );
}
