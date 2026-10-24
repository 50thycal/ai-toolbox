# AI Toolbox web viewer

A feed for the public AI Toolbox catalog, GitHub Trending, and a browser-local shortlist. Includes README images with touch swipes, available GitHub facts, linked HN stories, and manually attached Reddit/X discussions.

## Repo conversations

Choose a starter question or write your own, optionally add project background, and copy the prepared prompt. Open ChatGPT and paste into your existing session. The prompt includes README content, source links, and any saved review. Follow-ups happen in ChatGPT. This app does not call an inference API or require an API key.

## Development and deployment

Use Node.js 22. Run npm ci, then npm run dev. Verify with npm test and npm run build. In Vercel, import 50thycal/ai-toolbox, root directory web, framework Next.js, production branch main. No environment variables are required. ChatGPT Sites remains a testing mirror; production has no Sites authentication or Cloudflare dependency.

## Moving browser data

Open “Move or back up my collection” on the old site and export. Import that JSON on the new site. Repos and discussion links merge with existing browser data. Each browser/device has its own collection; this is not account synchronization. The public catalog needs no migration.

## Source limits

Unauthenticated GitHub APIs may be rate-limited. Catalog loading falls back to public directory HTML and raw YAML; repo context falls back to common raw README filenames. Missing metadata is labeled. GitHub Trending HTML can change. HN discovers linked stories; Reddit/X badges count attached links, not total traffic. Caches are per server process and can be cold on new instances.

## Visual learning

The Learn tab and repo-card Explain visually links connect to a separate subscription-backed worker. See [worker setup and boundaries](../learning-worker/README.md). Existing repo-chat handoffs and browser collection backups remain available. Generation has no API-key fallback. Until the worker is deployed and configured, the Learn screen explicitly reports setup pending.
