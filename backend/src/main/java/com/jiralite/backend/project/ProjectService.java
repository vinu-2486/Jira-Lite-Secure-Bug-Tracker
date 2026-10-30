package com.jiralite.backend.project;

import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.GlobalRole;
import com.jiralite.backend.user.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Service
public class ProjectService {
    private static final Logger log = LoggerFactory.getLogger(ProjectService.class);
    private final ProjectRepository projects;
    private final ProjectMemberRepository members;
    private final UserRepository users;

    public ProjectService(ProjectRepository projects, ProjectMemberRepository members, UserRepository users) {
        this.projects = projects;
        this.members = members;
        this.users = users;
    }

    public List<ProjectController.ProjectResponse> list(AppUserDetails actor) {
        return members.findAllByUserId(actor.getId()).stream()
                .map(ProjectMember::getProject)
                .map(ProjectController.ProjectResponse::from)
                .toList();
    }

    public List<ProjectController.MemberResponse> listMembers(Long projectId, AppUserDetails actor) {
        requireMembership(projectId, actor.getId());
        return members.findAllByProjectIdOrderByUserIdAsc(projectId).stream()
                .map(ProjectController.MemberResponse::from)
                .toList();
    }

    @Transactional
    public ProjectController.ProjectResponse create(ProjectController.CreateProjectRequest request,
                                                    AppUserDetails actor) {
        requireAppAdmin(actor);
        String key = request.key().trim();
        if (projects.findByProjectKeyIgnoreCase(key).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project key is already registered");
        }
        Project project = projects.saveAndFlush(new Project(
                key.toUpperCase(),
                request.name().trim(),
                request.description() == null ? null : request.description().trim()
        ));
        var lead = users.findById(request.leadUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        members.save(new ProjectMember(project, lead, ProjectRole.PROJECT_LEAD));
        log.info("project_change actor={} action=CREATE target={} outcome=SUCCESS", actor.getId(), project.getId());
        return ProjectController.ProjectResponse.from(project);
    }

    @Transactional
    public void addMember(Long projectId, ProjectController.AddMemberRequest request,
                          AppUserDetails actor) {
        Project project = projects.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        boolean admin = actor.getRole() == GlobalRole.APP_ADMIN;
        boolean lead = members.findByProjectIdAndUserId(projectId, actor.getId())
                .map(m -> m.getRole() == ProjectRole.PROJECT_LEAD).orElse(false);
        if (!admin && !lead) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project lead or admin required");
        }
        if (lead && !admin && request.role() == ProjectRole.PROJECT_LEAD) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only application admins can appoint project leads");
        }
        var user = users.findById(request.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        members.save(new ProjectMember(project, user, request.role()));
        log.info("project_change actor={} action=ADD_MEMBER target={} outcome=SUCCESS", actor.getId(), projectId);
    }

    private void requireMembership(Long projectId, Long userId) {
        members.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private void requireAppAdmin(AppUserDetails actor) {
        if (actor.getRole() != GlobalRole.APP_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Application admin required");
        }
    }
}
