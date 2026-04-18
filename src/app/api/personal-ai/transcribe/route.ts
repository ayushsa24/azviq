/**
 * POST /api/personal-ai/transcribe
 *
 * Accepts a recorded audio blob, sends it to Gemini 2.0 Flash (multimodal)
 * for precise bilingual (Hindi/English/Hinglish) transcription.
 *
 * Body: FormData { audio: Blob, noteTitle?: string }
 * Returns: { transcript: string, language: "hi" | "en" | "mixed" }
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB safety limit

export async function POST(req: Request) {
  try {
    // ── FEATURE KILL-SWITCH ───────────────────────────────────────────────
    const IS_VOICE_ENABLED = false; // Set to true to enable Gemini transcription
    if (!IS_VOICE_ENABLED) {
      return Response.json(
        { error: "Advanced Voice Mode is currently disabled." },
        { status: 503 }
      );
    }

    // ── Auth ──────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    // ── Parse FormData ────────────────────────────────────────────────────
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob | null;
    const noteTitle = (formData.get("noteTitle") as string) || "the study material";

    if (!audioBlob || audioBlob.size === 0) {
      return apiError("No audio data received", 400, "NO_AUDIO");
    }

    if (audioBlob.size > MAX_AUDIO_BYTES) {
      return apiError(
        "Audio is too long. Please keep voice messages under 2 minutes.",
        413,
        "AUDIO_TOO_LARGE"
      );
    }

    // ── Convert to base64 ─────────────────────────────────────────────────
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // Determine MIME type — Gemini supports webm, mp4, ogg, flac, wav, etc.
    const rawMime = audioBlob.type || "audio/webm";
    // Strip codec suffix (e.g., "audio/webm;codecs=opus" → "audio/webm")
    const mimeType = rawMime.split(";")[0].trim();

    // ── Call Gemini with model fallback chain ─────────────────────────────
    // Each model has its own separate free-tier quota bucket.
    // On 429 (quota exceeded), we automatically fall to the next model.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const genAI = new GoogleGenerativeAI(apiKey);

    const FALLBACK_MODELS = [
      "gemini-2.0-flash",
      "gemini-3.1-flash-lite",
      "gemini-1.5-flash-8b",
    ];

    const transcriptionPrompt = `You are a professional bilingual audio transcription engine specializing in Indian languages.

YOUR TASK: Transcribe the provided audio clip EXACTLY as spoken, word for word.

LANGUAGE RULES:
1. Auto-detect the spoken language (Hindi, English, or Hinglish/mixed)
2. Hindi speech → transcribe in proper Devanagari script (e.g., "मुझे यह समझ नहीं आया")
3. English speech → transcribe in English exactly as spoken
4. Hinglish (code-switched) → preserve the EXACT mix, do NOT translate either part
5. Preserve natural filler words (um, uh, toh, matlab, waise, like) if clearly spoken

OUTPUT FORMAT (STRICTLY FOLLOW):
- Return ONLY the raw transcript text — zero labels, prefixes, or explanations
- Do not add punctuation unless the speaker's intonation explicitly implies it
- If the audio is completely silent, noise-only, or fully incomprehensible → return exactly: [SILENT]

CONTEXT: The speaker is a student discussing topics from "${noteTitle}". Subject-specific technical vocabulary may appear — transcribe such terms accurately.`;

    let transcript = "";
    let lastError: unknown = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          { text: transcriptionPrompt },
          { inlineData: { mimeType, data: base64Audio } },
        ]);
        transcript = result.response.text().trim();
        break; // success — exit fallback loop
      } catch (err: any) {
        const is429 = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("quota");
        if (is429) {
          console.warn(`[Transcribe] ${modelName} quota exceeded, trying next model…`);
          lastError = err;
          continue;
        }
        throw err; // non-quota error — rethrow immediately
      }
    }

    if (!transcript && lastError) {
      // All models hit quota — return a graceful user-facing error
      return Response.json(
        { error: "All AI models are currently rate-limited. Please try again in a minute." },
        { status: 429 }
      );
    }

    // Handle silent / empty response
    if (!transcript || transcript === "[SILENT]") {
      return Response.json({ transcript: "", language: "unknown" });
    }

    // ── Detect language from transcript ───────────────────────────────────
    const devanagariPattern = /[\u0900-\u097F]/;
    const hasDevanagari = devanagariPattern.test(transcript);
    const devanagariCharCount = (transcript.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = transcript.replace(/\s/g, "").length;
    const devanagariRatio = totalChars > 0 ? devanagariCharCount / totalChars : 0;

    let language: "hi" | "en" | "mixed";
    if (!hasDevanagari) {
      language = "en";
    } else if (devanagariRatio > 0.7) {
      language = "hi";
    } else {
      language = "mixed"; // Hinglish — primarily use English TTS with natural flow
    }

    return Response.json({ transcript, language });
  } catch (error: unknown) {
    console.error("[Transcribe] Error:", error);
    return apiError(
      error instanceof Error ? error.message : "Transcription failed",
      500,
      "TRANSCRIPTION_ERROR"
    );
  }
}
