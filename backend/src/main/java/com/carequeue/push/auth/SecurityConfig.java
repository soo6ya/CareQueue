
package com.carequeue.push.auth;

import java.util.List;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
        JwtAuthenticationFilter jwtAuthenticationFilter
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        CorsConfigurationSource corsConfigurationSource
    ) throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .cors(cors ->
                cors.configurationSource(corsConfigurationSource)
            )

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .exceptionHandling(exception -> exception

                .authenticationEntryPoint(
                    (request, response, authException) ->
                        response.sendError(
                            HttpServletResponse.SC_UNAUTHORIZED,
                            "Authentication required."
                        )
                )

                .accessDeniedHandler(
                    (request, response, accessDeniedException) ->
                        response.sendError(
                            HttpServletResponse.SC_FORBIDDEN,
                            "Access denied."
                        )
                )
            )

            .authorizeHttpRequests(auth -> auth

                // Public authentication endpoints
                .requestMatchers(
                    "/api/auth/register",
                    "/api/auth/login",
                    "/api/auth/verify-email",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password",
                    "/api/push/public-key",
                    "/api/doctor-profile/public"
                ).permitAll()

                // Authenticated account endpoint
                .requestMatchers(
                    "/api/auth/me"
                ).authenticated()

                // Public queue status
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/queue/state"
                ).permitAll()

                // Admin-only queue management
                .requestMatchers(
                    HttpMethod.PUT,
                    "/api/queue/state"
                ).hasRole("ADMIN")

                // Patient-only queue operations
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/queue/join"
                ).hasRole("PATIENT")

                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/queue/leave"
                ).hasRole("PATIENT")

                // Admin-only endpoints
                // Admin-only endpoints
                .requestMatchers(
                    "/api/queue/current-patient",
                    "/api/admin/doctor-profile",
                    "/api/admin/consultations",
                    "/api/admin/queue-analytics"
                ).hasRole("ADMIN")

                // Patient-only history
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/patient/history"
                ).hasRole("PATIENT")

                // Patient-only appointment recipient email
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/doctor-profile/appointment-email"
                ).hasRole("PATIENT")

                // Patient-only emergency number
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/doctor-profile/emergency-number"
                ).hasRole("PATIENT")

                // Consultation access
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/consultations"
                ).hasRole("PATIENT")

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/consultations"
                ).hasRole("ADMIN")

                // Patient-only push subscription management
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/push/subscribe"
                ).hasRole("PATIENT")

                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/push/unsubscribe"
                ).hasRole("PATIENT")

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
        AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
            new CorsConfiguration();

        configuration.setAllowedOrigins(
            List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://10.236.227.205:5173"
            )
        );

        configuration.setAllowedMethods(
            List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
            )
        );

        configuration.setAllowedHeaders(
            List.of(
                "Authorization",
                "Content-Type",
                "Accept"
            )
        );

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
            new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
            "/**",
            configuration
        );

        return source;
    }
}
