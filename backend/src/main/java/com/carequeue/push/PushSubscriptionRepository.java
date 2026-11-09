
package com.carequeue.push;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface PushSubscriptionRepository
        extends JpaRepository<PushSubscription, Long> {

    Optional<PushSubscription> findByEndpoint(String endpoint);

    List<PushSubscription> findByPatientEmailIgnoreCase(
            String patientEmail
    );

    @Transactional
    void deleteByPatientEmailIgnoreCaseAndEndpoint(
            String patientEmail,
            String endpoint
    );
}
