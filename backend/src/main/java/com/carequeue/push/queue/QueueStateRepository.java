package com.carequeue.push.queue;

import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QueueStateRepository
        extends JpaRepository<QueueState, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT q FROM QueueState q WHERE q.id = :id")
    Optional<QueueState> findByIdForUpdate(
        @Param("id") Long id
    );
}