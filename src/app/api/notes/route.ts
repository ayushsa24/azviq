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
    const all = url.searchParams.get("all") === "true";
    const imported = url.searchParams.get("imported") === "true";

    // Fetch notes with original share status
    let query = supabase
      .from("notes")
      .select(`
        *,
        original_note:original_note_id (
          share_mode,
          user:user_id (
            name,
            email
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (imported) {
      query = query.not("original_note_id", "is", null);
    }

    if (!all) {
      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      } else {
        query = query.is("workspace_id", null);
      }
    }

    const { data: notes, error } = await (query as any);

    if (error) throw error;

    // SECURITY REDACTION: Wipe content for any note that was revoked via original source
    const securedNotes = notes?.map((note: any) => {
      const isOriginalOwner = note.original_note?.user_id === user.id;
      
      // If access is private AND the current user is NOT the original creator
      if (note.original_note_id && !isOriginalOwner && note.original_note?.share_mode === 'private') {
        return {
          ...note,
          content: "<p>Access to this shared material has been restricted by the owner.</p>",
          is_revoked: true // Add flag to let the UI show an icon
        };
      }
      return note;
    }) || [];

    return NextResponse.json({ notes: securedNotes });
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

    // --- Subscription PDF Size Limit Check ---
    const { getSubscriptionStatus, checkPdfSizeAccess } = await import("@/lib/subscription");
    const subStatus = await getSubscriptionStatus(session.user.email);
    const sizeCheck = checkPdfSizeAccess(file.size, subStatus.tier);
    
    if (!sizeCheck.allowed) {
      return NextResponse.json({ error: sizeCheck.error }, { status: 413 });
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
