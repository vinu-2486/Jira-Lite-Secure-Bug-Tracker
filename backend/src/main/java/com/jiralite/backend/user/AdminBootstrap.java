package com.jiralite.backend.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository users, PasswordEncoder encoder,
                          @Value("${jiralite.bootstrap.admin-email:}") String email,
                          @Value("${jiralite.bootstrap.admin-password:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.existsByRole(GlobalRole.APP_ADMIN)) return;            // only ever runs once

        if (email.isBlank() || password.isBlank()) {
            log.warn("No ADMIN exists. Set JIRALITE_ADMIN_EMAIL and JIRALITE_ADMIN_PASSWORD and restart.");
            return;
        }
        PasswordPolicy.validate(password);

        users.save(new User(email.trim().toLowerCase(), "Administrator",
                encoder.encode(password), GlobalRole.APP_ADMIN));
        log.info("Created first administrator: {}", email);     // never log the password
    }
}