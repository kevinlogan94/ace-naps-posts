# AGENTS.md

Instructions for AI agents working in this repo.

## Before you write code

1. Read the architecture spine and solution design.
2. If they disagree, follow the spine.
3. If you change a locked decision, update both documents.

Architecture spine: `_bmad-output/planning-artifacts/architecture/architecture-ace-naps-posts-2026-07-03/ARCHITECTURE-SPINE.md`

Solution design: `docs/architecture/ace-instagram-automation-architecture.md`

## How to work

- Keep the implementation and approach simple.
- When planning a body of work, focus on how to accomplish it in the least amount of code possible.
- Keep changes small and focused.
- Match patterns already in the codebase.
- Do not add v1 scope unless the user asks for it.
- Do not guess on security or architecture — read the docs or ask.

## Secrets

Never put Instagram tokens or the Supabase service role key in frontend code or in env vars that ship to the browser.

## Ops notes

For token refresh, failed posts, and other human tasks, see `README.md`.
