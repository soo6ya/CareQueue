
package com.carequeue.push;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.security.Security;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.Utils;

import org.apache.http.HttpResponse;
import org.apache.http.util.EntityUtils;
import org.bouncycastle.jce.provider.BouncyCastleProvider;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PushService {

    private final PushSubscriptionRepository repository;
    private final ObjectMapper mapper;

    private final String publicKey;
    private final String privateKey;
    private final String subject;

    public PushService(
        PushSubscriptionRepository repository,
        ObjectMapper mapper,
        @Value("${carequeue.push.public-key}") String publicKey,
        @Value("${carequeue.push.private-key}") String privateKey,
        @Value("${carequeue.push.subject:mailto:admin@carequeue.local}")
        String subject
    ) {

        this.repository = repository;
        this.mapper = mapper;

        this.publicKey = publicKey == null ? "" : publicKey.trim();
        this.privateKey = privateKey == null ? "" : privateKey.trim();
        this.subject = subject == null ? "" : subject.trim();

        if (Security.getProvider(
            BouncyCastleProvider.PROVIDER_NAME
        ) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public String publicKey() {
        return publicKey;
    }

    private String normalizeEmail(String email) {

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                "Patient email is required."
            );
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    /*
     * Accept standard Base64 and Base64URL.
     * Return unpadded Base64URL.
     */
    private String toBase64Url(
        String value,
        String fieldName
    ) {

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                fieldName + " is missing."
            );
        }

        String standard = value.trim()
            .replace('-', '+')
            .replace('_', '/');

        try {
            byte[] decoded = Base64.getDecoder().decode(standard);

            return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(decoded);

        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                fieldName + " is not valid Base64/Base64URL data.",
                ex
            );
        }
    }

    private byte[] decodeBase64(
        String value,
        String fieldName
    ) {

        String normalized = toBase64Url(value, fieldName);

        return Base64.getUrlDecoder().decode(normalized);
    }

    /*
     * Only accept HTTPS endpoints from known browser push providers.
     * Reject arbitrary hosts, IP addresses, custom ports and user info.
     */
    private String validateEndpoint(String endpoint) {

        if (endpoint == null || endpoint.isBlank()) {
            throw new IllegalArgumentException(
                "Subscription endpoint is required."
            );
        }

        String normalized = endpoint.trim();

        if (normalized.length() > 4096) {
            throw new IllegalArgumentException(
                "Subscription endpoint is too long."
            );
        }

        try {
            URI uri = URI.create(normalized);

            String scheme = uri.getScheme();
            String host = uri.getHost();

            if (scheme == null
                || !"https".equalsIgnoreCase(scheme)
                || host == null
                || uri.getUserInfo() != null
                || uri.getFragment() != null
                || (uri.getPort() != -1 && uri.getPort() != 443)) {

                throw new IllegalArgumentException(
                    "Invalid push subscription endpoint."
                );
            }

            String normalizedHost = host.toLowerCase(Locale.ROOT);

            boolean trustedHost =
                normalizedHost.equals("fcm.googleapis.com")
                || normalizedHost.equals("web.push.apple.com")
                || normalizedHost.equals("push.services.mozilla.com")
                || normalizedHost.endsWith(
                    ".push.services.mozilla.com"
                )
                || normalizedHost.equals("notify.windows.com")
                || normalizedHost.endsWith(".notify.windows.com");

            if (!trustedHost) {
                throw new IllegalArgumentException(
                    "Push endpoint provider is not allowed."
                );
            }

            if (uri.getRawPath() == null
                || uri.getRawPath().isBlank()) {

                throw new IllegalArgumentException(
                    "Invalid push subscription endpoint path."
                );
            }

            return normalized;

        } catch (IllegalArgumentException ex) {
            if (ex.getMessage() != null
                && (ex.getMessage().contains("not allowed")
                || ex.getMessage().contains("Invalid"))) {
                throw ex;
            }

            throw new IllegalArgumentException(
                "Invalid push subscription endpoint.",
                ex
            );
        }
    }

    @Transactional
    public void saveSubscription(
        String email,
        String endpoint,
        String p256dh,
        String auth
    ) {

        String normalizedEmail = normalizeEmail(email);
        String normalizedEndpoint = validateEndpoint(endpoint);

        if (p256dh == null || p256dh.isBlank()
            || auth == null || auth.isBlank()) {

            throw new IllegalArgumentException(
                "Subscription encryption keys are missing."
            );
        }

        byte[] publicKeyBytes = decodeBase64(
            p256dh,
            "Subscription p256dh key"
        );

        byte[] authBytes = decodeBase64(
            auth,
            "Subscription auth secret"
        );

        if (publicKeyBytes.length != 65
            || publicKeyBytes[0] != 0x04) {

            throw new IllegalArgumentException(
                "Invalid subscription p256dh key."
            );
        }

        if (authBytes.length != 16) {
            throw new IllegalArgumentException(
                "Invalid subscription auth secret."
            );
        }

        String normalizedP256dh = toBase64Url(
            p256dh,
            "Subscription p256dh key"
        );

        String normalizedAuth = toBase64Url(
            auth,
            "Subscription auth secret"
        );

        repository.findByEndpoint(normalizedEndpoint)
            .ifPresentOrElse(
                existing -> {
                    existing.update(
                        normalizedEmail,
                        normalizedP256dh,
                        normalizedAuth
                    );

                    repository.save(existing);
                },
                () -> repository.save(
                    new PushSubscription(
                        normalizedEmail,
                        normalizedEndpoint,
                        normalizedP256dh,
                        normalizedAuth
                    )
                )
            );
    }

    @Transactional
    public void removeSubscription(
        String email,
        String endpoint
    ) {

        String normalizedEmail = normalizeEmail(email);
        String normalizedEndpoint = validateEndpoint(endpoint);

        repository.deleteByPatientEmailIgnoreCaseAndEndpoint(
            normalizedEmail,
            normalizedEndpoint
        );
    }

    /*
     * acceptedByPushService means the push provider accepted the request.
     * It does not guarantee that the browser displayed the notification.
     */
    public Map<String, Object> sendToPatient(
        String email,
        PushPayload payload
    ) {

        String normalizedEmail = normalizeEmail(email);

        if (payload == null) {
            throw new IllegalArgumentException(
                "Push payload is required."
            );
        }

        if (publicKey.isBlank() || privateKey.isBlank()) {
            throw new IllegalStateException(
                "VAPID keys are not configured."
            );
        }

        List<PushSubscription> subscriptions =
            repository.findByPatientEmailIgnoreCase(normalizedEmail);

        List<Map<String, String>> failures = new ArrayList<>();

        int accepted = 0;
        int removedStale = 0;

        if (subscriptions.isEmpty()) {
            return buildResult(
                normalizedEmail, 0, 0, 0, 0, failures
            );
        }

        nl.martijndwars.webpush.PushService webPush;
        byte[] body;

        try {
            webPush = new nl.martijndwars.webpush.PushService();

            webPush.setPublicKey(
                Utils.loadPublicKey(
                    toBase64Url(publicKey, "VAPID public key")
                )
            );

            webPush.setPrivateKey(
                Utils.loadPrivateKey(
                    toBase64Url(privateKey, "VAPID private key")
                )
            );

            if (!subject.isBlank()) {
                webPush.setSubject(subject);
            }

            body = mapper.writeValueAsBytes(payload);

        } catch (Exception ex) {
            throw new IllegalStateException(
                "Could not initialise Web Push. Check VAPID keys: "
                    + ex.getMessage(),
                ex
            );
        }

        for (PushSubscription subscription : subscriptions) {

            HttpResponse response = null;

            try {
                // Revalidate stored endpoints before making network requests.
                String endpoint = validateEndpoint(
                    subscription.getEndpoint()
                );

                String clientPublicKey = toBase64Url(
                    subscription.getP256dh(),
                    "Subscription p256dh key"
                );

                byte[] authSecret = decodeBase64(
                    subscription.getAuth(),
                    "Subscription auth secret"
                );

                Notification notification = new Notification(
                    endpoint,
                    Utils.loadPublicKey(clientPublicKey),
                    authSecret,
                    body
                );

                response = webPush.send(
                    notification,
                    Encoding.AES128GCM
                );

                int status = response.getStatusLine()
                    .getStatusCode();

                if (status >= 200 && status < 300) {
                    accepted++;

                    System.out.println(
                        "CareQueue push accepted. HTTP " + status
                            + ", subscription ID: "
                            + subscription.getId()
                    );

                    continue;
                }

                String detail = "";

                try {
                    if (response.getEntity() != null) {
                        detail = EntityUtils.toString(
                            response.getEntity()
                        );
                    }
                } catch (Exception ignored) {
                    // Response body is only for diagnostics.
                }

                if (detail.length() > 200) {
                    detail = detail.substring(0, 200);
                }

                String note = "HTTP " + status;

                if (!detail.isBlank()) {
                    note += ": " + detail;
                }

                if (status == 404 || status == 410) {

                    repository.delete(subscription);
                    removedStale++;

                    note += " (Subscription expired and removed. "
                        + "Enable notifications again.)";

                } else if (status == 401 || status == 403) {

                    note += " (Possible VAPID key mismatch. "
                        + "Check the browser and server public keys.)";
                }

                addFailure(failures, subscription, note);

                System.err.println(
                    "CareQueue push rejected. Subscription ID: "
                        + subscription.getId()
                        + ", " + note
                );

            } catch (Exception ex) {

                String message = ex.getMessage() == null
                    ? ex.getClass().getSimpleName()
                    : ex.getMessage();

                addFailure(failures, subscription, message);

                System.err.println(
                    "CareQueue push failed. Subscription ID: "
                        + subscription.getId()
                        + ", " + message
                );

            } finally {

                if (response != null) {
                    EntityUtils.consumeQuietly(
                        response.getEntity()
                    );
                }
            }
        }

        return buildResult(
            normalizedEmail,
            subscriptions.size(),
            accepted,
            failures.size(),
            removedStale,
            failures
        );
    }

    private void addFailure(
        List<Map<String, String>> failures,
        PushSubscription subscription,
        String message
    ) {

        Map<String, String> failure = new LinkedHashMap<>();

        failure.put(
            "subscriptionId",
            String.valueOf(subscription.getId())
        );

        failure.put("error", message);

        failures.add(failure);
    }

    private Map<String, Object> buildResult(
        String email,
        int found,
        int accepted,
        int failed,
        int removedStale,
        List<Map<String, String>> failures
    ) {

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("email", email);
        result.put("subscriptionsFound", found);
        result.put("acceptedByPushService", accepted);
        result.put("failed", failed);
        result.put("removedStale", removedStale);
        result.put("failures", failures);

        return result;
    }
}
