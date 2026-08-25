import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.studentName || !data.parentEmail || !data.studentEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const scoreChangeColor = data.scoreChange?.startsWith('-') ? '#dc2626' : '#059669';
    const conceptsList = data.conceptsMastered?.length > 0
      ? `<div style="margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #e5e7eb">
           <h3 style="font-size:12px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase">Concepts Mastered</h3>
           <ul style="margin:0;padding-left:16px;font-size:13px">${data.conceptsMastered.map((c: string) => `<li style="margin-bottom:3px">${c}</li>`).join('')}</ul>
         </div>` : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;line-height:1.6;margin:0;padding:0">
      <div style="max-width:600px;margin:0 auto;padding:30px">
        <div style="text-align:center;margin-bottom:25px;border-bottom:2px solid #e5e7eb;padding-bottom:20px">
          <h1 style="font-size:22px;font-weight:700;color:#2563eb;margin:0 0 3px 0">StudyCore</h1>
          <h2 style="font-size:18px;font-weight:600;margin:0 0 12px 0;color:#1f2937">Weekly Progress Report</h2>
          <p style="font-size:12px;color:#6b7280;margin:0">Week of ${data.weekStart} to ${data.weekEnd}</p>
        </div>
        <div style="margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #e5e7eb">
          <h3 style="font-size:12px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase">Student</h3>
          <p style="margin:0;font-size:13px"><strong>${data.studentName}</strong></p>
          <p style="font-size:12px;color:#6b7280;margin:3px 0 0 0">Tutor: ${data.tutorName || 'N/A'}</p>
        </div>
        <div style="margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #e5e7eb">
          <h3 style="font-size:12px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase">Score</h3>
          <table style="width:100%;border-collapse:collapse"><tr>
            <td style="width:50%;padding-right:10px"><div style="background:#f9fafb;padding:10px;border-radius:3px"><div style="font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:3px">Current</div><div style="font-size:18px;font-weight:700;color:#2563eb">${data.currentScore || '—'}</div></div></td>
            <td style="width:50%;padding-left:10px"><div style="background:#f9fafb;padding:10px;border-radius:3px"><div style="font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:3px">Change</div><div style="font-size:18px;font-weight:700;color:${scoreChangeColor}">${data.scoreChange || '—'}</div></div></td>
          </tr></table>
        </div>
        <div style="margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #e5e7eb">
          <h3 style="font-size:12px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase">Engagement</h3>
          <p style="font-size:13px;margin:0 0 4px 0">Sessions attended: <strong>${data.sessionsAttended}</strong></p>
          <p style="font-size:13px;margin:0 0 4px 0">Attendance: <strong>${data.attendance}</strong></p>
          <p style="font-size:13px;margin:0">Homework: <strong>${data.homework}</strong></p>
        </div>
        ${conceptsList}
        <div style="margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #e5e7eb">
          <h3 style="font-size:12px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase">Tutor Feedback</h3>
          <p style="font-size:13px;margin:0">${data.tutorComment || 'No feedback provided'}</p>
        </div>
        <div style="margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #e5e7eb">
          <h3 style="font-size:12px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase">Gameplan</h3>
          <p style="font-size:13px;margin:0">${data.gamePlanChanges || 'No changes'}</p>
        </div>
        <div style="margin-bottom:18px;padding-bottom:15px">
          <h3 style="font-size:12px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase">Next Week</h3>
          <p style="font-size:13px;margin:0">${data.nextWeekPriorities || 'No priorities set'}</p>
        </div>
        <div style="text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px">
          StudyCore SAT Prep • ${new Date().toLocaleDateString()}
        </div>
      </div>
    </body></html>`;

    await resend.emails.send({
      from: 'StudyCore Reports <noreply@studycore.net>',
      to: data.parentEmail,
      subject: `Weekly Report: ${data.studentName} — ${data.weekStart}`,
      html,
    });

    await resend.emails.send({
      from: 'StudyCore Reports <noreply@studycore.net>',
      to: data.studentEmail,
      subject: `Your Weekly Report — ${data.weekStart}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send report error:', error);
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
  }
}
