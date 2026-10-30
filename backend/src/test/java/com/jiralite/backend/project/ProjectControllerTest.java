package com.jiralite.backend.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.GlobalRole;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class ProjectControllerTest {
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final ProjectMemberRepository members = mock(ProjectMemberRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ProjectController controller = new ProjectController(projects, members, users);

    @Test
    void memberListReturnsStableUserIdOrderAndOnlyApprovedFields() throws Exception {
        AppUserDetails actor = actor(10L, GlobalRole.USER);
        ProjectMember lead = member(2L, "Lead", ProjectRole.PROJECT_LEAD);
        ProjectMember reporter = member(7L, "Reporter", ProjectRole.REPORTER);
        ProjectMember developer = member(15L, "Developer", ProjectRole.DEVELOPER);
        when(members.findByProjectIdAndUserId(4L, 10L)).thenReturn(Optional.of(lead));
        when(members.findAllByProjectIdOrderByUserIdAsc(4L)).thenReturn(List.of(lead, reporter, developer));

        List<ProjectController.MemberResponse> result = controller.listMembers(4L, actor);

        assertThat(result).extracting(ProjectController.MemberResponse::userId)
                .containsExactly(2L, 7L, 15L);
        assertThat(result).extracting(ProjectController.MemberResponse::displayName)
                .containsExactly("Lead", "Reporter", "Developer");
        assertThat(result).extracting(ProjectController.MemberResponse::role)
                .containsExactly(ProjectRole.PROJECT_LEAD, ProjectRole.REPORTER, ProjectRole.DEVELOPER);
        String json = new ObjectMapper().writeValueAsString(result);
        assertThat(json).doesNotContain("email", "password", "credentials");
    }

    @Test
    void nonMemberGetsPrivateProjectNotFound() {
        when(members.findByProjectIdAndUserId(4L, 10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.listMembers(4L, actor(10L, GlobalRole.USER)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode.value").isEqualTo(404);
        verify(members, never()).findAllByProjectIdOrderByUserIdAsc(4L);
    }

    @Test
    void applicationAdminWithoutMembershipAlsoGetsPrivateProjectNotFound() {
        when(members.findByProjectIdAndUserId(4L, 10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.listMembers(4L, actor(10L, GlobalRole.APP_ADMIN)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode.value").isEqualTo(404);
        verify(members, never()).findAllByProjectIdOrderByUserIdAsc(4L);
    }

    private AppUserDetails actor(Long id, GlobalRole role) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getRole()).thenReturn(role);
        when(user.getEmail()).thenReturn("actor@example.com");
        when(user.getDisplayName()).thenReturn("Actor");
        when(user.getPasswordHash()).thenReturn("{noop}password");
        return new AppUserDetails(user);
    }

    private ProjectMember member(Long id, String displayName, ProjectRole role) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getDisplayName()).thenReturn(displayName);
        ProjectMember member = mock(ProjectMember.class);
        when(member.getUser()).thenReturn(user);
        when(member.getRole()).thenReturn(role);
        return member;
    }
}
