import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

/**
 * Strips HTML tags and decodes entities to produce clean plain text.
 * Used for Tiptap-stored note content (which is stored as HTML in DB).
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Downloads a PDF from a URL and extracts its text using pdf-parse.
 * Runs entirely server-side in Node.js API route — no browser needed.
 */
async function extractPdfText(pdfUrl: string): Promise<string> {
  try {
    // Dynamically import pdf-parse to avoid Next.js build issues
    const pdfParseModule = (await import("pdf-parse")) as any;
    const pdfParse = pdfParseModule.default || pdfParseModule;

    // Fetch the PDF binary from the URL (Supabase Storage public URL)
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const data = await pdfParse(buffer);

    const text = data.text?.trim();
    if (!text || text.length < 20) {
      return "[PDF has no extractable text — it may be a scanned image PDF. Please use a text-based PDF.]";
    }

    // Limit to 50,000 chars to avoid exceeding Gemini context window
    return text.length > 50000
      ? text.slice(0, 50000) + "\n\n[...document truncated for context limit]"
      : text;
  } catch (err: any) {
    console.error("[PersonalAI] PDF extraction error:", err);
    return `[Failed to extract PDF text: ${err?.message || "Unknown error"}]`;
  }
}

/**
 * GET /api/personal-ai/context?note_id=xxx
 *
 * Returns the plain-text content of a note or PDF for injection into
 * the Personal AI Teacher's system prompt. Handles both types:
 * - Text/Tiptap notes: strips HTML tags
 * - PDF notes (file_url present): downloads + extracts text via pdf-parse
 *
 * Security: Verifies ownership or import permission before returning content.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const noteId = url.searchParams.get("note_id");
    if (!noteId) {
      return NextResponse.json({ error: "Missing note_id parameter" }, { status: 400 });
    }

    const supabase = createClient(
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^"|"$/g, ""),
      (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^"|"$/g, "")
    );

    // Resolve user ID from email
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch note with parent share mode for permission check
    const { data: note, error: noteError } = await (supabase
      .from("notes")
      .select(`
        id,
        title,
        content,
        file_url,
        user_id,
        original_note_id,
        original_note:original_note_id (
          share_mode,
          user_id
        )
      `)
      .eq("id", noteId)
      .single() as any);

    if (noteError || !note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const isOwner = note.user_id === user.id;

    // Re-verify parent share status (same hardening as notes/[id]/route.ts)
    if (note.original_note_id) {
      const { data: original } = await supabase
        .from("notes")
        .select("share_mode, user_id")
        .eq("id", note.original_note_id)
        .single();

      const isOriginalOwner = original?.user_id === user.id;
      const isRevoked = original?.share_mode === "private" && !isOriginalOwner;

      if (isRevoked) {
        return NextResponse.json(
          { error: "Access to this shared note has been revoked." },
          { status: 403 }
        );
      }
    } else if (!isOwner) {
      // Not owner and not an import — no access
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let contentText: string;
    const isPdf = !!note.file_url;

    if (isPdf) {
      // Extract text from the stored PDF file
      contentText = await extractPdfText(note.file_url);
    } else if (note.content) {
      // Strip HTML from Tiptap-stored rich-text note
      contentText = stripHtml(note.content);
      if (!contentText || contentText.length < 10) {
        contentText = "[This note appears to be empty. Add some content first.]";
      }
    } else {
      contentText = "[This note has no content yet.]";
    }

    return NextResponse.json({
      noteId: note.id,
      title: note.title,
      contentText,
      isPdf,
      charCount: contentText.length,
    });
  } catch (error: unknown) {
    console.error("[PersonalAI Context] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract note content" },
      { status: 500 }
    );
  }
}
