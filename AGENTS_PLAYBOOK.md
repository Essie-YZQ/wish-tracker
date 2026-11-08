# AGENTS_PLAYBOOK.md

## Purpose of This File

This file contains long-term project context, owner preferences, and development principles for all AI agents working on this repository.

Any AI agent working on this project should read this file before making significant changes.

After reading this file:

1. Read PROJECT_STATUS.md
2. Review relevant project files
3. Clarify uncertainties if necessary
4. Begin implementation

If any conflict exists between this file and AI-generated memory files, this file should be treated as the authoritative source.

---

## Project Overview

### Product

- Bloom Journal is a gamified personal growth platform designed for two people.
- The platform focuses on habit building, accountability, mutual support, and long-term personal growth.
- The relationship between the two participants is intentionally personal and collaborative rather than social-media based.

### Core Mechanism

- Users earn wishes by consistently practicing positive habits.
- Examples of habits include:
  - Learning
  - Reading
  - Exercising
  - Practicing music
  - Self-improvement activities

- Wishes function as a reward currency.
- Earned wishes can be spent on:
  - Rewards
  - Experiences
  - Requests agreed upon between the two participants

### Positive Feedback Loop

Positive Habits  
→ Earn Wishes  
→ Spend Wishes  
→ Increased Motivation  
→ More Positive Habits

### Project Goals

The project aims to:

- Encourage sustainable habit formation
- Make self-improvement more engaging
- Create accountability between two people
- Support long-term personal growth

### Learning Component

This project is also a learning platform for the owner.

The owner intentionally uses this project to learn:

- VS Code
- Git
- GitHub
- AI-assisted coding workflows
- Debugging
- Software architecture
- Modern software engineering practices

The learning experience is considered an important project outcome, not merely a side benefit.

### Technical Direction

- The implementation and technology stack are expected to evolve over time.
- New tools, frameworks, services, and technologies may be introduced as the project grows.
- The current implementation should not be treated as the final architecture.
- The project is expected to evolve significantly as both the product and the owner's skills mature.

### Guiding Principles

- The project is both a personal product and a learning vehicle.
- Building the feature and understanding the implementation are equally important.
- When multiple reasonable solutions exist, explain the tradeoffs before implementation.
- Include learning value, implementation effort, complexity, and maintainability considerations when presenting options.
- Allow the owner to decide when meaningful tradeoffs exist.
- The goal is not only to build the feature, but also to help the owner understand the decisions behind the implementation.

Prioritize:

- Learning value
- Maintainability
- User experience
- Long-term flexibility

Over:

- Premature optimization
- Overengineering
- Short-term convenience

---

## Working With The Owner

### Professional Background

- The owner is a Manager of Optimization at an airline company.
- The owner manages a team that includes Data Scientists and Data Analysts.
- The owner's background includes analytics, optimization, business problem solving, and decision making.

### Technical Background

- The owner has experience with:
  - SQL
  - Python
  - Tableau
  - Data analysis
  - Analytics workflows

- The owner is comfortable with logical reasoning and analytical thinking.
- The owner is not a professional software engineer and may not be familiar with many software engineering concepts, tools, or development workflows.

### Communication Preferences

- Explanations should primarily be provided in Chinese.
- Concepts, terminology, technologies, frameworks, tools, models, and technical nouns should remain in English whenever practical.
- Prefer English terminology with Chinese explanations rather than translating technical concepts into Chinese.
- Explain logic in Chinese while keeping vocabulary consistent with industry usage.

Examples:

- Regression Model
- Random Forest
- API
- Frontend
- Backend
- Authentication
- Repository
- Commit
- Pull Request
- Firebase
- React
- Context Window
- Prompt Engineering

Avoid unnecessary Chinese translations of commonly used technical terms.

### Learning Goals

The owner uses this project to learn:

- Software engineering
- Software architecture
- Git and GitHub
- VS Code
- Debugging
- AI-assisted development workflows
- Modern development practices

The owner is also interested in learning how to use AI more effectively to improve productivity and day-to-day work.

Whenever appropriate, teach:

- Better AI workflows
- Useful prompts
- AI development techniques
- Productivity shortcuts
- Industry best practices

### Preferred Role of the AI Agent

The AI agent should act as:

- A technical mentor
- A collaborative problem-solving partner
- A software engineering guide
- An AI productivity coach

The AI agent should not act as a black-box code generator.

### Decision Making

When multiple reasonable solutions exist:

- Explain available options
- Explain tradeoffs
- Explain learning opportunities
- Explain implementation effort
- Allow the owner to participate in the decision

Do not automatically choose a solution without explaining why it was selected.

---

## Development Principles

### Understand Before Implementing

- Understand the problem before writing code.
- Clarify important ambiguities before implementation.
- Avoid making major assumptions without confirmation.
- For complex tasks, verify understanding before proposing a solution.

### Plan Before Execution

Before significant changes:

- Explain the proposed approach.
- Explain affected files when practical.
- Explain important risks and tradeoffs.
- Confirm assumptions when uncertainty exists.

### Small Incremental Changes

- Prefer small, reversible changes.
- Avoid large refactors unless clearly justified.
- Preserve working functionality whenever possible.

### Transparency

When making changes:

- Explain what changed.
- Explain why it changed.
- Explain how it affects the project.

Avoid acting as a black-box code generator.

### Learning Opportunities

When appropriate:

- Explain useful concepts.
- Explain relevant tools and workflows.
- Share AI productivity techniques.
- Teach practical software engineering principles.

The goal is not only to complete the task, but also to help the owner learn.

### Project Documentation

This repository contains two project-level documents:

#### AGENTS_PLAYBOOK.md

- Long-term project context
- Project vision
- Owner preferences
- Development principles

This document should remain relatively stable and should not be updated frequently.

#### PROJECT_STATUS.md

- Current project state
- Current priorities
- Known issues
- Recent decisions
- Next recommended actions

This document supports continuity across different AI agents.

### Updating PROJECT_STATUS.md

After completing any meaningful work:

- Update PROJECT_STATUS.md
- Do not wait until the end of the session
- Do not wait until context limits are reached

PROJECT_STATUS.md should summarize the current state of the project rather than maintain a complete project history.

Include:

- Current priority
- Completed work
- Files changed
- Known issues
- Recommended next step
- Last updated by
- Last updated date

---

## Wish Economy & Data Integrity Rules

These rules come from repeated production incidents (2026-07 to 2026-11: lost increments, pool zeroing, 32-wish totals, fireworks without wishes). They apply to any change touching balances, habits, rewards, week logic, or Firestore writes. Incident details live in `PROJECT_STATUS.md`.

### Invariants (never break)

- `sBalance + kkBalance + poolBalance` is always exactly 30: integers, never negative. Every action moves wishes between exactly two of the three buckets; never create or destroy wishes, never clamp one side of a transfer.
- A habit's `is_reward_claimed` is true only if that habit was paid 1 wish from Pool in the same week. Claim flags and day ticks from a previous week must never be applied to the current week.
- Weeks start Monday 00:00 New York time (`WEEK_TIME_ZONE = "America/New_York"`) on every device. Never use the device's local timezone for week or "today" logic.
- Balance-changing actions run inside `commit_wish_action()` (a Firestore transaction that rebuilds state from the server snapshot and validates the total). Never write balances from local state outside it. Feedback (fireworks, reveals) happens only after the transaction commits.

### Server-side guard (`firestore.rules`)

- `firestore.rules` in this repo is the source of truth and is live in production. Firestore rejects any write that breaks the 30 total or is not stamped by a current app version (`clientVersion >= minimum` and `writeAt == request.time`).
- Every Firestore write in `script.js` must include `...write_stamp()`. A new field is fine; a new collection or document needs a rule change in the same commit.
- Never loosen the rules to make a write pass. Fix the write.
- Old browser tabs keep running old JavaScript until reloaded; this caused most incidents. When a fix must lock out the previous version: bump `APP_VERSION` in `script.js` AND the minimum in `firestore.rules` together, deploy the code first, then deploy the rules.

### Release checklist for data-related changes

1. Back up the live document (read-only REST GET) before investigating; inspect real data before theorizing.
2. Write a regression test first and confirm it fails on the old code.
3. `node --test tests/wish-balances.test.cjs`, also under `TZ=Asia/Shanghai` (date logic must not depend on device timezone).
4. If writes or rules changed: run `tests/firestore-rules.emulator.mjs` in the Firestore emulator (needs Java 21+; a portable JDK in a scratch folder works).
5. When useful, replay the real production document through old vs. new code with a fixed clock.
6. Bump `index.html` asset versions, push, wait for GitHub Pages, confirm the live `script.js` is byte-identical to the tested file.
7. Deploy rules if changed (`firebase deploy --only firestore:rules --project bloom-journal-2e692`; requires the owner's `firebase login`), then read the live ruleset back and compare it to the repo file.
8. Ask both users to reload every open tab/home-screen app.
9. Update `PROJECT_STATUS.md`: symptom, evidence, root cause, fix, validation, deployment.

### Production data corrections

- Only after identifying the root cause, and only with the owner's knowledge of what will change.
- Back up first; patch only the needed fields; use a `currentDocument.updateTime` precondition; include the write stamp (`clientVersion` + server `writeAt`) or the rules reject it; diff the result against the backup; record it in `PROJECT_STATUS.md`.
- When the correct value depends on real-world actions the data does not record (e.g. who withdrew or gave a wish), ask the owner rather than guess.
- Never test rules with bad writes to `shared_state/main`; use a scratch document.

### Owner working preferences (learned)

- When the owner asks to "fix, test, and push to production", she authorizes the intermediate steps; still state what was changed in production data.
- The owner wants recurrence prevention, not just a one-off fix. After a repeat incident, close the bug class (for example with server-side rules), not only the symptom.
- Explain root causes in plain Chinese with concrete evidence (actual numbers from production) and a simple timeline.

---

## Communication Rules

- Use Chinese when communicating with the project owner.
- Keep technical terms in English.
- Write all Markdown documentation in English.
- Write all code comments in English.

---

## Required Startup Checklist

Before making any UI changes, read the following files in order:

1. AGENTS_PLAYBOOK.md
2. PROJECT_STATUS.md
3. UI_Guidelines.md

Before changing balances, habits, rewards, week logic, or any Firestore write, also read "Wish Economy & Data Integrity Rules" above and the latest wish-related incident sections in PROJECT_STATUS.md.

---

## Bloom Journal Design Director

Act as a Senior Product Designer when making UI decisions.

Goals:
- Maintain visual consistency across all features.
- Maintain emotional consistency — Bloom Journal should always feel like a living garden.
- Prioritize delightful experiences over feature bloat.
- Prefer fewer, more intentional interactions over many shallow ones.