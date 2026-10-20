package com.jiralite.backend.project;

import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.Role;
import com.jiralite.backend.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectRepository projects;
    private final ProjectMemberRepository members;
    private final UserRepository users;

    public ProjectController(ProjectRepository projects, ProjectMemberRepository members, UserRepository users) {
        this.projects = projects; this.members = members; this.users = users;
    }

    @GetMapping
    public List<ProjectResponse> list() {
        return projects.findAll().stream().map(ProjectResponse::from).toList();
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addMember(@PathVariable Long id, @Valid @RequestBody AddMemberRequest request,
                          @AuthenticationPrincipal AppUserDetails actor) {
        Project project = projects.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        boolean admin = actor.getRole() == Role.ADMIN;
        boolean lead = members.findByProjectIdAndUserId(id, actor.getId())
                .map(m -> m.getRole() == Role.PROJECT_LEAD).orElse(false);
        if (!admin && !lead) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project lead or admin required");
        var user = users.findById(request.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        members.save(new ProjectMember(project, user, request.role()));
    }

    public record AddMemberRequest(@NotNull Long userId, @NotNull Role role) {}
    public record ProjectResponse(Long id, String key, String name, String description) {
        static ProjectResponse from(Project p) {
            return new ProjectResponse(p.getId(), p.getProjectKey(), p.getName(), p.getDescription());
        }
    }
}
