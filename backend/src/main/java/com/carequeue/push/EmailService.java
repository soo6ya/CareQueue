
package com.carequeue.push;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // Registration email verification OTP
    public void sendOtpEmail(String recipientEmail, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(senderEmail);
        message.setTo(recipientEmail);
        message.setSubject("CareQueue - Email Verification OTP");

        message.setText(
            "Hello,\n\n" +
            "Your CareQueue verification OTP is: " + otp + "\n\n" +
            "This OTP is valid for 5 minutes.\n\n" +
            "Please do not share this OTP with anyone.\n\n" +
            "Regards,\nCareQueue Team"
        );

        mailSender.send(message);
    }

    // Forgot password OTP
    public void sendPasswordResetOtpEmail(String recipientEmail, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(senderEmail);
        message.setTo(recipientEmail);
        message.setSubject("CareQueue - Password Reset OTP");

        message.setText(
            "Hello,\n\n" +
            "Your CareQueue password reset OTP is: " + otp + "\n\n" +
            "This OTP is valid for 5 minutes.\n\n" +
            "If you did not request a password reset, please ignore this email.\n\n" +
            "Please do not share this OTP with anyone.\n\n" +
            "Regards,\nCareQueue Team"
        );

        mailSender.send(message);
    }
}
