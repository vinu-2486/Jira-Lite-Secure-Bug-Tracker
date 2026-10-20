package com.jiralite.backend.auth;

import com.jiralite.backend.user.PasswordPolicy;
import com.jiralite.backend.user.Role;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class SignupController {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    public SignupController(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public MeResponse signup(@Valid @RequestBody SignupRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        PasswordPolicy.validate(request.password());
        User user = users.save(new User(email, request.displayName().trim(),
                encoder.encode(request.password()), Role.REPORTER));
        return MeResponse.from(user);
    }
}
