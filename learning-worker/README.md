# AI Toolbox learning worker

Subscription-backed generation for the existing `web/` feed. Uses the same official, pinned
Codex 0.163.0 App Server / device-code connection pattern as Little Commons. It has its own
credential directory and never reads the village's credentials or changes its running simulation.
No API key or API-billing fallback is implemented. ChatGPT plan limits and account settings apply.

## Release flow

1. `Learn visually` or a repo card's `Explain visually` opens `/learn` in the existing feed.
2. Unlock the single-owner learning workspace, then choose **Connect ChatGPT**. Open the official
   OpenAI link and enter the code. Enable device sign-in in ChatGPT security settings if necessary.
3. Choose a model from the connected client's catalog. A completed generation, not catalog presence,
   proves access to that model. Ask a question about `owner/repo`; optionally choose up to six merged PRs.
4. One queued job pins the default-branch commit, reads selected source excerpts and PR patches, and
   creates five successive model-reviewed drafts: accuracy, story, interaction, phone layout, comprehension.
5. Each draft must pass source-reference, content-length and interaction-path checks. A network-blocked Chromium process also tests the generated HTML at 320, 390 and 1100px, exercises every step and scenario, and returns failures to the next review pass. The final pass must
   have no outstanding review issues. Failures preserve the draft/reviews, stop that job and never switch
   providers or silently retry it. A server restart interrupts pending work instead of repeating requests.
6. Completed lessons reopen from SQLite, retain chapter progress on the browser and export as standalone,
   offline interactive HTML. Check for newer repo commits explicitly; a new commit alone is not proof that
   a lesson is obsolete. Original lessons and their snapshots remain unchanged.

## Deploy alongside the feed

This is a separate Railway service; the Vercel frontend cannot host a persistent Codex process.
Use the **repository root** as build context with `learning-worker/Dockerfile` and
`learning-worker/railway.json` as the Railway configuration file. Do not deploy the Dockerfile from
the worker subdirectory: it also copies the shared `web/lib/lesson-contract.mjs` contract.

Mount a persistent volume at `/data`, one replica, no deployment overlap against the same volume.
The entrypoint assigns the volume to UID 10001, then drops privileges before starting the app and Codex.
Configure `DATA_DIR=/data`, `PORT=8080`, a random 32+ character `OWNER_SETUP_TOKEN`, and a separate random
32+ character `LEARNING_WORKER_TOKEN`. Neither secret belongs in Git, browser code, screenshots or logs.
The owner key unlocks the browser workspace. The service token authorizes only frontend-to-worker calls;
private endpoints additionally require the HttpOnly owner session. `/health` is the only unauthenticated read.

Set the **same service token** as `LEARNING_WORKER_TOKEN` on Vercel and the worker's HTTPS origin as
`LEARNING_WORKER_URL`. Redeploy the frontend. Neither value has a `NEXT_PUBLIC_` prefix. Browser cookies
are scoped to `/api/learning`, are Secure/HttpOnly/SameSite=Strict, and expire after 30 days. Writes through
the frontend require its exact Origin. Lock this device clears its cookie; rotate the persisted session key
offline to invalidate all sessions. Rotating the owner key affects future unlocks only.

`GITHUB_TOKEN` is optional, read-only and server-side, for authenticated GitHub rate limits or selected
private repos. Without it, GitHub access is public and subject to anonymous limits. Configure only after
confirming the desired repository access. No GitHub credentials are inherited by Codex child processes.

The Sites testing mirror can use the same server-only worker configuration, with its existing audience
preserved. Its source is separate from the portable Vercel application. This release does not move hosting.

## Local validation

Node 24+ is required by the worker's built-in SQLite. Run `npm ci`, `npm test`, and `npm run smoke:codex`
inside this directory. The smoke check uses a fresh temporary Codex home; it performs only initialization
and unauthenticated `account/read`. It neither signs in nor runs inference. In `web/`, run `npm ci`,
`npm test`, `npx tsc --noEmit`, and `npm run build`.

The worker retains at most 100 jobs, with a queue of three and one active generation. There are no
automatic deletion, retry, scheduled generation, or provider-fallback behaviors. Five passes consume five
model turns per successful lesson. Source gathering is bounded to selected files and patch excerpts;
tree truncation, missing files and excerpt truncation are recorded. It is not a whole-repo audit.

Model reviews and schema checks are not independent factual verification. Generated HTML receives
automated browser checks per pass; the fixed React renderer receives separate CUA browser QA. Chromium
runs without its OS sandbox inside the service container; only validated data enters a fixed escaped
HTML template, network requests are blocked, and its environment excludes service credentials. This
is not a hardened untrusted-code execution service. Live subscription generation and real lesson quality require
the deployed worker, an owner sign-in and completed pilot lessons. Do not describe fixture tests or an
unauthenticated handshake as a successful live generation.

References: [Codex App Server](https://learn.chatgpt.com/docs/app-server) and
[headless authentication](https://learn.chatgpt.com/docs/auth). No subscription tokens are extracted into
an API proxy; only the unmodified official client holds and refreshes them.
