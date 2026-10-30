package com.jiralite.backend.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.jiralite.backend.security.AppUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class UserAdminController {
    private static final Logger log = LoggerFactory.getLogger(UserAdminController.class);
    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserAdminController(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @GetMapping
    public List<AdminUserResponse> list() {
        return users.findAll().stream().map(AdminUserResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminUserResponse create(@Valid @RequestBody CreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        PasswordPolicy.validate(request.password());
        User created = users.save(new User(email, request.displayName().trim(),
                encoder.encode(request.password()), request.role()));
        log.info("admin_change action=CREATE_USER target={} outcome=SUCCESS", created.getId());
        return AdminUserResponse.from(created);
    }

    @PatchMapping("/{id}")
    public AdminUserResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request,
                                    @AuthenticationPrincipal AppUserDetails actor) {
        User user = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        boolean self = actor.getId().equals(id);
        if (self && Boolean.FALSE.equals(request.enabled())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Administrators cannot disable their own account");
        }
        if (self && request.role() != null && request.role() != GlobalRole.APP_ADMIN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Administrators cannot demote their own account");
        }
        boolean demotesEnabledAdmin = user.getRole() == GlobalRole.APP_ADMIN && user.isEnabled()
                && ((request.role() != null && request.role() != GlobalRole.APP_ADMIN)
                || Boolean.FALSE.equals(request.enabled()));
        if (demotesEnabledAdmin && users.countByRoleAndEnabledTrue(GlobalRole.APP_ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot remove the last enabled application admin");
        }
        if (request.role() != null) user.setRole(request.role());
        if (request.enabled() != null) user.setEnabled(request.enabled());
        User updated = users.save(user);
        log.info("admin_change action=UPDATE_USER target={} outcome=SUCCESS", id);
        return AdminUserResponse.from(updated);
    }

    public record CreateUserRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 100) String displayName,
            @NotBlank @Size(min = 12, max = 72) String password,
            @NotNull GlobalRole role) {}

    public record UpdateUserRequest(GlobalRole role, Boolean enabled) {}
}
