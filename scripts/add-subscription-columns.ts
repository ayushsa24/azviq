/**
 * Database Migration: Add subscription columns to users table.
 * Run this script ONCE to prepare Supabase for the subscription system.
 *
 * Usage: npx ts-node --project tsconfig.json scripts/add-subscription-columns.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // needs service role key for DDL
);

async function migrate() {
  console.log("🔧 Running subscription columns migration...");

  // Check if columns already exist
  const { data: cols } = await supabase
    .from("users")
    .select("plan_tier")
    .limit(1);

  if (cols !== null) {
    console.log("✅ Columns already exist. Migration skipped.");
    return;
  }

  console.log("⚠️  Note: Column DDL requires running via Supabase Dashboard SQL Editor.");
  console.log("Copy and run the following SQL in your Supabase project:");
  console.log(`
-- Add subscription columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan_tier        INTEGER          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_expiry      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id   TEXT;

-- Add index for fast plan lookups
CREATE INDEX IF NOT EXISTS idx_users_plan_tier ON public.users(plan_tier);
CREATE INDEX IF NOT EXISTS idx_users_plan_expiry ON public.users(plan_expiry);

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('plan_tier', 'plan_expiry', 'razorpay_payment_id', 'razorpay_order_id');
  `);
}

migrate().catch(console.error);
