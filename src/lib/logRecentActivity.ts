/**
 * Logs a recent activity event to the dashboard.
 * Call this whenever the user opens a note, PDF, exercise, or revision.
 */
export async function logRecentActivity(params: {
    item_id: string;
    item_type: "note" | "pdf" | "exercise" | "revision";
    title: string;
    href: string;
}) {
    try {
        await fetch("/api/recent-activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
        });
    } catch (err) {
        // Silently fail — logging activity should never block the user
        console.error("Failed to log recent activity:", err);
    }
}
