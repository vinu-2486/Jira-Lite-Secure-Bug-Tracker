package com.jiralite.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityConfigTest {

    private final SecurityConfig securityConfig = new SecurityConfig();

    @Test
    void corsConfigurationParsesOriginsAndEnforcesExplicitSettings() {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource("http://localhost:4200, https://jiralite.app");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/projects");
        CorsConfiguration config = source.getCorsConfiguration(request);

        assertThat(config).isNotNull();
        assertThat(config.getAllowedOrigins()).containsExactly("http://localhost:4200", "https://jiralite.app");
        assertThat(config.getAllowedMethods()).containsExactly("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
        assertThat(config.getAllowedHeaders()).contains("Authorization", "Content-Type", "X-XSRF-TOKEN");
        assertThat(config.getAllowCredentials()).isTrue();
    }

    @Test
    void corsRejectsWildcardOriginWhenCredentialsAreSupported() {
        assertThatThrownBy(() -> securityConfig.corsConfigurationSource("*"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Wildcard origin '*' is not allowed when credentials are supported.");

        assertThatThrownBy(() -> securityConfig.corsConfigurationSource("http://localhost:4200, *"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Wildcard origin '*' is not allowed when credentials are supported.");
    }
}
