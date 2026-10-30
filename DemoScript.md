# JILA - Jira Lite Secure Bug Tracker: 5-Minute Demo Script

A spoken script with screen cues for a roughly five-minute walkthrough.
Spoken lines are sized at about 550 words, leaving room for clicks and pauses.

**Before you start (rehearsal checklist):**

- [ ] MySQL is up via Docker Compose, the Spring Boot backend is running, and the Angular dev server is up at `http://localhost:4200`.
- [ ] You are logged out, so the demo starts at the login screen.
- [ ] You have created one real rehearsal project and one real rehearsal bug through the running app, and confirmed you can open, filter, comment on, and transition it. The two sample bugs in the workspace are illustrative frontend sample data only - they are not saved backend records, so never open them to demonstrate persistence, permissions, or history.
- [ ] Seeded demo accounts work (reporter / developer / project lead / admin logins from the README).
- [ ] If you plan to show the ~390px phone-width layout, verify it in rehearsal first; otherwise skip it.
- [ ] If a live flow fails during rehearsal, use the fallback note in that section. Never improvise around a broken screen as if it worked.

---

## 0:00 - 0:30 | Intro (login page on screen)

**Say:**

> "This is JILA, our Jira Lite secure bug tracker - a small Jira-like tool where a team reports bugs, assigns them, moves them through a workflow, comments, and searches them, with security treated as part of the functional requirements, not an extra. It's a three-person project: an Angular frontend, a Spring Boot REST API, and a MySQL database, all running locally from the documented setup steps. I built the frontend, so that's mostly what you'll see, with the backend enforcing the rules underneath."

## 0:30 - 1:00 | Login and security model

**Do:** Log in with a seeded demo account.

**Say:**

> "Login uses a server-side session cookie with CSRF protection on mutating requests. The project requires passwords of at least twelve characters, stored as salted hashes. Permissions come in two layers: a global administrator role, APP_ADMIN, and the per-project roles Reporter, Developer, and Project Lead. The design puts every permission decision in the backend service layer. Hiding a button in the UI is never the control; the UI only reflects what the server already decided."

## 1:00 - 1:50 | Workspace overview

**Do:** Show the main workspace. Point at the theme, the sample bugs, and the projects area. Stay on the workspace screen; do not open the sample bugs.

**Say:**

> "After login you land in the workspace, in our custom green and white design. These two bugs here are illustrative sample data we ship with the frontend so the layout is never empty - they're not real records. Real work lives in projects: a project contains its members and its bugs, and because projects are private by design, membership decides what you can reach. Everything on screen goes through one typed API client, so auth and error handling are consistent across the app."

## 1:50 - 3:00 | The bug lifecycle (real rehearsal bug)

**Do:** Open the real rehearsal bug you created before the demo. Show title, description, status, priority, severity, assignee, and version. If rehearsed and working, perform one status transition.

**Say:**

> "Here's a real bug I created earlier. The workflow is Open, In Progress, Resolved, then Closed or Reopened, and closing needs a recorded resolution. Notice the action buttons: the frontend doesn't guess what's allowed. The backend returns the allowed actions for this bug, for this user, in this state, and the UI renders exactly those - a different role sees different actions. Bugs also carry a version number for optimistic locking: if two people edit the same bug, the second save gets a conflict response, and the frontend re-fetches and shows the current state instead of overwriting."

**Fallback:** if the live action fails, say plainly that the action didn't go through or wasn't confirmed - don't guess at a cause. Show the app's actual error message, reload the bug once, and continue with a previously verified record if you have one from rehearsal.

## 3:00 - 3:40 | Search, filters, comments, history

**Do:** Return to the list, apply a status filter and a text search, then open the real bug and show its comments and history timeline.

**Say:**

> "The list filters by text, status, priority, and severity, with pagination and allow-listed server-side sorting. On the bug there's a comment thread and a history timeline showing who changed what and when. Descriptions and comments are rendered as plain text, so markup in them displays as text rather than rendering as HTML - that's the mechanism behind the XSS requirement."

## 3:40 - 4:20 | Admin area

**Do:** Open the admin users screen. Show the user list and the create-user / global-role controls. Do not show an enable/disable toggle - there isn't one.

**Say:**

> "Administrators manage users and global roles here. The admin endpoints are protected on the server, and the backend's integration tests cover the rejection cases - anonymous, non-admin, and missing or invalid CSRF token. One honest status note: there's no enable/disable control yet. The update endpoint exists, but the API responses in the checkout we verified don't expose a user's enabled state, so the screen deliberately waits until that field is integrated and verified."

## 4:20 - 5:00 | Testing and wrap-up

**Say:**

> "On quality: the frontend has fifty-five unit tests passing plus a clean production build, and my work is currently an open pull request under review. The backend test log covers workflow transitions, permission rules, and attachment authorization. Still open before we'd call it done: a full end-to-end run through the running app, a completed dependency vulnerability scan, and the GitHub integration, which needs the repo owner's setup. Our security note documents what we tested and what we didn't - we're not claiming the app is bulletproof. Thanks, happy to take questions."

---

## Notes for the presenter

- **Sample vs real data.** The two workspace sample bugs are unsaved frontend illustrations. Demo real behavior only on the rehearsal project and bug you verified before presenting.
- **If asked about the enable/disable toggle, GitHub integration, or Google sign-in:** the honest answers are "waiting on the backend response field and verification", "waiting on the repo owner's setup", and "out of scope for this demo" respectively.
- **Running long?** Trim the filters walkthrough, not the security content - security is a quarter of the marks.
- **Mobile:** only show the ~390px layout if you verified it in rehearsal. Ten seconds is enough: "the layout holds at phone width."
