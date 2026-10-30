package com.jiralite.backend.project;

import com.jiralite.backend.security.AppUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public List<ProjectResponse> list(@AuthenticationPrincipal AppUserDetails actor) {
        return projectService.list(actor);
    }

    @GetMapping("/{projectId}/members")
    public List<MemberResponse> listMembers(@PathVariable Long projectId,
                                            @AuthenticationPrincipal AppUserDetails actor) {
        return projectService.listMembers(projectId, actor);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal AppUserDetails actor
    ) {
        return projectService.create(request, actor);
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addMember(@PathVariable Long id, @Valid @RequestBody AddMemberRequest request,
                          @AuthenticationPrincipal AppUserDetails actor) {
        projectService.addMember(id, request, actor);
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
