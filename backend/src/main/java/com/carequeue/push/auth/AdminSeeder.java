
package com.carequeue.push.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminSeeder implements ApplicationRunner {

    private final UserAccountRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String name;

    public AdminSeeder(
        UserAccountRepository repository,
        PasswordEncoder passwordEncoder,
        @Value("${carequeue.security.admin.email:}") String email,
        @Value("${carequeue.security.admin.password:}") String password,
        @Value("${carequeue.security.admin.name:CareQueue Administrator}") String name
    ) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.email = email == null ? "" : email.trim().toLowerCase();
        this.password = password == null ? "" : password;
        this.name = name == null || name.isBlank()
            ? "CareQueue Administrator"
            : name.trim();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {

        if (email.isBlank() || password.isBlank()) {
            System.out.println(
                "CareQueue: Admin seeding skipped. Configure ADMIN_EMAIL and ADMIN_PASSWORD."
            );
            return;
        }

        if (password.length() < 12 || password.length() > 72) {
            throw new IllegalStateException(
                "Seed admin password must contain between 12 and 72 characters."
            );
        }

        if (repository.existsByEmailIgnoreCase(email)) {
            System.out.println(
                "CareQueue: Configured admin account already exists."
            );
            return;
        }

        UserAccount admin = new UserAccount(
            email,
            passwordEncoder.encode(password),
            "ADMIN",
            name,
            "",
            ""
        );

        repository.save(admin);

        System.out.println(
            "CareQueue: Initial administrator account created."
        );
    }
}
