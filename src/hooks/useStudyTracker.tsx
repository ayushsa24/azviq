"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";

interface StudyTrackerProps {
  activityType: "note" | "task" | "video" | "flashcard";
  isEnabled?: boolean;
  subject?: string;
  topic?: string;
}

export function useStudyTracker({ activityType, isEnabled = true, subject, topic }: StudyTrackerProps) {
  const { data: session } = useSession();

  useEffect(() => {
    if (!isEnabled || !session?.user?.email) return;

    let startTime = Date.now();
    let isActive = true;

    // Optional: Log simple start event
    // console.log(`Started tracking ${activityType}: ${topic}`);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isActive = false;
        // logic to temporarily pause tracking can go here
      } else {
        isActive = true;
        startTime = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (isActive) {
        const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
        // Assuming there is a `study_sessions` table to track this in supabase
        // This is a simplified fallback to prevent the editor from breaking.
        if (durationSeconds > 10) {
           console.log(`Tracked ${durationSeconds} seconds of ${activityType}`);
        }
      }
    };
  }, [isEnabled, session, activityType, subject, topic]);
}
