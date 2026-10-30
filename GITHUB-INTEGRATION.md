# GitHub tracking activation

JILA supports read-only GitHub App webhook tracking for commits and pull requests that
mention a JILA bug key such as `JILA-42`. It records only the reference, URL/title
metadata, event type and external author in the bug timeline. It never writes to GitHub,
downloads source or diffs, resolves bugs, or assumes an external author is a JILA user.

An `APP_ADMIN` must explicitly bind one installed repository to one JILA project through
`POST /api/admin/github/repositories`. The binding requires the owner-approved GitHub
installation ID, repository ID, owner/name and full name. Incoming payloads must match
the bound repository ID, full name and installation ID before any bug key is considered.

## Activation blockers

Activation is intentionally incomplete until the repository owner consents to install the
GitHub App, configures the App with read-only **Contents** and **Pull requests**
permissions, and provides a reachable HTTPS webhook endpoint. Configure the backend-only
`JILA_GITHUB_WEBHOOK_SECRET` secret securely; never put it in source, frontend code,
chat, logs or artifacts. No GitHub installation, token collection, public endpoint, or
historical backfill is performed by this project.

Supported webhook events are `push` and selected `pull_request` actions. Deliveries are
signature-verified over raw request bytes, deduplicated by GitHub delivery ID and
processed asynchronously after durable receipt. Failed processing is retained for safe
retry/inspection; repeated commit or pull-request references are ignored.
