package com.jiralite.backend.user;

import com.jiralite.backend.auth.MeResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class UserAdminController {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserAdminController(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @GetMapping
    public List<MeResponse> list() {
        return users.findAll().stream().map(MeResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MeResponse create(@Valid @RequestBody CreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        PasswordPolicy.validate(request.password());
        return MeResponse.from(users.save(new User(email, request.displayName().trim(),
                encoder.encode(request.password()), request.role())));
    }

    @PatchMapping("/{id}")
    public MeResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        User user = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (request.role() != null) user.setRole(request.role());
        if (request.enabled() != null) user.setEnabled(request.enabled());
        return MeResponse.from(users.save(user));
    }

    public record CreateUserRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 100) String displayName,
            @NotBlank @Size(min = 12, max = 72) String password,
            @NotNull GlobalRole role) {}

    public record UpdateUserRequest(GlobalRole role, Boolean enabled) {}
}
