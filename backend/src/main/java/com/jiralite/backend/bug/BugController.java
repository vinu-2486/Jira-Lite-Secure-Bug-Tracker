package com.jiralite.backend.bug;

import com.jiralite.backend.security.AppUserDetails;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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
}