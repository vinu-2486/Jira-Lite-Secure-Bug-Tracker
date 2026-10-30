package com.jiralite.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    // Default = bcrypt, stored as "{bcrypt}$2a$10$..." (salted, adaptive)
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF for cookie sessions + Angular (cookie XSRF-TOKEN, header X-XSRF-TOKEN)
            .csrf(csrf -> csrf.spa())
            .addFilterAfter(new CsrfCookieFilter(),
                org.springframework.security.web.authentication.www.BasicAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/signup").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/google").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/integrations/github/webhook").permitAll()
                .requestMatchers("/actuator/health").hasRole("APP_ADMIN")
                .requestMatchers("/api/admin/**").hasRole("APP_ADMIN")
                .anyRequest().authenticated())           // deny by default
            .exceptionHandling(e -> e
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))) // 401, not a redirect
            .formLogin(f -> f.disable())
            .httpBasic(b -> b.disable())
            .logout(l -> l
                .logoutUrl("/api/auth/logout")           // POST + CSRF token required
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((req, res, auth) -> res.setStatus(HttpStatus.NO_CONTENT.value())));
        return http.build();
    }

}