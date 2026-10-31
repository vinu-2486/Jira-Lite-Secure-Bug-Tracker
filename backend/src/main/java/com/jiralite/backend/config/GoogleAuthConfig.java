package com.jiralite.backend.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;

@Configuration
public class GoogleAuthConfig {
    @Bean
    @ConditionalOnMissingBean(GoogleIdTokenVerifier.class)
    GoogleIdTokenVerifier googleIdTokenVerifier(
            @Value("${GOOGLE_CLIENT_ID:${JIRALITE_GOOGLE_CLIENT_ID:}}") String clientId) throws Exception {
        GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                GoogleNetHttpTransport.newTrustedTransport(), GsonFactory.getDefaultInstance())
                .setIssuers(List.of("accounts.google.com", "https://accounts.google.com"));
        if (clientId != null && !clientId.isBlank()) {
            builder.setAudience(List.of(clientId.trim()));
        }
        return builder.build();
    }
}
