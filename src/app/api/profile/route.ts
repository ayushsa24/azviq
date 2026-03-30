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

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 400 });
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

  const { error } = await supabase
    .from("users")
    .update({
      name: body.name,
      username: body.username,
      bio: body.bio,
      city: body.city,
      mobile_no: body.mobile_no,
      pronouns: body.pronouns,
      avatar_url: body.avatar_url,
      is_onboarded: true,
      updated_at: new Date(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Profile PUT update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
