# Concerns & Issues

**Focus:** concerns
**Researched:** 2026-03-30
**Confidence:** HIGH

## Technical Debt

### Missing Automated Tests

**Observation:** There are zero automated tests set up in the project (no Jest, React Testing Library, or E2E tools).
**Risk:** High probability of regressions as more components share the `store/` logic and `contexts/`.
**Action:** Implement `vitest` immediately to test pure JS helper functions (`utils/`, `lib/`) and `react-testing-library` for the core UI elements.

### Heavy Reliance on React Context

**Observation:** Eight separate contexts (`contexts/`) and multiple hooks mapping to standard state in `store/`.
**Risk:** Passing large objects causing cascading component re-renders if a top-level provider state changes frequently (like Timers or Notifications).
**Action:** Investigate refactoring frequent updates (timers/real-time state) away from React Context, perhaps moving fully to Zustand or localized component states.

### Mixed Feature Logic

**Observation:** The folder `features/` isolates domains nicely (Notes, Tasks, Timer), but `components/` also has domain-specific subfolders (e.g. `notes`, `dashboard`, `tasks`).
**Risk:** Duplicate UI code. It may be hard to discern what belongs in `features/tasks` vs `components/tasks`.
**Action:** Enforce a strict boundary. Put pure visual dumb components in `components/`, and smart/data-bound elements into `features/`.

## Fragile Areas

1. **Rich Text Formatting (`@tiptap`):** Custom implementations of rich text formats can be difficult to serialize and restore perfectly to the database. Needs strict content-type validation.
2. **Third-Party Rate Limits (`upstash` & `openai`):** Managing user exhaustion of AI tools. Handle limits gracefully in the UI.

---
*Concerns map for: Ascend_project*
