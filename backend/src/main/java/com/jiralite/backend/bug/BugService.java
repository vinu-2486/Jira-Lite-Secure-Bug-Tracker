package com.jiralite.backend.bug;

import com.jiralite.backend.project.Project;
import com.jiralite.backend.project.ProjectMemberRepository;
import com.jiralite.backend.project.ProjectMember;
import com.jiralite.backend.project.ProjectRole;
import com.jiralite.backend.project.ProjectRepository;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Comparator;
import java.util.Locale;
import java.util.Set;

@Service
public class BugService {

    private final BugRepository bugs;
    private final ProjectRepository projects;
    private final ProjectMemberRepository members;
    private final UserRepository users;
    private final BugCommentRepository comments;
    private final BugHistoryRepository history;

    public BugService(
            BugRepository bugs,
            ProjectRepository projects,
            ProjectMemberRepository members,
            UserRepository users,
            BugCommentRepository comments,
            BugHistoryRepository history
    ) {
        this.bugs = bugs;
        this.projects = projects;
        this.members = members;
        this.users = users;
        this.comments = comments;
        this.history = history;
    }

    @Transactional
    public BugResponse createBug(
            Long projectId,
            Long reporterId,
            CreateBugRequest request
    ) {
        // Find the project.
        Project project = projects.findById(projectId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Project not found"
                        )
                );

        // Check whether the current user belongs to the project.
        boolean isMember =
                members.existsByProjectIdAndUserId(projectId, reporterId);

        if (!isMember) {
            // Hide private project information from non-members.
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Project not found"
            );
        }

        // Find the user who is reporting the bug.
        User reporter = users.findById(reporterId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "User not found"
                        )
                );

        // Create the bug.
        Bug bug = new Bug(
                project,
                reporter,
                request.title().trim(),
                request.description().trim(),
                request.priority(),
                request.severity()
        );

        // Save once to generate the database ID.
        bug.setBugKey("TEMP-" + java.util.UUID.randomUUID());

        bug = bugs.saveAndFlush(bug);

        // Generate the final bug key, for example P1-1.
        bug.setBugKey(project.getProjectKey() + "-" + bug.getId());

        // Save the final key.
        bugs.save(bug);
        history.save(new BugHistory(bug, reporter, "CREATED", null, bug.getBugKey(), null));

        return BugResponse.from(bug);
    }

    @Transactional(readOnly = true)
    public List<BugResponse> listBugs(Long projectId, Long actorId) {
        return listBugs(projectId, actorId, null, null, null, null, 0, 100, "createdAt", "desc");
    }

    @Transactional(readOnly = true)
    public List<BugResponse> listBugs(Long projectId, Long actorId, String text, BugStatus status,
                                      BugPriority priority, BugSeverity severity, int page, int size,
                                      String sort, String direction) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination");
        }
        Set<String> allowedSorts = Set.of("createdAt", "updatedAt", "title", "status", "priority");
        if (!allowedSorts.contains(sort)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sort field");
        }
        if (!"asc".equalsIgnoreCase(direction) && !"desc".equalsIgnoreCase(direction)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sort direction");
        }
        projects.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Project not found"
                ));

        if (!members.existsByProjectIdAndUserId(projectId, actorId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Project not found"
            );
        }

        List<Bug> filtered = bugs.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .filter(bug -> text == null || text.isBlank()
                        || bug.getTitle().toLowerCase(Locale.ROOT).contains(text.toLowerCase(Locale.ROOT))
                        || bug.getDescription().toLowerCase(Locale.ROOT).contains(text.toLowerCase(Locale.ROOT))
                        || bug.getBugKey().toLowerCase(Locale.ROOT).contains(text.toLowerCase(Locale.ROOT)))
                .filter(bug -> status == null || bug.getStatus() == status)
                .filter(bug -> priority == null || bug.getPriority() == priority)
                .filter(bug -> severity == null || bug.getSeverity() == severity)
                .sorted(comparator(sort, direction))
                .skip((long) page * size)
                .limit(size)
                .toList();
        return filtered.stream()
                .map(BugResponse::from)
                .toList();
    }

    private Comparator<Bug> comparator(String sort, String direction) {
        Comparator<Bug> comparator = switch (sort) {
            case "title" -> Comparator.comparing(Bug::getTitle, String.CASE_INSENSITIVE_ORDER);
            case "updatedAt" -> Comparator.comparing(Bug::getUpdatedAt);
            case "status" -> Comparator.comparing(bug -> bug.getStatus().name());
            case "priority" -> Comparator.comparing(bug -> bug.getPriority().name());
            default -> Comparator.comparing(Bug::getCreatedAt);
        };
        return "desc".equalsIgnoreCase(direction) ? comparator.reversed() : comparator;
    }

    @Transactional(readOnly = true)
    public BugDetailResponse getBug(Long projectId, Long bugId, Long actorId) {
        ProjectMember member = requireMember(projectId, actorId);
        Bug bug = findBug(projectId, bugId);
        return new BugDetailResponse(BugResponse.from(bug), allowedActions(bug, actorId, member.getRole()));
    }

    @Transactional
    public BugResponse updateBug(Long projectId, Long bugId, Long actorId, UpdateBugRequest request) {
        ProjectMember member = requireMember(projectId, actorId);
        Bug bug = findBug(projectId, bugId);
        requireVersion(bug, request.version());
        boolean lead = member.getRole() == ProjectRole.PROJECT_LEAD;
        if (bug.getStatus() == BugStatus.CLOSED || (!lead && (!bug.getReporter().getId().equals(actorId)
                || bug.getStatus() != BugStatus.OPEN))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bug fields cannot be edited");
        }
        String oldValue = bug.getTitle() + "\n" + bug.getDescription() + "\n"
                + bug.getPriority() + "\n" + bug.getSeverity();
        bug.setTitle(request.title().trim());
        bug.setDescription(request.description().trim());
        bug.setPriority(request.priority());
        bug.setSeverity(request.severity());
        Bug saved = bugs.saveAndFlush(bug);
        if (saved == null) saved = bug;
        history.save(new BugHistory(saved, actor(actorId), "FIELD_EDIT", oldValue,
                saved.getTitle() + "\n" + saved.getDescription() + "\n" + saved.getPriority() + "\n" + saved.getSeverity(), null));
        return BugResponse.from(saved);
    }

    @Transactional
    public BugResponse assignBug(Long projectId, Long bugId, Long actorId, AssignBugRequest request) {
        ProjectMember lead = requireMember(projectId, actorId);
        if (lead.getRole() != ProjectRole.PROJECT_LEAD) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project lead required");
        }
        Bug bug = findBug(projectId, bugId);
        requireVersion(bug, request.version());
        ProjectMember assignee = members.findByProjectIdAndUserId(projectId, request.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignee must be a project member"));
        User user = assignee.getUser();
        String oldValue = bug.getAssignee() == null ? null : String.valueOf(bug.getAssignee().getId());
        bug.setAssignee(user);
        Bug saved = bugs.saveAndFlush(bug);
        if (saved == null) saved = bug;
        history.save(new BugHistory(saved, actor(actorId), "ASSIGNMENT", oldValue,
                String.valueOf(user.getId()), null));
        return BugResponse.from(saved);
    }

    @Transactional
    public BugResponse transition(Long projectId, Long bugId, Long actorId, TransitionBugRequest request) {
        ProjectMember member = requireMember(projectId, actorId);
        Bug bug = findBug(projectId, bugId);
        requireVersion(bug, request.version());
        BugStatus from = bug.getStatus();
        BugStatus to = request.status();
        if (!validTransition(from, to)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid status transition");
        }
        boolean lead = member.getRole() == ProjectRole.PROJECT_LEAD;
        boolean reporter = bug.getReporter().getId().equals(actorId);
        boolean assignee = bug.getAssignee() != null && bug.getAssignee().getId().equals(actorId);
        if ((to == BugStatus.IN_PROGRESS && !assignee)
                || (to == BugStatus.RESOLVED && !assignee)
                || (to == BugStatus.CLOSED && !reporter && !lead)
                || (to == BugStatus.REOPENED && !reporter && !lead)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Actor cannot perform this transition");
        }
        if ((to == BugStatus.CLOSED || to == BugStatus.REOPENED)
                && (request.reason() == null || request.reason().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A reason is required");
        }
        bug.setStatus(to);
        if (to == BugStatus.CLOSED) bug.setResolution(request.reason().trim());
        if (to == BugStatus.REOPENED) bug.setResolution(null);
        Bug saved = bugs.saveAndFlush(bug);
        if (saved == null) saved = bug;
        history.save(new BugHistory(saved, actor(actorId), "STATUS_CHANGE", from.name(), to.name(), request.reason()));
        return BugResponse.from(saved);
    }

    @Transactional
    public CommentResponse addComment(Long projectId, Long bugId, Long actorId, AddCommentRequest request) {
        requireMember(projectId, actorId);
        Bug bug = findBug(projectId, bugId);
        BugComment comment = comments.saveAndFlush(new BugComment(bug, actor(actorId), request.body().trim()));
        history.save(new BugHistory(bug, actor(actorId), "COMMENT", null, null, request.body().trim()));
        return CommentResponse.from(comment);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> comments(Long projectId, Long bugId, Long actorId) {
        requireMember(projectId, actorId);
        findBug(projectId, bugId);
        return comments.findAllByBugIdOrderByCreatedAtAsc(bugId).stream().map(CommentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<HistoryResponse> history(Long projectId, Long bugId, Long actorId) {
        requireMember(projectId, actorId);
        findBug(projectId, bugId);
        return history.findAllByBugIdOrderByCreatedAtAsc(bugId).stream().map(HistoryResponse::from).toList();
    }

    private ProjectMember requireMember(Long projectId, Long actorId) {
        projects.findById(projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return members.findByProjectIdAndUserId(projectId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private Bug findBug(Long projectId, Long bugId) {
        return bugs.findById(bugId)
                .filter(bug -> bug.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bug not found"));
    }

    private User actor(Long actorId) {
        return users.findById(actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void requireVersion(Bug bug, Long version) {
        if (!bug.getVersion().equals(version)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bug was changed by another request");
        }
    }

    private boolean validTransition(BugStatus from, BugStatus to) {
        return from == BugStatus.OPEN && to == BugStatus.IN_PROGRESS
                || from == BugStatus.IN_PROGRESS && to == BugStatus.RESOLVED
                || from == BugStatus.RESOLVED && (to == BugStatus.CLOSED || to == BugStatus.REOPENED)
                || from == BugStatus.CLOSED && to == BugStatus.REOPENED
                || from == BugStatus.REOPENED && to == BugStatus.IN_PROGRESS;
    }

    private Set<String> allowedActions(Bug bug, Long actorId, ProjectRole role) {
        boolean lead = role == ProjectRole.PROJECT_LEAD;
        boolean reporter = bug.getReporter().getId().equals(actorId);
        boolean assignee = bug.getAssignee() != null && bug.getAssignee().getId().equals(actorId);
        var actions = new java.util.HashSet<String>();
        if (bug.getStatus() != BugStatus.CLOSED && (lead || (reporter && bug.getStatus() == BugStatus.OPEN))) actions.add("EDIT_FIELDS");
        if (lead) actions.add("ASSIGN");
        if (assignee && (bug.getStatus() == BugStatus.OPEN || bug.getStatus() == BugStatus.REOPENED)) actions.add("START");
        if (assignee && bug.getStatus() == BugStatus.IN_PROGRESS) actions.add("RESOLVE");
        if ((reporter || lead) && bug.getStatus() == BugStatus.RESOLVED) actions.add("CLOSE");
        if ((reporter || lead)
                && (bug.getStatus() == BugStatus.RESOLVED || bug.getStatus() == BugStatus.CLOSED)) {
            actions.add("REOPEN");
        }
        return actions;
    }
}