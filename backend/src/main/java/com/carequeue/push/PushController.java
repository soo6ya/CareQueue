
package com.carequeue.push;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/push")
@CrossOrigin(origins = "${app.frontend-origin}")
public class PushController {

    private final PushService pushService;

    public PushController(PushService pushService) {
        this.pushService = pushService;
    }

    @GetMapping("/public-key")
    public ResponseEntity<Map<String, String>> publicKey() {

        String key = pushService.publicKey();

        if (key == null || key.isBlank()) {
            return ResponseEntity.status(
                HttpStatus.SERVICE_UNAVAILABLE
            ).body(Map.of(
                "message",
                "VAPID public key is not configured."
            ));
        }

        return ResponseEntity.ok(
            Map.of("publicKey", key)
        );
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, String>> subscribe(
        Authentication authentication,
        @RequestBody(required = false) Map<String, Object> body
    ) {

        if (authentication == null || body == null) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Invalid subscription request.")
            );
        }

        Object endpointValue = body.get("endpoint");
        Object keysObject = body.get("keys");

        if (!(endpointValue instanceof String endpoint)
            || !(keysObject instanceof Map<?, ?> keys)
            || !(keys.get("p256dh") instanceof String p256dh)
            || !(keys.get("auth") instanceof String auth)) {

            return ResponseEntity.badRequest().body(
                Map.of(
                    "message",
                    "Invalid browser push subscription."
                )
            );
        }

        try {
            // The email comes from the authenticated JWT identity.
            String email = authentication.getName();

            pushService.saveSubscription(
                email,
                endpoint,
                p256dh,
                auth
            );

            return ResponseEntity.ok(
                Map.of("saved", "true")
            );

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                Map.of("message", ex.getMessage())
            );
        }
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<Map<String, String>> unsubscribe(
        Authentication authentication,
        @RequestBody(required = false) Map<String, String> body
    ) {

        if (authentication == null
            || body == null
            || body.get("endpoint") == null) {

            return ResponseEntity.badRequest().body(
                Map.of(
                    "message",
                    "Subscription endpoint is required."
                )
            );
        }

        try {
            String email = authentication.getName();

            pushService.removeSubscription(
                email,
                body.get("endpoint")
            );

            return ResponseEntity.ok(
                Map.of("removed", "true")
            );

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                Map.of("message", ex.getMessage())
            );
        }
    }
}
