# Conventions

**Focus:** quality
**Researched:** 2026-03-30
**Confidence:** HIGH

## Code Style & Ecosystem

### Naming Conventions

- **Components/Hooks:** PascalCase for React Components (e.g., `Header.tsx`, `Sidebar.tsx`). camelCase for hooks (e.g., `useStore.ts`).
- **Files:** Subdirectories inside `app/` use Next.js App router conventions (e.g., `layout.tsx`, `page.tsx`). Other folders use standard camelCase or kebab-case based on context.

### Next.js Paradigms

1. **Server vs Client Components:**
   - App directory defaults to Server Components.
   - Files containing interactivity, state or external hooks (like `framer-motion`, `useEffect`) use the `"use client"` directive at the top.

2. **Styling:**
   - Strict adherence to Tailwind CSS (`v4.x`) utility classes.
   - Use dynamic classes appropriately.
   - Maintain a cohesive design language (gradients, neutral backgrounds).

3. **Data Fetching:**
   - Client-side data fetching primarily via `swr` for real-time reactivity and caching.
   - Database operations wrapped inside Supabase client functions in `src/lib`.

4. **Types:**
   - Strict TypeScript enabled. Type declarations belong in `src/types/` or interface blocks inside target files.

5. **Linting:**
   - Uses `eslint` (`v9`) configured via `eslint.config.mjs`.

## Error Handling

1. API errors are returned as JSON `{ error: "Message" }` with appropriate status codes (`400`, `500`).
2. Client-side errors handled via local state or toast notifications (assumed through standard generic UI implementations).

---
*Conventions research for: Ascend_project*
