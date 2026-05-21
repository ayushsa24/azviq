export function buildDailyReportEmail({
    childName,
    childEmail,
    date,
    totalMinutes,
    targetHours,
    activitiesSummary,
    tasksCompleted,
    todosCompleted,
    notesCreated,
    notesRevised,
    weakTopicsCompleted,
    revisionsCompleted,
}: {
    childName: string;
    childEmail: string;
    date: string;
    totalMinutes: number;
    targetHours: number | null;
    activitiesSummary: Record<string, number>;
    tasksCompleted: number;
    todosCompleted: number;
    notesCreated: number;
    notesRevised: number;
    weakTopicsCompleted: number;
    revisionsCompleted: number;
}) {
    const targetMinutes = targetHours ? targetHours * 60 : null;
    const goalMet = targetMinutes ? totalMinutes >= targetMinutes : null;

    // Filter out internal metadata keys (like __timer_state)
    const cleanActivitiesSummary = Object.fromEntries(
        Object.entries(activitiesSummary || {}).filter(([key]) => !key.startsWith("__"))
    );

    const ACTIVITY_LABELS: Record<string, string> = {
        note: "Notes",
        pdf: "PDFs",
        exercise: "Exercises",
        revision: "Revision",
        ai_teacher: "AI Chat",
        personal_ai: "AI Teacher",
        ai_chat: "AI Chat",
    };

    const ICON_MAP: Record<string, string> = {
        note: "https://img.icons8.com/m_outlined/50/252525/note.png",
        pdf: "https://img.icons8.com/m_outlined/50/252525/pdf.png",
        exercise: "https://img.icons8.com/m_outlined/50/252525/edit.png",
        revision: "https://img.icons8.com/m_outlined/50/252525/repeat.png",
        ai_teacher: "https://img.icons8.com/m_outlined/50/252525/bot.png",
        personal_ai: "https://img.icons8.com/m_outlined/50/252525/sparkles.png",
        ai_chat: "https://img.icons8.com/m_outlined/50/252525/bot.png",
    };

    const STATS_ICON_MAP = {
        tasks: "https://img.icons8.com/m_outlined/50/252525/ok.png",
        todos: "https://img.icons8.com/m_outlined/50/252525/list.png",
        notes_created: "https://img.icons8.com/m_outlined/50/252525/add-file.png",
        notes_revised: "https://img.icons8.com/m_outlined/50/252525/edit.png",
        weak_topics: "https://img.icons8.com/m_outlined/50/252525/sparkles.png",
        revisions: "https://img.icons8.com/m_outlined/50/252525/repeat.png",
    };

    const topActivity = Object.entries(cleanActivitiesSummary).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    const topActivityLabel = topActivity ? (ACTIVITY_LABELS[topActivity[0]] || topActivity[0]) : null;

    const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    const topActivityTime = topActivity ? formatTime(topActivity[1] as number) : "";

    const activityRows = ['personal_ai', 'ai_teacher', 'note', 'pdf', 'exercise', 'revision']
        .map(key => ({
            key,
            mins: cleanActivitiesSummary[key] || 0,
            label: ACTIVITY_LABELS[key] || key,
            icon: ICON_MAP[key] || "https://img.icons8.com/m_outlined/50/252525/help.png"
        }))
        // Filter out duplicates (like ai_teacher vs ai_chat) if they have the same label and 0 mins
        // Actually, let's just keep the core ones.
        .sort((a, b) => b.mins - a.mins)
        .map(item => `
            <tr>
                <td style="padding: 8px 0; font-size: 14px; color: #545454; vertical-align: middle;">
                    <img src="${item.icon}" width="18" height="18" style="display:inline-block; vertical-align: middle; margin-right:8px;" />
                    <span style="vertical-align: middle;">${item.label}</span>
                </td>
                <td style="padding: 8px 0; font-size: 14px; color: #252525; font-weight: 600; text-align: right;">${formatTime(item.mins)}</td>
            </tr>
        `).join("");

    const goalStatusColor = goalMet === null ? "#C2A27A" : goalMet ? "#22c55e" : "#ef4444";
    const goalStatusIcon = goalMet === null ? "⏱" : goalMet ? "✅" : "❌";
    
    const formattedTotal = formatTime(totalMinutes);
    const formattedTarget = targetMinutes ? formatTime(targetMinutes) : "";

    const goalStatusText = goalMet === null
        ? `Studied ${formattedTotal} today (No target set)`
        : goalMet
        ? `Goal Met! Studied ${formattedTotal} / Target ${formattedTarget}`
        : `Goal Not Met. Studied ${formattedTotal} / Target ${formattedTarget}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Daily Study Report</title>
</head>
<body style="margin:0;padding:0;background:#F5F3EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px 0; text-align:center;">
              <span style="display:inline-block;background:#252525;color:#fff;font-weight:700;font-size:18px;padding:8px 20px;border-radius:12px;letter-spacing:-0.5px;">
                Azviq
              </span>
              <h1 style="font-size:22px;font-weight:700;color:#252525;margin:16px 0 4px;">
                Daily Study Report
              </h1>
              <p style="font-size:14px;color:#7D7D7D;margin:0;">${date}</p>
            </td>
          </tr>

          <!-- Child Info Card -->
          <tr>
            <td style="background:#fff;border-radius:16px;padding:20px 24px;border:1px solid #E8E5E0;margin-bottom:16px;">
              <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7D7D7D;margin:0 0 4px;">Studying As</p>
              <p style="font-size:16px;font-weight:700;color:#252525;margin:0;">${childName}</p>
              <p style="font-size:13px;color:#7D7D7D;margin:2px 0 0;">${childEmail}</p>
            </td>
          </tr>

          <tr><td style="height:12px;"></td></tr>

          <!-- Goal Status -->
          <tr>
            <td style="background:#fff;border-radius:16px;padding:20px 24px;border:1px solid #E8E5E0;border-left:4px solid ${goalStatusColor};">
              <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7D7D7D;margin:0 0 8px;">Study Goal</p>
              <p style="font-size:20px;font-weight:800;color:${goalStatusColor};margin:0;">${goalStatusIcon} ${goalStatusText}</p>
            </td>
          </tr>

          <tr><td style="height:12px;"></td></tr>

          <!-- Stats Row -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="8">
                <tr>
                  <td width="50%" style="background:#fff;border-radius:16px;padding:16px 20px;border:1px solid #E8E5E0;vertical-align:top;text-align:center;">
                    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7D7D7D;margin:0 0 4px;text-align:center;">
                      <img src="${STATS_ICON_MAP.tasks}" width="14" height="14" style="vertical-align:middle;margin-right:4px;opacity:0.6;" />
                      <span style="vertical-align:middle;">Tasks Done</span>
                    </p>
                    <p style="font-size:28px;font-weight:800;color:#252525;margin:0;text-align:center;">${tasksCompleted}</p>
                  </td>
                  <td width="4px" style="background:transparent;"></td>
                  <td width="50%" style="background:#fff;border-radius:16px;padding:16px 20px;border:1px solid #E8E5E0;vertical-align:top;text-align:center;">
                    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7D7D7D;margin:0 0 4px;text-align:center;">
                      <img src="${STATS_ICON_MAP.todos}" width="14" height="14" style="vertical-align:middle;margin-right:4px;opacity:0.6;" />
                      <span style="vertical-align:middle;">To-Dos Done</span>
                    </p>
                    <p style="font-size:28px;font-weight:800;color:#252525;margin:0;text-align:center;">${todosCompleted}</p>
                  </td>
                </tr>
                <tr><td colspan="3" style="height:8px;"></td></tr>
                <tr>
                  <td width="50%" style="background:#fff;border-radius:16px;padding:16px 20px;border:1px solid #E8E5E0;vertical-align:top;text-align:center;">
                    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7D7D7D;margin:0 0 4px;text-align:center;">
                      <img src="${STATS_ICON_MAP.notes_created}" width="14" height="14" style="vertical-align:middle;margin-right:4px;opacity:0.6;" />
                      <span style="vertical-align:middle;">Notes Created</span>
                    </p>
                    <p style="font-size:28px;font-weight:800;color:#252525;margin:0;text-align:center;">${notesCreated}</p>
                  </td>
                  <td width="4px" style="background:transparent;"></td>
                  <td width="50%" style="background:#fff;border-radius:16px;padding:16px 20px;border:1px solid #E8E5E0;vertical-align:top;text-align:center;">
                    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7D7D7D;margin:0 0 4px;text-align:center;">
                      <img src="${STATS_ICON_MAP.notes_revised}" width="14" height="14" style="vertical-align:middle;margin-right:4px;opacity:0.6;" />
                      <span style="vertical-align:middle;">Notes Revised</span>
                    </p>
                    <p style="font-size:28px;font-weight:800;color:#252525;margin:0;text-align:center;">${notesRevised}</p>
                  </td>
                </tr>
                <tr><td colspan="3" style="height:8px;"></td></tr>
                <tr>
                  <td width="50%" style="background:#fff;border-radius:16px;padding:16px 20px;border:1px solid #E8E5E0;vertical-align:top;text-align:center;">
                    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7D7D7D;margin:0 0 4px;text-align:center;">
                      <img src="${STATS_ICON_MAP.weak_topics}" width="14" height="14" style="vertical-align:middle;margin-right:4px;opacity:0.6;" />
                      <span style="vertical-align:middle;">Weak Topics Cleared</span>
                    </p>
                    <p style="font-size:28px;font-weight:800;color:#252525;margin:0;text-align:center;">${weakTopicsCompleted}</p>
                  </td>
                  <td width="4px" style="background:transparent;"></td>
                  <td width="50%" style="background:#fff;border-radius:16px;padding:16px 20px;border:1px solid #E8E5E0;vertical-align:top;text-align:center;">
                    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7D7D7D;margin:0 0 4px;text-align:center;">
                      <img src="${STATS_ICON_MAP.revisions}" width="14" height="14" style="vertical-align:middle;margin-right:4px;opacity:0.6;" />
                      <span style="vertical-align:middle;">Revisions Completed</span>
                    </p>
                    <p style="font-size:28px;font-weight:800;color:#252525;margin:0;text-align:center;">${revisionsCompleted}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height:12px;"></td></tr>

          <!-- Activity Breakdown -->
          ${activityRows ? `
          <tr>
            <td style="background:#fff;border-radius:16px;padding:20px 24px;border:1px solid #E8E5E0;">
              <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7D7D7D;margin:0 0 12px;">Activity Breakdown</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${activityRows}
              </table>
              ${topActivityLabel ? `
              <div style="margin-top:16px;padding:12px 16px;background:#F5F3EF;border-radius:10px;">
                <p style="font-size:12px;color:#7D7D7D;margin:0 0 2px;">Most time spent on</p>
                <p style="font-size:15px;font-weight:700;color:#252525;margin:0;">${topActivityLabel} · ${topActivityTime}</p>
              </div>` : ""}
            </td>
          </tr>
          ` : ""}

          <tr><td style="height:24px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td style="text-align:center;">
              <p style="font-size:12px;color:#BABABA;margin:0;">This report was sent by Azviq · Daily Study Tracker</p>
              <p style="font-size:12px;color:#BABABA;margin:4px 0 0;">You received this as a registered family member.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
}
