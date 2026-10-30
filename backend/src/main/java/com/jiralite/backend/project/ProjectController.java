package com.jiralite.backend.project;

import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.GlobalRole;
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
    public List<ProjectResponse> list(@AuthenticationPrincipal AppUserDetails actor) {
        return members.findAllByUserId(actor.getId()).stream()
                .map(ProjectMember::getProject)
                .map(ProjectResponse::from)
                .toList();
    }

    @GetMapping("/{projectId}/members")
    public List<MemberResponse> listMembers(@PathVariable Long projectId,
                                            @AuthenticationPrincipal AppUserDetails actor) {
        members.findByProjectIdAndUserId(projectId, actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return members.findAllByProjectIdOrderByUserIdAsc(projectId).stream()
                .map(MemberResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal AppUserDetails actor
    ) {
        if (actor.getRole() != GlobalRole.APP_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Application admin required");
        }
        if (projects.findByProjectKeyIgnoreCase(request.key().trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project key is already registered");
        }
        Project project = projects.saveAndFlush(new Project(
                request.key().trim().toUpperCase(),
                request.name().trim(),
                request.description() == null ? null : request.description().trim()
        ));
        var lead = users.findById(request.leadUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        members.save(new ProjectMember(project, lead, ProjectRole.PROJECT_LEAD));
        return ProjectResponse.from(project);
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addMember(@PathVariable Long id, @Valid @RequestBody AddMemberRequest request,
                          @AuthenticationPrincipal AppUserDetails actor) {
        Project project = projects.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        boolean admin = actor.getRole() == GlobalRole.APP_ADMIN;
        boolean lead = members.findByProjectIdAndUserId(id, actor.getId())
                .map(m -> m.getRole() == ProjectRole.PROJECT_LEAD).orElse(false);
        if (!admin && !lead) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project lead or admin required");
        if (lead && !admin && request.role() == ProjectRole.PROJECT_LEAD) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only application admins can appoint project leads");
        }
        var user = users.findById(request.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        members.save(new ProjectMember(project, user, request.role()));
    }

    public record AddMemberRequest(@NotNull Long userId, @NotNull ProjectRole role) {}
    public record MemberResponse(Long userId, String displayName, ProjectRole role) {
        static MemberResponse from(ProjectMember member) {
            return new MemberResponse(member.getUser().getId(), member.getUser().getDisplayName(), member.getRole());
        }
    }
    public record CreateProjectRequest(
            @NotBlank @Size(max = 20) String key,
            @NotBlank @Size(max = 100) String name,
            @Size(max = 500) String description,
            @NotNull Long leadUserId
    ) {}
    public record ProjectResponse(Long id, String key, String name, String description) {
        static ProjectResponse from(Project p) {
            return new ProjectResponse(p.getId(), p.getProjectKey(), p.getName(), p.getDescription());
        }
    }
}
