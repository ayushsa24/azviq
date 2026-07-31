import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


// GET PROFILE
export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: authDbUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (!authDbUser || authDbUser.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Explicitly list safe columns — never return password_hash
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, username, bio, city, mobile_no, pronouns, avatar_url, is_onboarded, is_verified, created_at, updated_at, subscription_tier, subscription_status")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 400 });
  }

  return NextResponse.json(data);
}


// UPDATE PROFILE
export async function PUT(req: Request) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: authDbUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (!authDbUser || authDbUser.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const sanitize = (str: string) => str ? str.replace(/[<>{}[\]]/g, '').trim() : str;

  // Validate avatar_url: block javascript:, data:, vbscript: and other dangerous schemes
  let safeAvatarUrl: string | null = null;
  if (body.avatar_url) {
    try {
      const parsed = new URL(body.avatar_url);
      const allowedSchemes = ["https:", "http:"];
      if (!allowedSchemes.includes(parsed.protocol)) {
        return NextResponse.json({ error: "Invalid avatar URL." }, { status: 400 });
      }
      safeAvatarUrl = body.avatar_url;
    } catch {
      return NextResponse.json({ error: "Invalid avatar URL." }, { status: 400 });
    }
  }

  // Field length limits
  if (
    (body.name && String(body.name).length > 100) ||
    (body.username && String(body.username).length > 30) ||
    (body.bio && String(body.bio).length > 500) ||
    (body.city && String(body.city).length > 100) ||
    (body.pronouns && String(body.pronouns).length > 50)
  ) {
    return NextResponse.json({ error: "Input exceeds maximum allowed length." }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      name: sanitize(body.name),
      username: body.username ? body.username.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30) : null,
      bio: sanitize(body.bio),
      city: sanitize(body.city),
      mobile_no: body.mobile_no ? body.mobile_no.replace(/[^\d+]/g, '').slice(0, 20) : null,
      pronouns: sanitize(body.pronouns),
      avatar_url: safeAvatarUrl,
      is_onboarded: true,
      updated_at: new Date(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Profile update error:", error);

    // Check for duplicate username unique constraint error
    if (error.code === "23505" && error.message.includes("users_username_key")) {
      return NextResponse.json({ error: "This username is already taken. Please try a different one." }, { status: 400 });
    }

    // Return generic message — don't leak raw DB error
    return NextResponse.json({ error: "Failed to update profile. Please try again." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
