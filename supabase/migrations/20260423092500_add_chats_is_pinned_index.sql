-- Migration: add index on public.chats(is_pinned)
--
-- Reason: Every chat history query sorts by ORDER BY is_pinned DESC, created_at DESC.
-- Without an index on is_pinned, PostgreSQL performs a full sequential scan + sort pass
-- over all of a user's chats on every /api/chat/history request.
--
-- Supabase index_advisor flagged this across three query variants (Q9, Q10, Q15)
-- with identical suggestions. Projected planner cost reduction: 17–23% per variant.
--
-- Affected route: src/app/api/chat/history/route.ts

CREATE INDEX ON public.chats USING btree (is_pinned);
