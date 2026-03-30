# Plan: Finalize Brand Text & Meta Sync

**Phase:** 1
**Wave:** 1
**Autonomous:** true
**Requirements addressed:** REBRAND-01, REBRAND-02, REBRAND-03

## Objective

Systematically replace all remaining user-facing references to "Ascend" with "Avyx" in `src/app/(app)/ai/page.tsx`, and verify that `package.json` and root `layout.tsx` are correctly synced with the "Avyx" brand identity.

## Tasks

### 1. Update AI Page Brand Strings
- [ ] **Action**: Replace all occurrences of "Ascend AI" with "Avyx AI" and "Ascend" with "Avyx" in user-facing text (placeholders, tooltips, info text).
- [ ] **Target**: `src/app/(app)/ai/page.tsx`
- [ ] **Read first**: `src/app/(app)/ai/page.tsx`
- [ ] **Acceptance criteria**: 
  - `grep "Ascend" src/app/(app)/ai/page.tsx` returns no results.
  - `grep "Avyx" src/app/(app)/ai/page.tsx` returns the new brand names.

### 2. Verify Root Layout Metadata
- [ ] **Action**: Ensure `metadata.title` is set to "Avyx" and `metadata.description` represents the brand correctly.
- [ ] **Target**: `src/app/layout.tsx`
- [ ] **Read first**: `src/app/layout.tsx`
- [ ] **Acceptance criteria**: 
  - `metadata.title` is "Avyx".

### 3. Verify Build Consistency
- [ ] **Action**: Check `package.json` and `README.md` for any missed "Ascend" references.
- [ ] **Target**: `package.json`, `README.md`
- [ ] **Read first**: `package.json`
- [ ] **Acceptance criteria**: 
  - `package.json` `"name"` field is "avyx".

## Verification

### Automated
- `grep -r "Ascend" src/` (excluding `ascending`).

### Manual
- Inspect placeholders in the AI chat UI.
- Verify browser tab title says "Avyx".
