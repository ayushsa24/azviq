# Avyx (formerly Ascend)

## What This Is

Avyx is a premium, AI-driven productivity dashboard and study assistant. It helps users manage tasks, take detailed notes with rich text (TipTap), and use AI-powered features for summarization and study tracking.

## Core Value

Empower students and professionals with a seamless, high-performance workspace that integrates AI into every step of the productivity lifecycle.

## Requirements

### Validated

- ✓ **AUTH-01**: User authentication via NextAuth and Supabase — existing
- ✓ **NOTE-01**: Rich-text note taking with Markdown support (TipTap) — existing
- ✓ **TASK-01**: Task management with local and database sync — existing
- ✓ **UI-01**: Modern glassmorphism dashboard layout with Sidebar/Header — existing
- ✓ **AI-01**: Integration with OpenAI and Gemini for generative tasks — existing

### Active

- [ ] **BRAND-01**: Rename project from "Ascend" to "Avyx" across all UI strings
- [ ] **BRAND-02**: Update `package.json` and meta information to "Avyx"
- [ ] **BRAND-03**: Identify and update brand assets (logos, favicons) to reflect Avyx identity

### Out of Scope

- Core feature redesign — Focus is strictly on re-branding first.

## Context

The project is a Next.js 16 app using Tailwind CSS 4. It has a complex feature set including notes, tasks, and a study tracker. The user wants to pivot the brand identity to "Avyx" to feel more modern and streamlined.

## Constraints

- **Tech Stack**: Next.js 16, React 19, Tailwind CSS 4, Supabase.
- **Timeline**: Immediate re-brand for Milestone 1.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pivot to Avyx | User preference for a more modern-sounding brand name | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*
