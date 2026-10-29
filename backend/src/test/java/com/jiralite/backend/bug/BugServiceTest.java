package com.jiralite.backend.bug;

import com.jiralite.backend.project.Project;
import com.jiralite.backend.project.ProjectMemberRepository;
import com.jiralite.backend.project.ProjectRepository;
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
import static org.mockito.Mockito.when;

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
}
