/**
 * Schedules a push notification for a Todo using Upstash Workflow.
 * This is "sleep-and-wake" — it costs nothing while waiting.
 */
export async function scheduleTodoNotification({
  todoId,
  userId,
  title,
  note,
  reminderTime,
}: {
  todoId: string;
  userId: string;
  title: string;
  note?: string;
  reminderTime: string;
}): Promise<string | null> {
  const qstashToken = process.env.QSTASH_TOKEN?.trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();

  if (!qstashToken) {
    console.info("[Scheduler] QSTASH_TOKEN not set — skipping scheduling.");
    return null;
  }

  // QStash requires a real public HTTPS URL — skip gracefully for localhost
  if (appUrl.startsWith("http://localhost") || appUrl.startsWith("http://127.")) {
    console.info("[Scheduler] Skipping — QStash requires a public HTTPS URL, not localhost.");
    return null;
  }

  if (!appUrl.startsWith("https://")) {
    console.warn(`[Scheduler] Skipping — NEXT_PUBLIC_APP_URL must use https://. Got: "${appUrl}"`);
    return null;
  }

  // Clean up URL: remove trailing slashes and ensure clean path
  const targetUrl = `${appUrl.replace(/\/+$/, "")}/api/workflow/todo-reminder`;
  
  console.info(`[Scheduler] Scheduling notification for Todo: ${todoId}`);
  console.info(`[Scheduler] Target URL: "${targetUrl}"`);

  const fireAt = new Date(reminderTime).getTime();
  const now = Date.now();
  const delaySeconds = Math.max(0, Math.floor((fireAt - now) / 1000));

  // Don't schedule if time is already in the past
  if (delaySeconds <= 0) {
    console.info("[Scheduler] Reminder time is in the past, skipping.");
    return null;
  }

  // We use Upstash-Not-Before (absolute UNIX timestamp in seconds) instead of Upstash-Delay
  // This completely eliminates any timezone/clock syncing issues causing a 3-4 minute lag.
  const unixTimestamp = Math.floor(fireAt / 1000);

  // QStash v2 API: destination URL goes directly in the path
  // Format: POST https://qstash.upstash.io/v2/publish/{destination_url}
  const qstashUrl = process.env.QSTASH_URL?.trim() || "https://qstash.upstash.io";
  const response = await fetch(`${qstashUrl}/v2/publish/${targetUrl}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qstashToken}`,
      "Content-Type": "application/json",
      "Upstash-Not-Before": `${unixTimestamp}`,
      "Upstash-Retries": "3",
    },
    body: JSON.stringify({ todoId, userId, title, note }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Scheduler] Failed to schedule notification:", text);
    return null;
  }

  const data = await response.json();
  return data.messageId || null; // This is the workflow_run_id we store for cancellation
}

/**
 * Cancels a previously scheduled notification using its Upstash message ID.
 */
export async function cancelTodoNotification(workflowRunId: string): Promise<void> {
  const qstashToken = process.env.QSTASH_TOKEN;
  if (!qstashToken || !workflowRunId) return;

  await fetch(`${process.env.QSTASH_URL}/v2/messages/${workflowRunId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${qstashToken}`,
    },
  });
}
