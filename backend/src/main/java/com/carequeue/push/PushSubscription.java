
package com.carequeue.push;

import jakarta.persistence.*;
import java.util.Locale;

@Entity
@Table(
        name = "push_subscriptions",
        indexes = {
                @Index(
                        name = "idx_push_email",
                        columnList = "patient_email"
                )
        }
)
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "patient_email",
            nullable = false,
            length = 320
    )
    private String patientEmail;

    @Column(
            nullable = false,
            length = 2048,
            unique = true
    )
    private String endpoint;

    @Column(
            nullable = false,
            length = 512
    )
    private String p256dh;

    @Column(
            nullable = false,
            length = 512
    )
    private String auth;

    protected PushSubscription() {
    }

    public PushSubscription(
            String email,
            String endpoint,
            String p256dh,
            String auth) {

        this.patientEmail = normalizeEmail(email);
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
    }

    public Long getId() {
        return id;
    }

    public String getPatientEmail() {
        return patientEmail;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public String getP256dh() {
        return p256dh;
    }

    public String getAuth() {
        return auth;
    }

    public void update(
            String email,
            String key,
            String authKey) {

        this.patientEmail = normalizeEmail(email);
        this.p256dh = key;
        this.auth = authKey;
    }

    private static String normalizeEmail(String email) {

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Patient email is required."
            );
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }
}
