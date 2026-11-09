
package com.carequeue.push.consultation;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsultationRepository
        extends JpaRepository<Consultation, Long> {

    List<Consultation> findAllByPatientEmailIgnoreCaseOrderByCompletedAtDesc(
        String patientEmail
    );

    List<Consultation> findAllByOrderByCompletedAtDesc();

    Optional<Consultation> findByQueueSessionIdAndToken(
        String queueSessionId,
        Integer token
    );

    boolean existsByQueueSessionIdAndToken(
        String queueSessionId,
        Integer token
    );

    // Analytics: retrieve consultations completed within a date range.
    List<Consultation>
        findByCompletedAtGreaterThanEqualAndCompletedAtLessThanOrderByCompletedAtAsc(
            Instant start,
            Instant end
        );
}
