
package com.carequeue.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${spring.mail.username:}")
    private String senderEmail;

    @Value("${app.email.provider:smtp}")
    private String emailProvider;

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    @Value("${brevo.sender.email:}")
    private String brevoSenderEmail;

    @Value("${brevo.sender.name:CareQueue}")
    private String brevoSenderName;

    public EmailService(
            JavaMailSender mailSender,
            ObjectMapper objectMapper) {

        this.mailSender = mailSender;
        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    // Registration email verification OTP
    public void sendOtpEmail(String recipientEmail, String otp) {

        String subject = "CareQueue - Email Verification OTP";

        String message =
                "Hello,\n\n" +
                "Your CareQueue verification OTP is: " + otp + "\n\n" +
                "This OTP is valid for 5 minutes.\n\n" +
                "Please do not share this OTP with anyone.\n\n" +
                "Regards,\nCareQueue Team";

        sendEmail(recipientEmail, subject, message);
    }

    // Forgot password OTP
    public void sendPasswordResetOtpEmail(
            String recipientEmail, String otp) {

        String subject = "CareQueue - Password Reset OTP";

        String message =
                "Hello,\n\n" +
                "Your CareQueue password reset OTP is: " + otp + "\n\n" +
                "This OTP is valid for 5 minutes.\n\n" +
                "If you did not request a password reset, please ignore this email.\n\n" +
                "Please do not share this OTP with anyone.\n\n" +
                "Regards,\nCareQueue Team";

        sendEmail(recipientEmail, subject, message);
    }

    // Select email provider based on environment
    private void sendEmail(
            String recipientEmail,
            String subject,
            String messageText) {

        if ("brevo".equalsIgnoreCase(emailProvider)) {
            sendUsingBrevo(recipientEmail, subject, messageText);
        } else {
            sendUsingGmail(recipientEmail, subject, messageText);
        }
    }

    // Local development: Gmail SMTP
    private void sendUsingGmail(
            String recipientEmail,
            String subject,
            String messageText) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(senderEmail);
        message.setTo(recipientEmail);
        message.setSubject(subject);
        message.setText(messageText);

        mailSender.send(message);
    }

    // Production deployment: Brevo API
    private void sendUsingBrevo(
            String recipientEmail,
            String subject,
            String messageText) {

        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            throw new IllegalStateException(
                    "Brevo API key is not configured.");
        }

        if (brevoSenderEmail == null || brevoSenderEmail.isBlank()) {
            throw new IllegalStateException(
                    "Brevo sender email is not configured.");
        }

        try {
            Map<String, Object> payload = Map.of(
                    "sender", Map.of(
                            "name", brevoSenderName,
                            "email", brevoSenderEmail
                    ),
                    "to", List.of(
                            Map.of("email", recipientEmail)
                    ),
                    "subject", subject,
                    "textContent", messageText
            );

            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(
                            "https://api.brevo.com/v3/smtp/email"))
                    .timeout(Duration.ofSeconds(30))
                    .header("accept", "application/json")
                    .header("api-key", brevoApiKey)
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 ||
                    response.statusCode() >= 300) {

                throw new IllegalStateException(
                        "Brevo email failed. HTTP status: " +
                        response.statusCode());
            }

        } catch (IOException e) {
            throw new IllegalStateException(
                    "Could not communicate with Brevo.", e);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();

            throw new IllegalStateException(
                    "Brevo email request was interrupted.", e);
        }
    }
}
