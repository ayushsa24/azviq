// Migration script: Add ai_model and response_style columns to users table
// Run: npx ts-node --project tsconfig.json scripts/add-ai-settings-columns.ts

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrate() {
  console.log("Running migration: add ai_model and response_style to users...");

  // We use upsert trick to test + add defaults — actual DDL via Supabase console
  // Update all users without ai_model to get the default value
  const { error } = await supabase
    .from("users")
    .update({ ai_model: "gemini-2.5-flash", response_style: "balanced" })
    .is("ai_model", null);

  if (error) {
    console.error("Migration failed:", error.message);
    console.log("\n⚠️  You may need to add the columns first via Supabase SQL Editor:");
    console.log(`ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS ai_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS response_style TEXT NOT NULL DEFAULT 'balanced';`);
    process.exit(1);
  }

  console.log("✅ Migration complete!");
}

migrate();
