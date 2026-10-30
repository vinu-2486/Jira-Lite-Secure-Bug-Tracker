package com.jiralite.backend.github;

import com.jiralite.backend.project.ProjectRepository;
import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.GlobalRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/github")
public class GitHubAdminController {
    private final GitHubRepositoryBindingRepository bindings;
    private final ProjectRepository projects;

    public GitHubAdminController(GitHubRepositoryBindingRepository bindings, ProjectRepository projects) {
        this.bindings = bindings; this.projects = projects;
    }

    @PostMapping("/repositories")
    @ResponseStatus(HttpStatus.CREATED)
    public BindingResponse bind(@Valid @RequestBody BindRequest request,
                                @AuthenticationPrincipal AppUserDetails actor) {
        if (actor.getRole() != GlobalRole.APP_ADMIN) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Application admin required");
        String fullName = request.owner().trim() + "/" + request.repositoryName().trim();
        if (!fullName.equals(request.fullName().trim())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Repository identity does not match");
        var project = projects.findById(request.projectId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        if (bindings.findByProjectId(request.projectId()).isPresent() || bindings.findByRepositoryId(request.repositoryId()).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Repository or project is already bound");
        return BindingResponse.from(bindings.save(new GitHubRepositoryBinding(project, request.installationId(),
                request.repositoryId(), request.owner().trim(), request.repositoryName().trim(), fullName)));
    }

    public record BindRequest(@NotNull Long projectId, @NotNull Long installationId, @NotNull Long repositoryId,
                               @NotBlank @Size(max = 100) String owner,
                               @NotBlank @Size(max = 100) String repositoryName,
                               @NotBlank @Size(max = 201) String fullName) {}
    public record BindingResponse(Long projectId, Long repositoryId, String fullName) {
        static BindingResponse from(GitHubRepositoryBinding b) {
            return new BindingResponse(b.getProject().getId(), b.getRepositoryId(), b.getFullName());
        }
    }
}
