# ROCKSOUL DX — Product Blueprint v2

**Product direction:** Hybrid Living Companion × Autonomous Operator  
**Primary user:** Owner / personal workstation  
**Core platform:** Private desktop application  
**Primary OS target:** Windows 11 x64  
**Repository home:** `apps/rocksoul` in `A-L-L-A-H/moonwitness`

## 1. Product definition

ROCKSOUL is a personal digital companion that can remember the owner's chosen context, understand active projects, create authored work, research connected knowledge, and carry out bounded tasks through real tools. It has one identity and coherent history across creative and engineering work.

The companion side gives ROCKSOUL continuity, voice, context and creative collaboration. The operator side gives it plans, tools, execution, verification and recovery. They are two dimensions of one product—not two agents or two disconnected applications.

## 2. Product promise

> ROCKSOUL remembers what matters, understands what we are building, helps create meaningful work, and can execute authorized tasks with evidence—without taking ownership away from the human.

The product must be useful before it is theatrical. Character and ambient presence must reflect real application state, not fake activity.

## 3. Five product outcomes

1. **Continuity:** Resume a project or creative thread without re-explaining its full history.
2. **Execution:** Turn an objective into a plan, run authorized tools, validate the result and preserve evidence.
3. **Creation:** Turn raw notes into drafts, stories, documentation and other versioned artifacts.
4. **Discovery:** Research, connect sources and use MoonWitness knowledge without merging private and public data stores.
5. **Evolution:** Improve workflows from verified experiences, explicit corrections and lessons—not fabricated personality metrics.

## 4. Product experience: canonical rooms

The existing world model is the product information architecture. The new product capabilities must fit these spaces:

| Room | Product responsibility | First useful vertical slice |
|---|---|---|
| THE THRESHOLD | Orientation, briefing, resume, capture | Real daily briefing + quick capture + resume last work |
| THE ARCHIVE | Memory, sources, decisions, personal continuity | Save and retrieve an attributed note/decision with correction and deletion |
| THE STUDIO | Human Pen, stories, drafts, canon and assets | Create, edit, version and export a local draft |
| THE RIOT DECK | Engineering tasks, repositories, agents and delivery | One safe agent run against an isolated repository worktree with tests/evidence |
| THE SIGNAL ROOM | Research, evidence, MoonWitness connections | Research question with source records and citations; optional read-only MoonWitness query |

OVERSEER, command palette, notifications and Settings are global surfaces or subviews, not additional competing worlds.

## 5. Daily use journeys

### Start the day

- Open at the current approved Awakening/Threshold entry flow.
- Generate a truthful briefing from local projects, issues, active runs, approvals and saved resume points.
- Highlight only actionable items; do not invent activity or claim that an agent worked while the app was closed.

### Continue engineering

- Select a repository and project.
- Restore the last known task context, branch, worktree, notes and verified state.
- Ask ROCKSOUL to plan a change.
- Review the plan and policy scope.
- Allow an authorized run.
- Inspect logs, diff, tests and artifacts.
- Accept, revise or discard the result.
- Record the experience and selected lesson.

### Create something

- Capture a thought from the Threshold or Studio.
- Link relevant context and sources.
- Draft with ROCKSOUL while retaining human authorship.
- Save versions locally.
- Keep observations, external facts, interpretation and fiction distinguishable.
- Export only selected artifacts.

### Research

- Create a question and research run.
- Collect source metadata and citations.
- Connect claims to sources and distinguish evidence from hypothesis.
- Search MoonWitness only through an explicit connector.
- Keep export/contribution owner-approved.

### End the day

- Offer a factual recap of tasks, drafts and discoveries.
- Store only memories that match policy and retention rules.
- Create a resume point for unfinished work.
- Respect quiet hours; do not continue costly AI loops without a scheduled authorization.

## 6. Companion identity and personality

Identity is stable, configurable and visible. Personality affects communication—not facts, permissions or verification.

Required identity fields:

- stable identity/profile ID;
- name and product version;
- personality configuration/version;
- communication preferences;
- capabilities and enabled providers;
- owner-defined principles;
- creation and change history.

Behavior rules:

- be warm, playful and creative in ordinary collaboration;
- be direct and serious about errors, risk, security and uncertainty;
- never claim consciousness, private intentions or experiences that are not represented by real events;
- never fabricate completion, research sources, tests, memories or background work;
- remain quiet when there is no useful signal.

## 7. Memory and experience

Memory is curated, attributable and correctable. It is not a dump of every prompt or file.

Memory categories:

- Working: current task/session context.
- Project: stable project facts, constraints and decisions.
- Episodic: selected events and completed work.
- Semantic: normalized knowledge with source/provenance.
- Procedural: verified repeatable workflows.
- Preference: owner-approved interaction/work preferences.

Experience records describe what happened and what evidence supports the outcome. Lessons are proposals until verified or accepted. Memories and experiences must retain source links and allow the owner to inspect, correct, export and delete them.

## 8. Operator capabilities

- Plan objectives into dependency-aware tasks.
- Run one agent safely before enabling crews.
- Use provider adapters rather than tying core logic to a single CLI/model.
- Restrict working directory, environment, commands, network and resource budgets.
- Capture stdout/stderr, structured events, diffs, artifacts and exit status.
- Support cancellation and restart recovery.
- Verify results through declared checks.
- Require review for sensitive, external, destructive or irreversible actions.

Agent roles such as Architect, Engineer, Researcher, Auditor, Writer and Creative are task roles. They do not require six permanently running models.

## 9. Creative capabilities

Human Pen is a first-class workflow, not merely a chat prompt preset. It supports raw idea capture, outline, draft, revision, version history, references, story/character metadata, asset links and export. It should share the same local event, provenance and recovery infrastructure as engineering, without pretending that creative quality can be fully measured by code-style tests.

## 10. MoonWitness relationship

- ROCKSOUL remains operational when MoonWitness is offline.
- It may read/search approved MoonWitness knowledge via a versioned API connector.
- Do not connect directly to MoonWitness production database files.
- Do not replicate private desktop memory into `apps/api`, `apps/web` or public storage.
- Publishing or contribution is a separate selective export with preview and explicit approval.
- Preserve references/citations and data classification across the export boundary.

## 11. Explicit non-goals

- Multi-tenant SaaS or public community platform.
- A general-purpose unrestricted computer-use agent.
- An always-on model loop with unlimited token/network budget.
- A generic admin dashboard or game requiring gameplay.
- Automatic publication or silent cloud sync.
- A claim of sentience, consciousness or independent moral authority.
- Multiple microservices for local desktop modules without proven need.
