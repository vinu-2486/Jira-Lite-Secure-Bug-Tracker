package com.jiralite.backend;

import org.springframework.test.context.DynamicPropertyRegistry;

import java.net.URI;
import java.util.Map;

final class IsolatedDatabaseTestSupport {
    private static final String URL = "JIRALITE_TEST_DB_URL";
    private static final String USERNAME = "JIRALITE_TEST_DB_USERNAME";
    private static final String PASSWORD = "JIRALITE_TEST_DB_PASSWORD";
    private static final String SCHEMA = "JIRALITE_TEST_DB_SCHEMA";
    private static final String PORT = "JIRALITE_TEST_DB_PORT";
    private static final String JDBC_PREFIX = "jdbc:mysql://";

    private IsolatedDatabaseTestSupport() {
    }

    static void registerProperties(DynamicPropertyRegistry registry) {
        validateConfiguration();
        registry.add("spring.datasource.url", () -> required(URL));
        registry.add("spring.datasource.username", () -> required(USERNAME));
        registry.add("spring.datasource.password", () -> required(PASSWORD));
        registry.add("spring.flyway.enabled", () -> true);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    static void validateConfiguration() {
        String url = required(URL);
        String schema = required(SCHEMA);
        String port = required(PORT);
        URI target = parseJdbcUrl(url);

        if (!"127.0.0.1".equals(target.getHost())
                || !port.equals(Integer.toString(target.getPort()))
                || !schema.equals(target.getPath().substring(1))
                || target.getQuery() != null) {
            throw new IllegalStateException("Tests require the explicitly provisioned loopback MySQL target");
        }
        if (Integer.parseInt(port) < 1024 || Integer.parseInt(port) > 65535) {
            throw new IllegalStateException("Tests require a non-privileged disposable MySQL port");
        }

        Map.of(
                "spring.datasource.url", System.getProperty("spring.datasource.url", ""),
                "SPRING_DATASOURCE_URL", System.getenv().getOrDefault("SPRING_DATASOURCE_URL", ""),
                "DATABASE_URL", System.getenv().getOrDefault("DATABASE_URL", "")
        ).forEach((property, value) -> {
            if (!value.isBlank() && !url.equals(value)) {
                throw new IllegalStateException("Unsafe database override detected in " + property);
            }
        });
        required(USERNAME);
        required(PASSWORD);
    }

    static String expectedSchema() {
        return required(SCHEMA);
    }

    private static URI parseJdbcUrl(String url) {
        if (!url.startsWith(JDBC_PREFIX)) {
            throw new IllegalStateException("Tests require a MySQL JDBC URL");
        }
        try {
            return URI.create("mysql://" + url.substring(JDBC_PREFIX.length()));
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("Invalid isolated test database URL", ex);
        }
    }

    private static String required(String name) {
        String value = System.getProperty(name);
        if (value == null || value.isBlank()) {
            value = System.getenv(name);
        }
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing isolated test database setting: " + name);
        }
        return value;
    }
}
