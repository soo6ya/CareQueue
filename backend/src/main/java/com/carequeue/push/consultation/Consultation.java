
package com.carequeue.push.consultation;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "consultations",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_consultation_session_token",
            columnNames = {"queue_session_id", "token"}
        )
    },
    indexes = {
        @Index(
            name = "idx_consultation_patient_email",
            columnList = "patient_email"
        ),
        @Index(
            name = "idx_consultation_session_token",
            columnList = "queue_session_id, token"
        )
    }
)
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer token;

    @Column(name = "queue_session_id", nullable = false, length = 150)
    private String queueSessionId;

    @Column(name = "patient_record_id", length = 150)
    private String patientRecordId;

    @Column(name = "patient_email", nullable = false, length = 320)
    private String patientEmail;

    @Column(name = "patient_name", nullable = false, length = 200)
    private String patientName;

    @Embedded
    private PatientDetails patientDetails;

    @Column(length = 150)
    private String department;

    @Column(length = 200)
    private String doctor;

    @Column(nullable = false, length = 2000)
    private String reason;

    @Column(length = 4000)
    private String diagnosis;

    @Column(length = 8000)
    private String notes;

    @ElementCollection
    @CollectionTable(
        name = "consultation_medicines",
        joinColumns = @JoinColumn(name = "consultation_id")
    )
    private List<MedicinePrescription> medicines = new ArrayList<>();

    @Column(name = "consultation_at", nullable = false)
    private Instant consultationAt;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt;

    protected Consultation() {
    }

    public Consultation(
        Integer token,
        String queueSessionId,
        String patientRecordId,
        String patientEmail,
        String patientName,
        PatientDetails patientDetails,
        String department,
        String doctor,
        String reason,
        String diagnosis,
        String notes,
        List<MedicinePrescription> medicines,
        Instant consultationAt,
        Instant completedAt
    ) {
        this.token = token;
        this.queueSessionId = queueSessionId;
        this.patientRecordId = patientRecordId;
        this.patientEmail = patientEmail;
        this.patientName = patientName;
        this.patientDetails = patientDetails;
        this.department = department;
        this.doctor = doctor;
        this.reason = reason;
        this.diagnosis = diagnosis;
        this.notes = notes;
        this.medicines = medicines == null
            ? new ArrayList<>()
            : new ArrayList<>(medicines);
        this.consultationAt = consultationAt;
        this.completedAt = completedAt;
    }

    public Long getId() {
        return id;
    }

    public Integer getToken() {
        return token;
    }

    public String getQueueSessionId() {
        return queueSessionId;
    }

    public String getPatientRecordId() {
        return patientRecordId;
    }

    public String getPatientEmail() {
        return patientEmail;
    }

    public String getPatientName() {
        return patientName;
    }

    public PatientDetails getPatientDetails() {
        return patientDetails;
    }

    public String getDepartment() {
        return department;
    }

    public String getDoctor() {
        return doctor;
    }

    public String getReason() {
        return reason;
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public String getNotes() {
        return notes;
    }

    public List<MedicinePrescription> getMedicines() {
        return medicines;
    }

    public Instant getConsultationAt() {
        return consultationAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    @Embeddable
    public static class PatientDetails {

        @Column(name = "patient_contact_name", length = 200)
        private String name;

        @Column(name = "patient_phone", length = 40)
        private String phone;

        @Column(name = "patient_contact_email", length = 320)
        private String email;

        @Column(name = "patient_address", length = 1000)
        private String address;

        protected PatientDetails() {
        }

        public PatientDetails(
            String name,
            String phone,
            String email,
            String address
        ) {
            this.name = name;
            this.phone = phone;
            this.email = email;
            this.address = address;
        }

        public String getName() {
            return name;
        }

        public String getPhone() {
            return phone;
        }

        public String getEmail() {
            return email;
        }

        public String getAddress() {
            return address;
        }
    }

    @Embeddable
    public static class MedicinePrescription {

        @Column(name = "medicine_name", nullable = false, length = 200)
        private String name;

        @Column(name = "medicine_dosage", length = 200)
        private String dosage;

        @Column(name = "medicine_frequency", length = 200)
        private String frequency;

        @Column(name = "medicine_duration", length = 200)
        private String duration;

        @Column(name = "medicine_instructions", length = 1000)
        private String instructions;

        protected MedicinePrescription() {
        }

        public MedicinePrescription(
            String name,
            String dosage,
            String frequency,
            String duration,
            String instructions
        ) {
            this.name = name;
            this.dosage = dosage;
            this.frequency = frequency;
            this.duration = duration;
            this.instructions = instructions;
        }

        public String getName() {
            return name;
        }

        public String getDosage() {
            return dosage;
        }

        public String getFrequency() {
            return frequency;
        }

        public String getDuration() {
            return duration;
        }

        public String getInstructions() {
            return instructions;
        }
    }
}
