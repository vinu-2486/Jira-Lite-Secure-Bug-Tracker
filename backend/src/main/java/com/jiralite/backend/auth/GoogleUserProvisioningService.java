package com.jiralite.backend.auth;

import com.jiralite.backend.user.GlobalRole;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
public class GoogleUserProvisioningService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public GoogleUserProvisioningService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public User createUser(String googleSub, String email, String displayName) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String randomPassword = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        User user = new User(email, displayName, passwordEncoder.encode(randomPassword), GlobalRole.USER);
        user.setGoogleSub(googleSub);
        return users.saveAndFlush(user);
    }
}
