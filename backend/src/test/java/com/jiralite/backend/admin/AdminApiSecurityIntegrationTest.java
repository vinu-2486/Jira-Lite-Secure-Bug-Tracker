package com.jiralite.backend.admin;

import com.jiralite.backend.BackendApplication;
import com.jiralite.backend.bug.BugCommentRepository;
import com.jiralite.backend.bug.BugHistoryRepository;
import com.jiralite.backend.bug.BugRepository;
import com.jiralite.backend.attachment.BugAttachmentRepository;
import com.jiralite.backend.github.GitHubEventReferenceRepository;
import com.jiralite.backend.github.GitHubRepositoryBinding;
import com.jiralite.backend.github.GitHubRepositoryBindingRepository;
import com.jiralite.backend.project.Project;
import com.jiralite.backend.project.ProjectMember;
import com.jiralite.backend.project.ProjectMemberRepository;
import com.jiralite.backend.project.ProjectRepository;
import com.jiralite.backend.project.ProjectRole;
import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.GlobalRole;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("isolated-test")
class AdminApiSecurityIntegrationTest {
    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder encoder;
    @Autowired private ProjectRepository projects;
    @Autowired private ProjectMemberRepository members;
    @Autowired private GitHubRepositoryBindingRepository bindings;
    @Autowired private BugRepository bugs;
    @Autowired private BugCommentRepository comments;
    @Autowired private BugHistoryRepository history;
    @Autowired private BugAttachmentRepository attachments;

    @DynamicPropertySource
    static void isolatedDatabase(DynamicPropertyRegistry registry) {
        com.jiralite.backend.IsolatedDatabaseTestSupport.registerProperties(registry);
    }

    @BeforeEach
    void cleanDatabase() {
        history.deleteAll();
        comments.deleteAll();
        attachments.deleteAll();
        bugs.deleteAll();
        bindings.deleteAll();
        members.deleteAll();
        projects.deleteAll();
        users.deleteAll();
    }

    @Test
    void anonymousAdminRequestsAreUnauthorized() throws Exception {
        mvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/users")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validCreateJson()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedNonAdminAdminRequestsAreForbidden() throws Exception {
        User user = saveUser(GlobalRole.USER);

        mvc.perform(get("/api/admin/users").with(as(user)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/users")
                        .with(as(user))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validCreateJson()))
                .andExpect(status().isForbidden());
    }

    @Test
    void missingOrInvalidCsrfIsRejectedForAdminMutation() throws Exception {
        User admin = saveUser(GlobalRole.APP_ADMIN);
        String body = validCreateJson();

        mvc.perform(post("/api/admin/users")
                        .with(as(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/users")
                        .with(as(admin))
                        .header("X-XSRF-TOKEN", "invalid")
                        .cookie(new jakarta.servlet.http.Cookie("XSRF-TOKEN", "invalid"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanCreateAndListUsersWithoutExposingCredentials() throws Exception {
        User admin = saveUser(GlobalRole.APP_ADMIN);
        String email = uniqueEmail();

        mvc.perform(post("/api/admin/users")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(email, "Long Valid Password", GlobalRole.USER)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email", is(email)))
                .andExpect(jsonPath("$.role", is("USER")))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("password"))));

        mvc.perform(get("/api/admin/users").with(as(admin)))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("password_hash"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("credentials"))));
        User created = users.findByEmailIgnoreCase(email).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(created.getPasswordHash())
                .isNotEqualTo("Long Valid Password");
        org.assertj.core.api.Assertions.assertThat(encoder.matches("Long Valid Password", created.getPasswordHash()))
                .isTrue();
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {
        User admin = saveUser(GlobalRole.APP_ADMIN);
        String email = uniqueEmail();
        saveUser(email, GlobalRole.USER);

        mvc.perform(post("/api/admin/users")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(email, "Another Valid Password", GlobalRole.USER)))
                .andExpect(status().isConflict());
    }

    @Test
    void invalidInputAndPasswordPolicyAreRejected() throws Exception {
        User admin = saveUser(GlobalRole.APP_ADMIN);

        mvc.perform(post("/api/admin/users")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("not-an-email", "", GlobalRole.USER)))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/admin/users")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(uniqueEmail(), "short", GlobalRole.USER)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCanPatchRoleAndEnabledAndUnknownUserIsNotFound() throws Exception {
        User admin = saveUser(GlobalRole.APP_ADMIN);
        User target = saveUser(GlobalRole.USER);

        mvc.perform(patch("/api/admin/users/" + target.getId())
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"APP_ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("APP_ADMIN")));
        User partiallyUpdated = users.findById(target.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(partiallyUpdated.getRole()).isEqualTo(GlobalRole.APP_ADMIN);
        org.assertj.core.api.Assertions.assertThat(partiallyUpdated.isEnabled()).isTrue();

        mvc.perform(patch("/api/admin/users/" + target.getId())
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"APP_ADMIN\",\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("APP_ADMIN")));
        User updated = users.findById(target.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(updated.getRole()).isEqualTo(GlobalRole.APP_ADMIN);
        org.assertj.core.api.Assertions.assertThat(updated.isEnabled()).isFalse();

        mvc.perform(patch("/api/admin/users/999999")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":true}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void validGitHubBindingWorksAndInvalidIdentityUnknownProjectAndDuplicatesAreRejected() throws Exception {
        User admin = saveUser(GlobalRole.APP_ADMIN);
        Project project = saveProject("GHA");
        Project secondProject = saveProject("GHB");
        String valid = "{\"projectId\":" + project.getId()
                + ",\"installationId\":10,\"repositoryId\":20,\"owner\":\"octo\","
                + "\"repositoryName\":\"bugs\",\"fullName\":\"octo/bugs\"}";

        mvc.perform(post("/api/admin/github/repositories")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.projectId", is(project.getId().intValue())))
                .andExpect(jsonPath("$.fullName", is("octo/bugs")));

        mvc.perform(post("/api/admin/github/repositories")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/github/repositories")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(valid.replace("\"projectId\":" + project.getId(),
                                "\"projectId\":" + secondProject.getId())))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/github/repositories")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(valid.replace("\"fullName\":\"octo/bugs\"", "\"fullName\":\"wrong/name\"")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/github/repositories")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(valid.replace("\"projectId\":" + project.getId(), "\"projectId\":999999")
                                .replace("\"repositoryId\":20", "\"repositoryId\":21")
                                .replace("\"fullName\":\"octo/bugs\"", "\"fullName\":\"octo/other\"")
                                .replace("\"repositoryName\":\"bugs\"", "\"repositoryName\":\"other\"")))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/admin/github/repositories")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(valid.replace("\"repositoryId\":20", "\"repositoryId\":21")))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/github/repositories")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(valid.replace("\"owner\":\"octo\"", "\"owner\":\"\"")
                                .replace("\"fullName\":\"octo/bugs\"", "\"fullName\":\"/bugs\"")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/github/repositories")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(valid.replace("\"repositoryName\":\"bugs\"", "\"repositoryName\":\"\"")
                                .replace("\"fullName\":\"octo/bugs\"", "\"fullName\":\"octo/\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void projectCreationAndLeadAppointmentRulesAreEnforced() throws Exception {
        User admin = saveUser(GlobalRole.APP_ADMIN);
        User lead = saveUser(GlobalRole.USER);
        User unrelated = saveUser(GlobalRole.USER);
        User newLead = saveUser(GlobalRole.USER);
        Project project = saveProject("PRJ");
        members.save(new ProjectMember(project, lead, ProjectRole.PROJECT_LEAD));

        mvc.perform(post("/api/projects")
                        .with(as(lead)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"DENY\",\"name\":\"Denied\",\"leadUserId\":" + newLead.getId() + "}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/projects/" + project.getId() + "/members")
                        .with(as(lead)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":" + newLead.getId() + ",\"role\":\"PROJECT_LEAD\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/projects/" + project.getId() + "/members")
                        .with(as(unrelated)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":" + newLead.getId() + ",\"role\":\"REPORTER\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/projects")
                        .with(as(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"OKAY\",\"name\":\"Created\",\"leadUserId\":" + lead.getId() + "}"))
                .andExpect(status().isCreated());
    }

    private User saveUser(GlobalRole role) {
        return saveUser(uniqueEmail(), role);
    }

    private User saveUser(String email, GlobalRole role) {
        return users.save(new User(email, "Test User", encoder.encode("Long Valid Password"), role));
    }

    private Project saveProject(String key) {
        return projects.saveAndFlush(new Project(key + UUID.randomUUID().toString().substring(0, 4), key, "Test project"));
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor as(User user) {
        return authentication(new UsernamePasswordAuthenticationToken(
                new AppUserDetails(user), null, new AppUserDetails(user).getAuthorities()));
    }

    private String validCreateJson() {
        return createJson(uniqueEmail(), "Valid User", GlobalRole.USER);
    }

    private String createJson(String email, String password, GlobalRole role) {
        return "{\"email\":\"" + email + "\",\"displayName\":\"Valid User\","
                + "\"password\":\"" + password + "\",\"role\":\"" + role + "\"}";
    }

    private String uniqueEmail() {
        return "test-" + UUID.randomUUID() + "@example.com";
    }
}
