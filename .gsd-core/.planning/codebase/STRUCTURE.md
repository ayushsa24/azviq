# Project Structure

**Focus:** arch
**Researched:** 2026-03-30
**Confidence:** HIGH

## Recommended Project Structure

```
src/
├── app/               # Next.js App Router endpoints and pages
│   ├── (app)/         # Dashboard and authenticated views
│   ├── (auth)/        # Login/Register flows
│   └── api/           # Next.js API Routes (backends)
├── components/        # Reusable UI React components
│   ├── common/        # General buttons, inputs, dialogs
│   ├── dashboard/     # Dashboard specific blocks
│   ├── editor/        # Rich text editor tools
│   ├── layout/        # Header, Sidebar, Wrapper
│   └── ui/            # Granular components
├── contexts/          # React Context providers (Auth, Theme, Notification)
├── features/          # Domain-specific logic/components
│   ├── notes/         # Note taking specific feature
│   ├── tasks/         # To-Do specific feature
│   └── timer/         # Pomodoro/Timer feature
├── hooks/             # Custom React hooks (useStudyTracker, useDebounce)
├── lib/               # Shared logic and DB setup (supabase, openai, resend)
├── store/             # Global state definitions (useAppStore, useTaskStore)
├── types/             # TypeScript type definitions and interfaces
└── utils/             # Helper functions (translations.ts, logRecentActivity.ts)
```

### Structure Rationale

- **`features/`:** Grouping by domain rather than strictly by technical concern makes it easier to find all code related to "Tasks" or "Notes".
- **`components/`:** Used primarily for dumb/presentation components, or composites that are heavily reused across different domains.
- **`store/` and `contexts/`:** Separates React Context providers (Theme, Auth, Zoom) from hook-based local/global state (`useStore`, `useTaskStore`).

## Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ Data | Local state or Context updates | API calls handled in Server APIs or SWR hooks. |
| Feature ↔ Feature | Through global context | E.g. Timers and Tasks interacting via global `NotificationContext` |

---
*Structure research for: Ascend_project*
