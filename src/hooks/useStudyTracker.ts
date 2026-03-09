"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

// Common activity types mapped to our database expectations
export type StudyActivityType = 'note' | 'pdf' | 'exercise' | 'revision' | 'ai_teacher' | 'personal_ai';

interface UseStudyTrackerProps {
    activityType: StudyActivityType;
    isEnabled?: boolean; // Sometimes we only want to track if a specific condition is met (e.g., actually viewing a note, not just a loading screen)
    subject?: string;
    topic?: string;
}

export function useStudyTracker({ activityType, isEnabled = true, subject, topic }: UseStudyTrackerProps) {
    const startTimeRef = useRef<Date | null>(null);
    const hasLoggedRef = useRef<boolean>(false);
    const { data: session } = useSession();

    useEffect(() => {
        // If not enabled or no session yet, do nothing.
        if (!isEnabled || !session?.user?.email) {
            return;
        }

        // Start tracking time
        startTimeRef.current = new Date();
        hasLoggedRef.current = false;

        const logSession = async () => {
            if (!startTimeRef.current || hasLoggedRef.current) return;

            const endTime = new Date();
            const durationMs = endTime.getTime() - startTimeRef.current.getTime();
            const durationMinutes = Math.max(1, Math.round(durationMs / 60000)); // Minimum 1 minute tracked for any active interaction

            // Prevent logging extremely short accidental clicks (< 10 seconds), 
            // but if they stayed longer than 10s, we give them 1 minute.
            if (durationMs < 10000) {
                return;
            }

            try {
                // Mark as logged to prevent duplicate calls during React StrictMode unmounts
                hasLoggedRef.current = true;

                await fetch('/api/study/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true, // Crucial for requests firing on unmount/navigate
                    body: JSON.stringify({
                        activity_type: activityType,
                        start_time: startTimeRef.current.toISOString(),
                        end_time: endTime.toISOString(),
                        duration_minutes: durationMinutes,
                        subject,
                        topic
                    })
                });
            } catch (error) {
                console.error(`Failed to log ${activityType} study session:`, error);
                // Reset logged state so we could theoretically try again if needed
                hasLoggedRef.current = false;
            }
        };

        // Handling browser level navigation or tab closes
        const handleBeforeUnload = () => {
            logSession();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // When the component unmounts (user leaves the page/closes the modal), log the time
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            logSession();
        };
    }, [isEnabled, activityType, session?.user?.email]);
}
