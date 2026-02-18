import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";


// GET PROFILE
export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json(data);
}


// UPDATE PROFILE
export async function PUT(req: Request) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json({ success: true });
}
