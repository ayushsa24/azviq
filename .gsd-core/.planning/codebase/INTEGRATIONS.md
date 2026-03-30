# Integrations

**Focus:** tech
**Researched:** 2026-03-30
**Confidence:** HIGH

## External Services & APIs

| Service | Purpose | Location | Notes |
|---------|---------|----------|-------|
| Supabase | Database / Backend | `src/lib/supabase.ts` | Uses `@supabase/supabase-js` (2.95.3). Main data store. |
| NextAuth | Authentication | `src/app/api/auth`, `src/lib/auth.ts` | Uses `next-auth` (4.24.13). User authentication wrapper. |
| OpenAI | AI Processing | `src/lib/openai.ts` | Uses `openai` (6.22.0) API for generative features. |
| Google Generative AI | AI Processing | `src/lib/api.ts` | Uses `@google/generative-ai` (0.24.1) for specific AI tasks. |
| Upstash Redis / Ratelimit | Rate Limiting | Backend APIs | Prevents abuse of endpoints and AI queries. |
| Resend | Emails | `src/lib/emailTemplates.ts` | Transactional emails and user notification delivery. |

## Internal Integrations

| Subsystem | Hook / Util | Usage |
|-----------|-------------|-------|
| AI Tracking | `src/lib/ai-tracking.ts` | Logs or monitors AI feature usage across the app. |
| Translations | `src/utils/translations.ts` | i18n support, localized strings. |

## Webhooks

*(None explicitly identified in `src/app/api` from the root scan, but typical Next.js apps often have standard webhooks for Supabase/Stripe.)*

---
*Integrations map for: Ascend_project*
*Researched: 2026-03-30*
