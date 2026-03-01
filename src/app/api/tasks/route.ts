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
    const projectId = url.searchParams.get("project_id");

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
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

    const {
      title,
      project_id,
      status,
      start_date,
      due_date,
      linked_document_id,
      linked_document_type,
      description
    } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const insertData: any = {
      user_id: user.id,
      title,
      status: status || "not_started",
    };

    if (project_id) insertData.project_id = project_id;
    if (start_date) insertData.start_date = start_date;
    if (due_date) insertData.due_date = due_date;
    if (linked_document_id) insertData.linked_document_id = linked_document_id;
    if (linked_document_type) insertData.linked_document_type = linked_document_type;
    if (description) insertData.description = description;

    const { data: task, error } = await supabase
      .from("tasks")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task });
  } catch (error) {
    console.error("POST tasks error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
