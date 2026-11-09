
package com.carequeue.push.queue;

import com.carequeue.push.PushPayload;
import com.carequeue.push.PushService;
import com.carequeue.push.auth.UserAccountRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QueueService {

    private final QueueStateRepository stateRepository;
    private final QueueTicketRepository ticketRepository;
    private final PushService pushService;
    private final ObjectMapper mapper;
    private final UserAccountRepository userAccountRepository;

    public QueueService(
        QueueStateRepository stateRepository,
        QueueTicketRepository ticketRepository,
        PushService pushService,
        ObjectMapper mapper,
        UserAccountRepository userAccountRepository
    ) {
        this.stateRepository = stateRepository;
        this.ticketRepository = ticketRepository;
        this.pushService = pushService;
        this.mapper = mapper;
        this.userAccountRepository = userAccountRepository;
    }

    private QueueState getOrCreateStateForUpdate() {
        return stateRepository.findByIdForUpdate(1L)
            .orElseGet(() ->
                stateRepository.save(QueueState.createDefault())
            );
    }

    private List<Integer> readWaitingTokens(QueueState state) {
        try {
            return mapper.readValue(
                state.getWaitingTokensJson(),
                new TypeReference<List<Integer>>() {}
            );
        } catch (Exception ex) {
            throw new IllegalStateException(
                "Could not read waiting tokens.", ex
            );
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getState() {

        QueueState state = stateRepository.findById(1L)
            .orElseGet(QueueState::createDefault);

        try {
            List<Integer> tokens = readWaitingTokens(state);

            Map<String, Object> meta = mapper.readValue(
                state.getWaitingMetaJson(),
                new TypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> response = new LinkedHashMap<>();

            response.put("department", state.getDepartment());
            response.put("doctor", state.getDoctor());
            response.put("estimatedTime", state.getEstimatedTime());
            response.put("nowServing", state.getNowServing());
            response.put("waitingPatients", tokens.size());
            response.put("nextTokenNumber", state.getNextTokenNumber());
            response.put("waitingTokens", tokens);
            response.put("waitingMeta", meta);

            response.put(
                "queuePaused",
                Boolean.TRUE.equals(state.getQueuePaused())
            );

            response.put(
                "queuePausedAt",
                state.getQueuePausedAt() == null
                    ? 0L : state.getQueuePausedAt()
            );

            response.put("totalPausedMs", state.getTotalPausedMs());
            response.put("queueSessionId", state.getQueueSessionId());

            return response;

        } catch (Exception ex) {
            throw new IllegalStateException(
                "Could not read saved queue data.", ex
            );
        }
    }

    // ADMIN: Get the patient currently being served.
    @Transactional(readOnly = true)
    public Map<String, Object> getCurrentPatient() {

        QueueState state = stateRepository.findById(1L)
            .orElseThrow(() -> new IllegalArgumentException(
                "Queue state not found."
            ));

        int nowServing = state.getNowServing() == null
            ? 0 : state.getNowServing();

        String sessionId = state.getQueueSessionId();

        if (nowServing <= 0) {
            throw new IllegalArgumentException(
                "No patient is currently being served."
            );
        }

        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException(
                "Active queue session not found."
            );
        }

        QueueTicket ticket = ticketRepository
            .findByQueueSessionIdAndToken(sessionId, nowServing)
            .orElseThrow(() -> new IllegalArgumentException(
                "No registered patient found for the currently serving token."
            ));

        String patientName = ticket.getPatientName();

        if (patientName == null || patientName.isBlank()) {
            patientName = userAccountRepository
                .findByEmailIgnoreCase(ticket.getPatientEmail())
                .map(account -> account.getName())
                .orElse("Registered Patient");
        }

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("patientRecordId", ticket.getId());
        response.put("token", ticket.getToken());
        response.put("queueSessionId", ticket.getQueueSessionId());
        response.put("ticketStatus", ticket.getStatus());
        response.put("name", patientName);
        response.put("email", ticket.getPatientEmail());

        // These details are not currently stored in QueueTicket.
        response.put("age", null);
        response.put("phone", null);
        response.put("address", null);

        return response;
    }

    @Transactional
    public Map<String, Object> updateState(
        QueueDtos.QueueStateRequest request
    ) {

        if (request == null) {
            throw new IllegalArgumentException(
                "Queue data is required."
            );
        }

        if (request.department() == null
            || request.department().isBlank()
            || request.doctor() == null
            || request.doctor().isBlank()) {

            throw new IllegalArgumentException(
                "Department and doctor are required."
            );
        }

        if (request.estimatedTime() == null
            || request.estimatedTime() <= 0) {

            throw new IllegalArgumentException(
                "Estimated treatment time must be greater than zero."
            );
        }

        if (request.nowServing() == null
            || request.nowServing() < 0) {

            throw new IllegalArgumentException(
                "Invalid now-serving token."
            );
        }

        QueueState state = getOrCreateStateForUpdate();

        int previousServing = state.getNowServing() == null
            ? 0 : state.getNowServing();

        Integer previousEstimatedTime = state.getEstimatedTime();
        String previousSession = state.getQueueSessionId();

        boolean wasPaused = Boolean.TRUE.equals(state.getQueuePaused());

        List<Integer> previousTokens = readWaitingTokens(state);

        String newSession = request.queueSessionId() == null
            || request.queueSessionId().isBlank()
            ? previousSession : request.queueSessionId();

        boolean isPaused = Boolean.TRUE.equals(request.queuePaused());

        List<Integer> tokens = request.waitingTokens() == null
            ? new ArrayList<>()
            : request.waitingTokens().stream()
                .filter(token ->
                    token != null && token > request.nowServing()
                )
                .distinct()
                .sorted()
                .toList();

        boolean sessionChanged =
            !Objects.equals(newSession, previousSession);

        boolean tokenOrderChanged =
            !previousTokens.equals(tokens);

        boolean servingChanged =
            previousServing != request.nowServing();

        boolean treatmentTimeChanged =
            !Objects.equals(
                previousEstimatedTime,
                request.estimatedTime()
            );

        boolean resumedQueue = wasPaused && !isPaused;

        try {
            state.setDepartment(request.department().trim());
            state.setDoctor(request.doctor().trim());
            state.setEstimatedTime(request.estimatedTime());
            state.setNowServing(request.nowServing());

            state.setNextTokenNumber(
                Math.max(
                    request.nextTokenNumber() == null
                        ? request.nowServing() + 1
                        : request.nextTokenNumber(),
                    tokens.isEmpty()
                        ? request.nowServing() + 1
                        : tokens.get(tokens.size() - 1) + 1
                )
            );

            state.setWaitingTokensJson(
                mapper.writeValueAsString(tokens)
            );

            state.setWaitingMetaJson(
                mapper.writeValueAsString(
                    request.waitingMeta() == null
                        ? Map.of() : request.waitingMeta()
                )
            );

            state.setQueuePaused(isPaused);
            state.setQueuePausedAt(request.queuePausedAt());

            state.setTotalPausedMs(
                request.totalPausedMs() == null
                    ? 0L : Math.max(0L, request.totalPausedMs())
            );

            state.setQueueSessionId(newSession);

            stateRepository.save(state);

        } catch (Exception ex) {
            throw new IllegalStateException(
                "Could not save queue data.", ex
            );
        }

        if (sessionChanged && previousSession != null) {
            ticketRepository
                .findByQueueSessionIdAndStatusOrderByTokenAsc(
                    previousSession, "WAITING"
                )
                .forEach(ticket ->
                    ticket.setStatus("LEFT_QUEUE")
                );
        }

        for (QueueTicket ticket :
            ticketRepository.findByQueueSessionIdAndStatusOrderByTokenAsc(
                newSession, "WAITING"
            )) {

            if (!tokens.contains(ticket.getToken())) {
                ticket.setStatus("LEFT_QUEUE");
            }
        }

        if (servingChanged && request.nowServing() > 0) {
            ticketRepository.findByQueueSessionIdAndToken(
                newSession, request.nowServing()
            ).ifPresent(ticket -> {

                ticket.setStatus("CALLED");

                if (!ticket.isCalledNotificationSent()) {
                    sendCalledNotification(ticket);
                }
            });
        }

        if (!sessionChanged && !wasPaused && isPaused) {
            sendQueueStatusNotification(
                newSession,
                tokens,
                "Queue temporarily paused",
                "The hospital queue has been temporarily paused. "
                    + "Please wait for further updates.",
                "paused"
            );
        }

        if (!sessionChanged && wasPaused && !isPaused) {
            sendQueueStatusNotification(
                newSession,
                tokens,
                "Queue has resumed",
                "The doctor has resumed consultations. "
                    + "Please keep an eye on your estimated consultation time.",
                "resumed"
            );
        }

        boolean shouldRecalculate =
            !isPaused
            && (
                sessionChanged
                || tokenOrderChanged
                || servingChanged
                || treatmentTimeChanged
                || resumedQueue
            );

        if (shouldRecalculate) {
            recalculateEstimates(
                newSession,
                tokens,
                request.estimatedTime()
            );
        }

        return getState();
    }

    @Transactional
    public Map<String, Object> registerPatient(
        String authenticatedEmail
    ) {

        if (authenticatedEmail == null
            || authenticatedEmail.isBlank()) {

            throw new IllegalArgumentException(
                "Authenticated patient email is required."
            );
        }

        String email = authenticatedEmail.trim().toLowerCase();

        QueueState state = getOrCreateStateForUpdate();

        String sessionId = state.getQueueSessionId();

        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalStateException(
                "Queue session is not available."
            );
        }

        List<Integer> tokens = readWaitingTokens(state);

        var existingTicket =
            ticketRepository
                .findFirstByQueueSessionIdAndPatientEmailIgnoreCaseAndStatus(
                    sessionId,
                    email,
                    "WAITING"
                );

        if (existingTicket.isPresent()) {

            QueueTicket ticket = existingTicket.get();

            int position = tokens.indexOf(ticket.getToken());

            Map<String, Object> result = new LinkedHashMap<>();

            result.put("registered", true);
            result.put("existing", true);
            result.put("token", ticket.getToken());
            result.put("queueSessionId", sessionId);
            result.put(
                "initialAhead",
                position >= 0 ? position + 1 : 0
            );

            return result;
        }

        if (Boolean.TRUE.equals(state.getQueuePaused())) {
            throw new IllegalArgumentException(
                "The queue is currently paused. Please try again later."
            );
        }

        int nowServing = state.getNowServing() == null
            ? 0 : state.getNowServing();

        int highestToken = tokens.isEmpty()
            ? nowServing
            : tokens.get(tokens.size() - 1);

        int token = Math.max(
            state.getNextTokenNumber() == null
                ? nowServing + 1
                : state.getNextTokenNumber(),
            Math.max(highestToken + 1, nowServing + 1)
        );

        int initialAhead = tokens.size() + 1;

        long joinedAt = System.currentTimeMillis();

        tokens.add(token);
        tokens.sort(Integer::compareTo);

        Map<String, Object> metadata;

        try {
            metadata = mapper.readValue(
                state.getWaitingMetaJson(),
                new TypeReference<Map<String, Object>>() {}
            );
        } catch (Exception ex) {
            metadata = new LinkedHashMap<>();
        }

        metadata.put(
            String.valueOf(token),
            Map.of(
                "joinedAt", joinedAt,
                "initialAhead", initialAhead,
                "estimatedWaitMinutes",
                    initialAhead * state.getEstimatedTime(),
                "pausedMsAtJoin", state.getTotalPausedMs()
            )
        );

        try {
            state.setWaitingTokensJson(
                mapper.writeValueAsString(tokens)
            );

            state.setWaitingMetaJson(
                mapper.writeValueAsString(metadata)
            );

            state.setNextTokenNumber(token + 1);

            stateRepository.save(state);

        } catch (Exception ex) {
            throw new IllegalStateException(
                "Could not register patient in queue.",
                ex
            );
        }

        String patientName = userAccountRepository
            .findByEmailIgnoreCase(email)
            .map(account -> account.getName())
            .orElse("Registered Patient");

        QueueTicket ticket = new QueueTicket(
            sessionId,
            token,
            email,
            patientName
        );

        ticketRepository.save(ticket);

        recalculateEstimates(
            sessionId,
            tokens,
            state.getEstimatedTime()
        );

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("registered", true);
        result.put("existing", false);
        result.put("token", token);
        result.put("queueSessionId", sessionId);
        result.put("initialAhead", initialAhead);

        return result;
    }

    @Transactional
    public Map<String, Object> leaveQueue(
        String authenticatedEmail,
        Integer token,
        String requestedSessionId
    ) {

        if (authenticatedEmail == null
            || authenticatedEmail.isBlank()) {

            throw new IllegalArgumentException(
                "Authenticated patient email is required."
            );
        }

        if (token == null || token <= 0) {
            throw new IllegalArgumentException(
                "Invalid patient token."
            );
        }

        QueueState state = getOrCreateStateForUpdate();

        String activeSession = state.getQueueSessionId();

        if (requestedSessionId == null
            || !requestedSessionId.equals(activeSession)) {

            throw new IllegalArgumentException(
                "This queue session is no longer active."
            );
        }

        String email = authenticatedEmail.trim().toLowerCase();

        QueueTicket ticket = ticketRepository
            .findByQueueSessionIdAndTokenAndPatientEmailIgnoreCase(
                activeSession,
                token,
                email
            )
            .orElseThrow(() -> new IllegalArgumentException(
                "You do not own this queue ticket."
            ));

        if (!"WAITING".equals(ticket.getStatus())) {
            throw new IllegalArgumentException(
                "Only waiting patients can leave the queue."
            );
        }

        List<Integer> tokens = readWaitingTokens(state);

        if (!tokens.contains(token)) {
            throw new IllegalArgumentException(
                "Your token is no longer in the waiting queue."
            );
        }

        tokens.remove(Integer.valueOf(token));

        Map<String, Object> metadata;

        try {
            metadata = mapper.readValue(
                state.getWaitingMetaJson(),
                new TypeReference<Map<String, Object>>() {}
            );
        } catch (Exception ex) {
            metadata = new LinkedHashMap<>();
        }

        metadata.remove(String.valueOf(token));

        try {
            state.setWaitingTokensJson(
                mapper.writeValueAsString(tokens)
            );

            state.setWaitingMetaJson(
                mapper.writeValueAsString(metadata)
            );

            stateRepository.save(state);

        } catch (Exception ex) {
            throw new IllegalStateException(
                "Could not update the waiting queue.",
                ex
            );
        }

        ticket.setStatus("LEFT_QUEUE");

        recalculateEstimates(
            activeSession,
            tokens,
            state.getEstimatedTime()
        );

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("left", true);
        result.put("token", token);

        return result;
    }

    @Deprecated
    @Transactional
    public void registerPatient(QueueDtos.JoinRequest request) {
        throw new IllegalArgumentException(
            "Please use the authenticated queue registration endpoint."
        );
    }

    private void sendQueueStatusNotification(
        String sessionId,
        List<Integer> waitingTokens,
        String title,
        String body,
        String event
    ) {

        if (sessionId == null || sessionId.isBlank()) {
            return;
        }

        for (Integer token : waitingTokens) {

            ticketRepository.findByQueueSessionIdAndToken(
                sessionId, token
            ).ifPresent(ticket -> {

                if (!"WAITING".equals(ticket.getStatus())) {
                    return;
                }

                try {
                    Map<String, Object> result =
                        pushService.sendToPatient(
                            ticket.getPatientEmail(),
                            new PushPayload(
                                title,
                                body,
                                "/patient-dashboard",
                                "carequeue-queue-" +
                                    event + "-" +
                                    sessionId + "-" + token
                            )
                        );

                    int accepted = numberValue(
                        result.get("acceptedByPushService")
                    );

                    if (accepted > 0) {
                        System.out.println(
                            "Queue " + event +
                            " notification accepted for token A-" +
                            String.format("%03d", token)
                        );
                    } else {
                        System.err.println(
                            "Queue " + event +
                            " notification was not accepted for token A-" +
                            String.format("%03d", token)
                        );
                    }

                } catch (Exception ex) {
                    System.err.println(
                        "Could not send queue " + event +
                        " notification for token A-" +
                        String.format("%03d", token) +
                        ": " + ex.getMessage()
                    );
                }
            });
        }
    }

    private void recalculateEstimates(
        String sessionId,
        List<Integer> tokens,
        Integer estimatedMinutes
    ) {

        if (sessionId == null
            || estimatedMinutes == null
            || estimatedMinutes <= 0) {
            return;
        }

        Instant now = Instant.now();

        for (int index = 0; index < tokens.size(); index++) {

            Integer token = tokens.get(index);
            final int position = index + 1;

            ticketRepository.findByQueueSessionIdAndToken(
                sessionId, token
            ).ifPresent(ticket -> {

                if (!"WAITING".equals(ticket.getStatus())) {
                    return;
                }

                Instant estimate = now.plus(
                    (long) position * estimatedMinutes,
                    ChronoUnit.MINUTES
                );

                ticket.setEstimatedConsultationAt(estimate);
            });
        }
    }

    private void sendCalledNotification(QueueTicket ticket) {

        try {
            Map<String, Object> result = pushService.sendToPatient(
                ticket.getPatientEmail(),
                new PushPayload(
                    "Doctor is ready",
                    "Your token A-" +
                        String.format("%03d", ticket.getToken()) +
                        " has been called. Please proceed to the doctor.",
                    "/patient-dashboard",
                    "carequeue-called-" +
                        ticket.getQueueSessionId() +
                        "-" + ticket.getToken()
                )
            );

            if (numberValue(
                result.get("acceptedByPushService")
            ) > 0) {
                ticket.setCalledNotificationSent(true);
            }

        } catch (Exception ex) {
            System.err.println(
                "Could not send doctor-called notification: "
                    + ex.getMessage()
            );
        }
    }

    private int numberValue(Object value) {
        return value instanceof Number number
            ? number.intValue() : 0;
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void sendDueReminders() {

        QueueState state = stateRepository.findById(1L).orElse(null);

        if (state == null) {
            return;
        }

        String activeSession = state.getQueueSessionId();

        if (activeSession == null || activeSession.isBlank()) {
            return;
        }

        List<QueueTicket> calledTickets =
            ticketRepository
                .findByStatusAndCalledNotificationSentFalse("CALLED");

        for (QueueTicket ticket : calledTickets) {

            if (activeSession.equals(ticket.getQueueSessionId())) {
                sendCalledNotification(ticket);
            }
        }

        if (Boolean.TRUE.equals(state.getQueuePaused())) {
            return;
        }

        Instant now = Instant.now();

        List<QueueTicket> tickets =
            ticketRepository
                .findByStatusInAndEstimatedConsultationAtIsNotNull(
                    List.of("WAITING", "CALLED")
                );

        for (QueueTicket ticket : tickets) {

            if (!activeSession.equals(ticket.getQueueSessionId())) {
                continue;
            }

            Instant estimate =
                ticket.getEstimatedConsultationAt();

            if (estimate == null) {
                continue;
            }

            if (!ticket.isReminderOneSent()
                && estimate.isAfter(now)
                && !estimate.isAfter(
                    now.plus(1, ChronoUnit.MINUTES)
                )) {

                boolean sent = sendReminder(
                    ticket,
                    "Consultation in one minute",
                    "Your consultation is expected in approximately one minute."
                );

                if (sent) {
                    ticket.setReminderOneSent(true);
                }
            }

            if (!ticket.isReminderAtSent()
                && !estimate.isAfter(now)) {

                boolean sent = sendReminder(
                    ticket,
                    "Your consultation time",
                    "Your estimated consultation time has arrived. Please be ready."
                );

                if (sent) {
                    ticket.setReminderAtSent(true);
                }
            }
        }
    }

    private boolean sendReminder(
        QueueTicket ticket,
        String title,
        String body
    ) {

        try {
            Map<String, Object> result =
                pushService.sendToPatient(
                    ticket.getPatientEmail(),
                    new PushPayload(
                        title,
                        body,
                        "/patient-dashboard",
                        "carequeue-reminder-" +
                            ticket.getQueueSessionId() +
                            "-" + ticket.getToken()
                    )
                );

            int accepted = numberValue(
                result.get("acceptedByPushService")
            );

            return accepted > 0;

        } catch (Exception ex) {
            System.err.println(
                "Reminder delivery failed for token "
                    + ticket.getToken() + ": "
                    + ex.getMessage()
            );

            return false;
        }
    }
}
