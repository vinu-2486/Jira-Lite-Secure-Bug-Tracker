package com.jiralite.backend.bug;

import com.jiralite.backend.project.Project;
import com.jiralite.backend.project.ProjectMemberRepository;
import com.jiralite.backend.project.ProjectMember;
import com.jiralite.backend.project.ProjectRole;
import com.jiralite.backend.project.ProjectRepository;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BugServiceTest {

    @Mock
    private BugRepository bugs;
    @Mock
    private ProjectRepository projects;
    @Mock
    private ProjectMemberRepository members;
    @Mock
    private UserRepository users;
    @Mock
    private BugHistoryRepository history;
    @InjectMocks
    private BugService service;

    @Test
    void memberCanListBugsNewestFirst() {
        Project project = new Project("JILA", "JILA", "Test project");
        when(projects.findById(7L)).thenReturn(Optional.of(project));
        when(members.existsByProjectIdAndUserId(7L, 11L)).thenReturn(true);
        when(bugs.findAllByProjectIdOrderByCreatedAtDesc(7L)).thenReturn(List.of());

        assertThat(service.listBugs(7L, 11L)).isEmpty();
    }

    @Test
    void nonMemberIsRejectedEvenWhenCallerIsAnAdmin() {
        when(projects.findById(7L)).thenReturn(Optional.of(new Project("JILA", "JILA", "Test project")));
        when(members.existsByProjectIdAndUserId(7L, 11L)).thenReturn(false);

        assertThatThrownBy(() -> service.listBugs(7L, 11L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode.value")
                .isEqualTo(404);
    }

    @Test
    void memberWithNoBugsGetsAnEmptyList() {
        when(projects.findById(7L)).thenReturn(Optional.of(new Project("JILA", "JILA", "Test project")));
        when(members.existsByProjectIdAndUserId(7L, 11L)).thenReturn(true);
        when(bugs.findAllByProjectIdOrderByCreatedAtDesc(7L)).thenReturn(List.of());

        assertThat(service.listBugs(7L, 11L)).isEmpty();
    }

    @Test
    void projectLeadCanReopenClosedBugAndResolutionIsCleared() {
        Project project = mock(Project.class);
        User leadUser = mock(User.class);
        ProjectMember lead = mock(ProjectMember.class);
        Bug bug = mock(Bug.class);
        when(project.getId()).thenReturn(7L);
        when(lead.getRole()).thenReturn(ProjectRole.PROJECT_LEAD);
        when(projects.findById(7L)).thenReturn(Optional.of(project));
        when(members.findByProjectIdAndUserId(7L, 11L)).thenReturn(Optional.of(lead));
        when(users.findById(11L)).thenReturn(Optional.of(leadUser));
        when(bugs.findById(8L)).thenReturn(Optional.of(bug));
        when(bug.getProject()).thenReturn(project);
        when(bug.getStatus()).thenReturn(BugStatus.CLOSED);
        when(bug.getVersion()).thenReturn(0L);
        when(bug.getReporter()).thenReturn(mock(User.class));
        when(bug.getId()).thenReturn(8L);
        when(bug.getBugKey()).thenReturn("JILA-8");
        when(bug.getTitle()).thenReturn("title");
        when(bug.getDescription()).thenReturn("description");
        when(bug.getPriority()).thenReturn(BugPriority.MEDIUM);
        when(bug.getSeverity()).thenReturn(BugSeverity.MAJOR);
        when(bug.getResolution()).thenReturn("fixed");
        when(bug.getCreatedAt()).thenReturn(java.time.Instant.now());
        when(bug.getUpdatedAt()).thenReturn(java.time.Instant.now());

        service.transition(7L, 8L, 11L,
                new TransitionBugRequest(BugStatus.REOPENED, "Regression confirmed", 0L));

        verify(bug).setStatus(BugStatus.REOPENED);
        verify(bug).setResolution(null);
        verify(bugs).save(bug);
        verify(history).save(any(BugHistory.class));
    }

    @Test
    void reporterCanReopenClosedBugAndResolutionIsCleared() {
        Project project = mock(Project.class);
        User reporter = mock(User.class);
        ProjectMember member = mock(ProjectMember.class);
        Bug bug = mock(Bug.class);
        when(project.getId()).thenReturn(7L);
        when(reporter.getId()).thenReturn(11L);
        when(member.getRole()).thenReturn(ProjectRole.REPORTER);
        when(members.findByProjectIdAndUserId(7L, 11L)).thenReturn(Optional.of(member));
        when(users.findById(11L)).thenReturn(Optional.of(reporter));
        when(projects.findById(7L)).thenReturn(Optional.of(project));
        when(bugs.findById(8L)).thenReturn(Optional.of(bug));
        when(bug.getProject()).thenReturn(project);
        when(bug.getStatus()).thenReturn(BugStatus.CLOSED);
        when(bug.getVersion()).thenReturn(0L);
        when(bug.getReporter()).thenReturn(reporter);

        service.transition(7L, 8L, 11L,
                new TransitionBugRequest(BugStatus.REOPENED, "needs follow-up", 0L));

        verify(bug).setStatus(BugStatus.REOPENED);
        verify(bug).setResolution(null);
        verify(bugs).save(bug);
    }

    @Test
    void differentProjectMemberCannotReopenClosedBug() {
        Project project = mock(Project.class);
        User reporter = mock(User.class);
        ProjectMember member = mock(ProjectMember.class);
        Bug bug = mock(Bug.class);
        when(project.getId()).thenReturn(7L);
        when(reporter.getId()).thenReturn(11L);
        when(member.getRole()).thenReturn(ProjectRole.DEVELOPER);
        when(members.findByProjectIdAndUserId(7L, 12L)).thenReturn(Optional.of(member));
        when(projects.findById(7L)).thenReturn(Optional.of(project));
        when(bugs.findById(8L)).thenReturn(Optional.of(bug));
        when(bug.getProject()).thenReturn(project);
        when(bug.getStatus()).thenReturn(BugStatus.CLOSED);
        when(bug.getVersion()).thenReturn(0L);
        when(bug.getReporter()).thenReturn(reporter);

        assertThatThrownBy(() -> service.transition(7L, 8L, 12L,
                new TransitionBugRequest(BugStatus.REOPENED, "needs follow-up", 0L)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode.value").isEqualTo(403);
        verify(bugs, never()).save(any());
    }

    @Test
    void reopeningClosedBugRequiresAReason() {
        Project project = mock(Project.class);
        User reporter = mock(User.class);
        ProjectMember member = mock(ProjectMember.class);
        Bug bug = mock(Bug.class);
        when(project.getId()).thenReturn(7L);
        when(reporter.getId()).thenReturn(11L);
        when(member.getRole()).thenReturn(ProjectRole.REPORTER);
        when(members.findByProjectIdAndUserId(7L, 11L)).thenReturn(Optional.of(member));
        when(projects.findById(7L)).thenReturn(Optional.of(project));
        when(bugs.findById(8L)).thenReturn(Optional.of(bug));
        when(bug.getProject()).thenReturn(project);
        when(bug.getStatus()).thenReturn(BugStatus.CLOSED);
        when(bug.getVersion()).thenReturn(0L);
        when(bug.getReporter()).thenReturn(reporter);

        assertThatThrownBy(() -> service.transition(7L, 8L, 11L,
                new TransitionBugRequest(BugStatus.REOPENED, " ", 0L)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode.value").isEqualTo(400);
        verify(bugs, never()).save(any());
    }

    @Test
    void leadCannotAssignBugToNonMember() {
        Project project = mock(Project.class);
        ProjectMember lead = mock(ProjectMember.class);
        Bug bug = mock(Bug.class);
        when(project.getId()).thenReturn(7L);
        when(lead.getRole()).thenReturn(ProjectRole.PROJECT_LEAD);
        when(members.findByProjectIdAndUserId(7L, 11L)).thenReturn(Optional.of(lead));
        when(projects.findById(7L)).thenReturn(Optional.of(project));
        when(bugs.findById(8L)).thenReturn(Optional.of(bug));
        when(bug.getProject()).thenReturn(project);
        when(bug.getVersion()).thenReturn(0L);
        when(members.findByProjectIdAndUserId(7L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.assignBug(7L, 8L, 11L,
                new AssignBugRequest(99L, 0L)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode.value").isEqualTo(400);
        verify(bugs, never()).save(any());
    }
}
