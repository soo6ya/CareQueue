package com.carequeue.push.queue;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "queue_tickets",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_queue_ticket_session_token",
            columnNames = {"queue_session_id", "token"}
        )
    },
    indexes = {
        @Index(
            name = "idx_queue_ticket_email",
            columnList = "patient_email"
        ),
        @Index(
            name = "idx_queue_ticket_reminder",
            columnList = "ticket_status, estimated_consultation_at"
        )
    }
)
public class QueueTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "queue_session_id", nullable = false, length = 150)
    private String queueSessionId;

    @Column(nullable = false)
    private Integer token;

    @Column(name = "patient_email", nullable = false, length = 320)
    private String patientEmail;

    @Column(name = "patient_name", length = 200)
    private String patientName;

    @Column(name = "ticket_status", nullable = false, length = 30)
    private String status = "WAITING";

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "estimated_consultation_at")
    private Instant estimatedConsultationAt;

    private boolean reminderOneSent = false;
    private boolean reminderAtSent = false;
    private boolean calledNotificationSent = false;

    protected QueueTicket() {
    }

    public QueueTicket(
        String sessionId,
        Integer token,
        String email,
        String patientName
    ) {
        this.queueSessionId = sessionId;
        this.token = token;
        this.patientEmail = email.trim().toLowerCase();
        this.patientName = patientName;
        this.joinedAt = Instant.now();
        this.status = "WAITING";
    }

    public Long getId() { return id; }
    public String getQueueSessionId() { return queueSessionId; }
    public Integer getToken() { return token; }
    public String getPatientEmail() { return patientEmail; }
    public String getPatientName() { return patientName; }
    public String getStatus() { return status; }
    public Instant getJoinedAt() { return joinedAt; }
    public Instant getEstimatedConsultationAt() { return estimatedConsultationAt; }
    public boolean isReminderOneSent() { return reminderOneSent; }
    public boolean isReminderAtSent() { return reminderAtSent; }
    public boolean isCalledNotificationSent() { return calledNotificationSent; }

    public void setStatus(String value) { status = value; }
    public void setEstimatedConsultationAt(Instant value) {
        estimatedConsultationAt = value;
    }
    public void setReminderOneSent(boolean value) { reminderOneSent = value; }
    public void setReminderAtSent(boolean value) { reminderAtSent = value; }
    public void setCalledNotificationSent(boolean value) {
        calledNotificationSent = value;
    }
}