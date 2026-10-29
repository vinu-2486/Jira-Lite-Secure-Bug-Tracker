package com.jiralite.backend.bug;

import com.jiralite.backend.project.Project;
import com.jiralite.backend.project.ProjectMemberRepository;
import com.jiralite.backend.project.ProjectRepository;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BugService {

    private final BugRepository bugs;
    private final ProjectRepository projects;
    private final ProjectMemberRepository members;
    private final UserRepository users;

    public BugService(
            BugRepository bugs,
            ProjectRepository projects,
            ProjectMemberRepository members,
            UserRepository users
    ) {
        this.bugs = bugs;
        this.projects = projects;
        this.members = members;
        this.users = users;
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

        bugs.saveAndFlush(bug);

        // Generate the final bug key, for example P1-1.
        bug.setBugKey(project.getProjectKey() + "-" + bug.getId());

        // Save the final key.
        bugs.save(bug);

        return BugResponse.from(bug);
    }
}