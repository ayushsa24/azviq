# Phase 1: Brand Cleanup & Meta Sync - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Source:** Orchestrator (Manual Project Intent)

<domain>
## Phase Boundary

This phase delivers a consistent brand identity by removing "Ascend" from the User Interface and ensuring all metadata (package name, root layout titles, meta tags) identifies the application as "Avyx".

</domain>

<decisions>
## Implementation Decisions

### Brand Identity
- [LOCKED] Final brand name is **Avyx**.
- [LOCKED] Replace "Ascend AI" with "Avyx AI".
- [LOCKED] Replace "Ascend" with "Avyx" in all UI placeholders and informational text.

### Technical Metadata
- [LOCKED] `package.json` must have `"name": "avyx"`.
- [LOCKED] Root `src/app/layout.tsx` must define Metadata `title` as "Avyx".

### Assets
- [LOCKED] Logos already exist as `/davyx_logo.png` and `/lavyx_logo.png`. Verify usage in Header/Sidebar.

### the agent's Discretion
- Code identifiers (variable names, functions) that use "ascend" or "ascending" for sorting logic (Supabase queries) MUST NOT be changed to "avyx". Only user-facing text and brand identifiers.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Brand
- `src/app/layout.tsx` — Root metadata source
- `src/components/layout/Header.tsx` — Main UI brand placement
- `src/components/layout/Sidebar.tsx` — Sidebar brand placement
- `src/app/(app)/ai/page.tsx` — Known "Ascend AI" string occurrences

</canonical_refs>

<specifics>
## Specific Ideas

- Check for any hardcoded "Ascend" strings in auth pages (login/signup) if they exist.

</specifics>

<deferred>
## Deferred Ideas

- Database schema internal name changes.
- Email domain changes.

</deferred>

---

*Phase: 01-brand-cleanup*
*Context gathered: 2026-03-30 via Orchestrator*
