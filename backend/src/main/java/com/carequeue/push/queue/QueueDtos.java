package com.carequeue.push.queue;

import java.util.List;
import java.util.Map;

public class QueueDtos {

    public record QueueStateRequest(
        String department,
        String doctor,
        Integer estimatedTime,
        Integer nowServing,
        Integer waitingPatients,
        Integer nextTokenNumber,
        List<Integer> waitingTokens,
        Map<String, Object> waitingMeta,
        Boolean queuePaused,
        Long queuePausedAt,
        Long totalPausedMs,
        String queueSessionId
    ) {}

    // Temporary compatibility with the existing join implementation.
    // We will replace this with an authenticated server-side join.
    public record JoinRequest(
        String email,
        Integer token,
        String queueSessionId,
        String patientName
    ) {}

    // Used when a patient requests to leave their own queue.
    public record LeaveRequest(
        Integer token,
        String queueSessionId
    ) {}
}