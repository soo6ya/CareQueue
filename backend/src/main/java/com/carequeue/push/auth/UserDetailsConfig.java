
package com.carequeue.push.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@Configuration
public class UserDetailsConfig {

    private final UserAccountRepository userRepository;

    public UserDetailsConfig(UserAccountRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Bean
    public UserDetailsService userDetailsService() {

        return email -> userRepository
            .findByEmailIgnoreCase(email)
            .map(account ->
                User.withUsername(account.getEmail())
                    .password(account.getPasswordHash())
                    .roles(account.getRole())
                    .build()
            )
            .orElseThrow(() ->
                new UsernameNotFoundException(
                    "User account not found."
                )
            );
    }
}
