package com.jiralite.backend.bug;

import com.jiralite.backend.security.AppUserDetails;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/bugs")
public class BugController {

    private final BugService bugService;

    public BugController(BugService bugService) {
        this.bugService = bugService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BugResponse createBug(
            @PathVariable Long projectId,
            @Valid @RequestBody CreateBugRequest request,
            @AuthenticationPrincipal AppUserDetails actor
    ) {
        return bugService.createBug(
                projectId,
                actor.getId(),
                request
        );
    }

    @GetMapping
    public List<BugResponse> listBugs(
            @PathVariable Long projectId,
            @RequestParam(required = false) String text,
            @RequestParam(required = false) BugStatus status,
            @RequestParam(required = false) BugPriority priority,
            @RequestParam(required = false) BugSeverity severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @AuthenticationPrincipal AppUserDetails actor
    ) {
        return bugService.listBugs(projectId, actor.getId(), text, status, priority, severity,
                page, size, sort, direction);
    }

    @GetMapping("/{bugId}")
    public BugDetailResponse getBug(@PathVariable Long projectId, @PathVariable Long bugId,
                                    @AuthenticationPrincipal AppUserDetails actor) {
        return bugService.getBug(projectId, bugId, actor.getId());
    }

    @PatchMapping("/{bugId}")
    public BugResponse updateBug(@PathVariable Long projectId, @PathVariable Long bugId,
                                 @Valid @RequestBody UpdateBugRequest request,
                                 @AuthenticationPrincipal AppUserDetails actor) {
        return bugService.updateBug(projectId, bugId, actor.getId(), request);
    }

    @PutMapping("/{bugId}/assignee")
    public BugResponse assignBug(@PathVariable Long projectId, @PathVariable Long bugId,
                                 @Valid @RequestBody AssignBugRequest request,
                                 @AuthenticationPrincipal AppUserDetails actor) {
        return bugService.assignBug(projectId, bugId, actor.getId(), request);
    }

    @PostMapping("/{bugId}/transitions")
    public BugResponse transition(@PathVariable Long projectId, @PathVariable Long bugId,
                                  @Valid @RequestBody TransitionBugRequest request,
                                  @AuthenticationPrincipal AppUserDetails actor) {
        return bugService.transition(projectId, bugId, actor.getId(), request);
    }

    @PostMapping("/{bugId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(@PathVariable Long projectId, @PathVariable Long bugId,
                                      @Valid @RequestBody AddCommentRequest request,
                                      @AuthenticationPrincipal AppUserDetails actor) {
        return bugService.addComment(projectId, bugId, actor.getId(), request);
    }

    @GetMapping("/{bugId}/comments")
    public List<CommentResponse> comments(@PathVariable Long projectId, @PathVariable Long bugId,
                                          @AuthenticationPrincipal AppUserDetails actor) {
        return bugService.comments(projectId, bugId, actor.getId());
    }

    @GetMapping("/{bugId}/history")
    public List<HistoryResponse> history(@PathVariable Long projectId, @PathVariable Long bugId,
                                         @AuthenticationPrincipal AppUserDetails actor) {
        return bugService.history(projectId, bugId, actor.getId());
    }
}