# Roadmap: Avyx Rebranding

## Overview

The goal of this roadmap is to finalize the transition from the legacy "Ascend" brand name to the new "Avyx" brand. Most major components have already been updated, but several UI strings and meta-references still exist. We will systematically find and replace these remaining items and perform a final visual audit of the brand identity.

## Phases

- [ ] **Phase 1: Brand Cleanup & Meta Sync** - Replace remaining text references and update meta tags.
- [ ] **Phase 2: Visual Audit & Assets** - Verify logos and secondary branding assets are consistent.

## Phase Details

### Phase 1: Brand Cleanup & Meta Sync
**Goal**: Remove all remaining "Ascend" text and ensure meta-data matches "Avyx".
**Depends on**: Nothing
**Requirements**: REBRAND-01, REBRAND-02, REBRAND-03
**Success Criteria**:
  1. No instances of "Ascend" (as a brand) remain in the `src/` directory.
  2. `package.json` and `src/app/layout.tsx` fully reflect "Avyx".
**Plans**: 1 plan

Plans:
- [ ] 01-01: Replace brand strings in `ai/page.tsx` and verify layout meta.

### Phase 2: Visual Audit & Assets
**Goal**: Final check of the brand UI/UX.
**Depends on**: Phase 1
**Requirements**: REBRAND-04, STYLE-01
**Success Criteria**:
  1. All logos in `public/` are correctly named and displayed.
  2. Colors and fonts feel consistent with the "Avyx" identity.
**Plans**: 1 plan

Plans:
- [ ] 02-01: Audit public assets and perform visual UX check.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Cleanup | 1/1 | Complete | 2026-03-30 |
| 2. Audit | 1/1 | Complete | 2026-03-30 |
