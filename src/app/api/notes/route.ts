import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspace_id");

    let query = supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      query = query.is("workspace_id", null);
    }

    const { data: notes, error } = await query;

    if (error) throw error;

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("GET notes error:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") || "";

    // Handle Native Note Creation (JSON)
    if (contentType.includes("application/json")) {
      const { title, workspace_id, content } = await req.json();

      if (!title) {
        return NextResponse.json({ error: "Missing title" }, { status: 400 });
      }

      const { data: note, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title,
          content: content || "",
          workspace_id: workspace_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ note });
    }

    // Handle File Upload (FormData)
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;
    const workspaceId = formData.get("workspace_id") as string | null;

    if (!title || !file) {
      return NextResponse.json({ error: "Missing title or file" }, { status: 400 });
    }

    // Upload file to Supabase Storage
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}_${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("notes")
      .upload(fileName, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase Storage Error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("notes")
      .getPublicUrl(fileName);

    // Save to Database
    const { data: note, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title,
        file_url: publicUrlData.publicUrl,
        workspace_id: workspaceId || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ note });
  } catch (error) {
    console.error("POST notes error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
