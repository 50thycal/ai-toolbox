# Tool index

Read this compact index before opening individual entries. Search category, problem, stack, and use-case keywords. Entries are the authority for stage, limitations, and evidence.

| Tool / entry | Stage | Categories | Stack / platform | Use when | Important limitation |
| --- | --- | --- | --- | --- | --- |
| [TesterArmy e2e](catalog/testerarmy-e2e.yaml) | Reviewed | testing, browser-automation, ai-qa | TypeScript, Next.js, web, native-mobile | Verifying whole user flows; exploring a changed UI; adding PR checks | Pre-1.0; not yet validated in our apps; phone viewport is not full iPhone emulation |
| [Scientific Agent Skills](catalog/scientific-agent-skills.yaml) | Reviewed | ai-agents, developer-workflow, data-processing, research-methodology | Agent Skills hosts, Python, offline analysis | Auditing research theses, clustered experiments and bounded exports | No hands-on validation; complements existing governance; RAM/cost benefit unmeasured |
| [VoiceStudio](catalog/voicestudio.yaml) | Reviewed | audio, ai-agents, developer-workflow, integrations | Python/FastAPI, Electron, Apple Silicon, Windows, Linux, HTTP/MCP | Pilot local Build OS Radio narration; optional agent speech/transcription | Untested; separate inference host and adapter; model terms differ from application AGPL |
| [TokenSpeed](catalog/tokenspeed.yaml) | Reviewed | ai-agents, developer-workflow, deployment | Python/C++, Linux GPU, CUDA/ROCm, HTTP clients | Self-hosting supported text models when measured inference latency matters | Save for later; GPU operations required; keyboard latency and correction quality untested |

## Category vocabulary

`audio`, `testing`, `browser-automation`, `ai-qa`, `ui`, `database`, `authentication`, `deployment`, `ai-agents`, `monitoring`, `developer-workflow`, `data-processing`, `integrations`, `research-methodology`.

Add a category when a new entry requires it. Category describes purpose; stage describes confidence; project experience describes where it actually worked.
