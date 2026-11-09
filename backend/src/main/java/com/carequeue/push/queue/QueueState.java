package com.carequeue.push.queue;

import jakarta.persistence.*;

@Entity
@Table(name = "queue_state")
public class QueueState {

    @Id
    private Long id = 1L;

    @Column(length = 150)
    private String department;

    @Column(length = 200)
    private String doctor;

    private Integer estimatedTime;
    private Integer nowServing;
    private Integer nextTokenNumber;

    @Column(columnDefinition = "TEXT")
    private String waitingTokensJson = "[]";

    @Column(columnDefinition = "TEXT")
    private String waitingMetaJson = "{}";

    private Boolean queuePaused = false;
    private Long queuePausedAt;
    private Long totalPausedMs = 0L;

    @Column(length = 150)
    private String queueSessionId;

    protected QueueState() {
    }

    public static QueueState createDefault() {
        QueueState state = new QueueState();
        state.id = 1L;
        state.department = "General Medicine";
        state.doctor = "Dr. Rahul Sharma";
        state.estimatedTime = 5;
        state.nowServing = 1;
        state.nextTokenNumber = 2;
        state.waitingTokensJson = "[]";
        state.waitingMetaJson = "{}";
        state.queuePaused = false;
        state.totalPausedMs = 0L;
        state.queueSessionId = "carequeue-initial-session";
        return state;
    }

    public Long getId() { return id; }
    public String getDepartment() { return department; }
    public String getDoctor() { return doctor; }
    public Integer getEstimatedTime() { return estimatedTime; }
    public Integer getNowServing() { return nowServing; }
    public Integer getNextTokenNumber() { return nextTokenNumber; }
    public String getWaitingTokensJson() { return waitingTokensJson; }
    public String getWaitingMetaJson() { return waitingMetaJson; }
    public Boolean getQueuePaused() { return queuePaused; }
    public Long getQueuePausedAt() { return queuePausedAt; }
    public Long getTotalPausedMs() { return totalPausedMs; }
    public String getQueueSessionId() { return queueSessionId; }

    public void setDepartment(String value) { department = value; }
    public void setDoctor(String value) { doctor = value; }
    public void setEstimatedTime(Integer value) { estimatedTime = value; }
    public void setNowServing(Integer value) { nowServing = value; }
    public void setNextTokenNumber(Integer value) { nextTokenNumber = value; }
    public void setWaitingTokensJson(String value) { waitingTokensJson = value; }
    public void setWaitingMetaJson(String value) { waitingMetaJson = value; }
    public void setQueuePaused(Boolean value) { queuePaused = value; }
    public void setQueuePausedAt(Long value) { queuePausedAt = value; }
    public void setTotalPausedMs(Long value) { totalPausedMs = value; }
    public void setQueueSessionId(String value) { queueSessionId = value; }
}