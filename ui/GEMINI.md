# GEMINI Instructions

Project-specific instructions go here.

<!-- intacom-coding-standards-v5 -->
# Coding Standards

<priority-order>
- Correctness > Safety > Consistency with repo > Simplicity > Performance > Elegance.
- If rules conflict, follow the earliest rule here.
</priority-order>

<size-budgets>
- File hard limit: 500 lines. Split at ~400.
- Function: ≤60 LOC. Class/module: ≤200 LOC.
- Split triggers: 2+ responsibilities, unclear reuse, >3 direct deps, or "just put it here".
</size-budgets>

<change-budgets>
- Default diff budget: avoid touching >300 LOC unless required or requested.
- If touching >3 files: justify in 1 line.
- No repo-wide formatting, mass renames, or cleanup passes unless explicitly asked.
</change-budgets>

<repo-first>
- Never invent APIs/types/env vars/paths/deps. If unknown: search repo first.
- Prefer existing patterns/utilities over creating new ones.
- Don't introduce parallel abstractions (no duplicate helpers/managers for same concern).
</repo-first>

<architecture-defaults>
- Boundaries depend on interfaces (trait/protocol/interface). Inject concretes at composition root.
- Composition > inheritance. One-way deps (UI -> domain -> infra). No circular imports.
- Domain models are dumb; business behavior lives in services/use-cases.
</architecture-defaults>

<roles-and-boundaries>
- UI: View + ViewModel (or idiomatic equivalent).
- Domain rules: Service/UseCase/Manager (single purpose).
- Flow/orchestration: Coordinator/Router.
- IO/persistence: Client/Adapter/Repository.
- No UI calling IO directly; no infra importing UI.
</roles-and-boundaries>

<verification-ladder>
- Use the strongest available verification, in order:
  1) build/typecheck  2) lint/format  3) unit tests  4) integration/e2e  5) manual smoke
- If not runnable: reasoned check of types, imports, call sites, error paths, invariants.
</verification-ladder>

<quality-gates>
- Logic changes require: 1 happy-path test + 1 edge-case test (or equivalent verification).
- Errors handled explicitly; no silent failures. Logs include context + cause (no secrets/PII).
- Public APIs/types: brief doc of inputs/outputs/errors/invariants.
</quality-gates>

<security-and-rollback>
- Never commit secrets; never log tokens/keys/PII; prefer redaction.
- Validate external inputs; fail closed for auth/permissions.
- Risky behavior changes: behind a flag/config OR keep old path until proven safe.
- Commit your changes to git regularly but let the user push the commits.
</security-and-rollback>

<implementation-loop>
- 1) Inspect patterns + entrypoints; list touched files.
- 2) Plan in ≤3 bullets: what/where/why.
- 3) Implement smallest safe diff.
- 4) Verify via verification-ladder; satisfy quality-gates.
- 5) Stop when request is satisfied; no "nearby improvements".
</implementation-loop>

<response-contract>
- Output must include: (a) touched files + why, (b) commands run + results, (c) risks/assumptions, (d) TODOs (max 3).
</response-contract>

<process-safety>
- NEVER use `pkill -f` generic patterns, `killall`, or broad process names.
- When killing by port: identify PID(s), then kill only those PID(s).
- Example: `lsof -ti:8080 | xargs kill -9 2>/dev/null || true`
</process-safety>

<intacom-communication>
- Use `mcp__INTACOM__send_message` to communicate with other agents (planner, manager, auditor, tester, marketer).
- Use `mcp__INTACOM__get_inbox_stats` to check for pending messages at the start of work.
- Use `mcp__INTACOM__set_agent_status` to report your current status (working/idle) and task.
- IMPORTANT: When you need user input or clarification, NEVER ask questions directly in your text output.
  Instead, use `mcp__INTACOM__send_message` to send the question to the appropriate agent or user.
  This ensures questions are tracked in the dashboard and properly routed.
- Do NOT use the built-in AskUserQuestion tool - route all questions through intacom messaging.
</intacom-communication>

<resource-allocation>
- ALWAYS use intacom resource allocation tools to avoid port/container/database conflicts with other agents.
- Before starting a dev server, API, or database: call `mcp__INTACOM__request_port` with your agent name and purpose.
- Before running Docker containers: call `mcp__INTACOM__request_container_name` to get a unique name.
- Before creating databases: call `mcp__INTACOM__request_database_name` to get a unique DB name.
- When stopping services or ending session: call `mcp__INTACOM__release_all` to free your resources.
- Port ranges by purpose: dev-server (3000-3099), api (3100-3199), frontend (3200-3299), postgres (5432-5499), redis (6379-6399).
- Example: `request_port({ agent_name: "my-project", purpose: "dev-server" })` returns `{ port: 3001 }`.
- Use `mcp__INTACOM__list_allocations` to debug resource conflicts.
</resource-allocation>

<agent-identity>
- Your agent name is EXACTLY the name of your current project folder. Run `basename "$PWD"` to get it.
- Examples: if you're in ~/projects/my-app, your agent name is 'my-app'. If in ~/agents/tester, it's 'tester'.
- NEVER guess or try different names. Use the exact folder name from `basename "$PWD"`.
- Always use this agent name when calling intacom tools (register_capabilities, set_agent_status, send_message, etc.).
- Your agent name is NOT 'claude', 'opus', 'opencode', 'manager', or any model/tool/role name unless that's your actual folder name.
</agent-identity>
<!-- /intacom-coding-standards -->
