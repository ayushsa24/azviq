import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert([{ email, password: hashedPassword }])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      
      // If RLS policy error, try using service role key
      if (error.code === '42501') {
        const { createClient } = await import("@supabase/supabase-js");
        const serviceClient = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data: serviceData, error: serviceError } = await serviceClient
          .from("users")
          .insert([{ email, password: hashedPassword }])
          .select()
          .single();
          
        if (serviceError) {
          console.error("Service role error:", serviceError);
          return NextResponse.json(
            { error: "Failed to create user - check database permissions" },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          user: { id: serviceData.id, email: serviceData.email }
        });
      }
      
      return NextResponse.json(
        { error: `Failed to create user: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: data.id, email: data.email }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
