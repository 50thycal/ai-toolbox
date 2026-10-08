# Make the catalog discoverable in new sessions

The catalog lives in one repository. A short persistent instruction tells agents when to retrieve it. Installing a discovery instruction does not preload all entries, configure credentials, or install tools.

## One-time setup by environment

| Environment | Where to put the discovery rule | Scope |
| --- | --- | --- |
| ChatGPT | Settings > Personalization > Custom Instructions | New chats where those instructions apply; public web or GitHub access is required |
| Codex local | Append to the active global instruction file under CODEX_HOME (usually ~/.codex) | Coding sessions in that environment |
| Claude Code local | Append to ~/.claude/CLAUDE.md | Projects on that environment |
| Cursor Agent | Customize > Rules > User Rules | Agent chats across projects; not every Cursor feature |
| Cloud agents / shared projects | Append to the project's active AGENTS.md or platform-specific project instruction file | Sessions that load that project's instructions |

Use the contents of [discovery-rule.md](../integrations/discovery-rule.md). Append them to existing instructions; preserve existing content. In Codex, a non-empty AGENTS.override.md takes precedence over global AGENTS.md, so update the active file rather than assuming AGENTS.md will load.

Global instruction files on a laptop do not automatically configure cloud agents or other products. For cloud sessions, commit a pointer into each selected application's project instructions or configure the service's supported persistent instruction setting. New applications should include the same pointer in their starter template.

The catalog is public at https://github.com/50thycal/ai-toolbox and can be read without sign-in through public web access or a GitHub integration that permits it. Writing requires authenticated repository access. If an environment has no remote access, use a maintained local checkout and record its commit/date. Public visibility does not remove an environment's network or connector restrictions.

## Portable repo-review workflow

The portable [Review Repo for Toolbox skill](../skills/review-repo-for-toolbox/SKILL.md) contains the same review workflow initially installed in Calvin's ChatGPT skills. It can be read as instructions by another AI environment; its presence in this repository does not install or activate it in another product.

The discovery rule now points to that workflow when a repository review is requested. If you previously copied the rule into persistent instructions, append the new review paragraph from [discovery-rule.md](../integrations/discovery-rule.md). Existing pasted instructions do not automatically update when this repository changes.

For Claude chats, add the review pointer to the account or project's persistent instructions. For Claude Code, add it to the active CLAUDE.md. The agent must be able to read the workflow and project sources; saving also requires authenticated GitHub write access. Without write access, it should return an explicitly unsaved draft.

Keep workflow changes consistent between the installed ChatGPT skill and this portable copy; editing one does not automatically update the other. This repository contains no automatic cross-product installation or synchronization.

## Retrieval behavior

The agent sees the short discovery rule as ordinary persistent context. When a task matches, it reads INDEX.md and then relevant records. Examples: adding app regression tests should find TesterArmy e2e; correcting one label generally should not trigger catalog retrieval. A Reviewed entry supports consideration, not a claim that we already validated it.

This guides agent behavior; it is not a guarantee that every model will follow every instruction. Test each environment once with a fresh session and a relevant task.

## Verification checklist

1. Confirm the startup instructions include the discovery rule.
2. Confirm the agent can read the catalog through its configured GitHub access or local checkout.
3. Start a fresh session about adding web-app user-flow tests. Check that it consults the catalog and reads e2e's Reviewed evidence.
4. Confirm it does not claim the proposed Movie Time pilot has run.
5. Check an unrelated task to ensure it does not retrieve the catalog unnecessarily.

## Integration status

All rows are **not configured or verified** in this starter. No ChatGPT settings, laptop instruction files, Cursor settings, or other application repositories have been changed.

## Official references reviewed 2026-10-07

- https://learn.chatgpt.com/docs/agent-configuration/agents-md
- https://learn.chatgpt.com/docs/prompting
- https://code.claude.com/docs/en/memory
- https://cursor.com/docs/rules
