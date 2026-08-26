import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface Session {
  date: string;
  tutorName: string;
  topicsCovered: string;
  wentWell: string;
  needsWork: string;
  homeworkAssigned: string;
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();

    const studentName = fd.get('studentName') as string;
    const parentEmail = fd.get('parentEmail') as string;
    const studentEmail = fd.get('studentEmail') as string;
    const weekStart = fd.get('weekStart') as string;
    const weekEnd = fd.get('weekEnd') as string;
    const currentScore = fd.get('currentScore') as string;
    const scoreChange = fd.get('scoreChange') as string;
    const targetScore = fd.get('targetScore') as string;
    const overallProgress = fd.get('overallProgress') as string;
    const gamePlanChanges = fd.get('gamePlanChanges') as string;
    const nextWeekPriorities = fd.get('nextWeekPriorities') as string;
    const conceptsMastered: string[] = JSON.parse((fd.get('conceptsMastered') as string) || '[]');
    const sessions: Session[] = JSON.parse((fd.get('sessions') as string) || '[]');
    const pdfFile = fd.get('gamePlanPDF') as File | null;

    if (!studentName || !parentEmail || !studentEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const scoreChangeColor = scoreChange?.startsWith('-') ? '#dc2626' : '#059669';

    const sessionCards = sessions.map((s: Session, i: number) => `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:18px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          Session ${i + 1}${s.date ? ' &mdash; ' + s.date : ''}${s.tutorName ? ' &nbsp;|&nbsp; Tutor: ' + s.tutorName : ''}
        </div>
        ${s.topicsCovered ? `<p style="font-size:13px;margin:0 0 10px 0"><strong>Topics Covered:</strong> ${s.topicsCovered}</p>` : ''}
        ${s.wentWell ? `
        <div style="background:#f0fdf4;border-left:3px solid #22c55e;padding:10px 12px;border-radius:0 4px 4px 0;margin-bottom:10px">
          <div style="font-size:11px;font-weight:600;color:#15803d;text-transform:uppercase;margin-bottom:4px">What Went Well</div>
          <p style="font-size:13px;color:#166534;margin:0">${s.wentWell}</p>
        </div>` : ''}
        ${s.needsWork ? `
        <div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 12px;border-radius:0 4px 4px 0;margin-bottom:10px">
          <div style="font-size:11px;font-weight:600;color:#b45309;text-transform:uppercase;margin-bottom:4px">Needs Work</div>
          <p style="font-size:13px;color:#92400e;margin:0">${s.needsWork}</p>
        </div>` : ''}
        ${s.homeworkAssigned ? `<p style="font-size:13px;margin:0"><strong>Homework Assigned:</strong> ${s.homeworkAssigned}</p>` : ''}
      </div>
    `).join('');

    const conceptPills = conceptsMastered.length > 0
      ? `<div style="margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #e5e7eb">
           <h3 style="font-size:12px;font-weight:600;color:#2563eb;margin:0 0 10px 0;text-transform:uppercase">Concepts Mastered</h3>
           <div style="display:flex;flex-wrap:wrap;gap:6px">
             ${conceptsMastered.map((c: string) =>
               `<span style="background:#dbeafe;color:#1e40af;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px;display:inline-block">${c}</span>`
             ).join('')}
           </div>
         </div>`
      : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;line-height:1.6;margin:0;padding:0;background:#f3f4f6">
  <div style="max-width:620px;margin:30px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%);padding:28px 30px;text-align:center">
      <h1 style="font-size:24px;font-weight:800;color:white;margin:0 0 4px 0;letter-spacing:-0.02em">StudyCore</h1>
      <h2 style="font-size:16px;font-weight:500;color:#bfdbfe;margin:0 0 8px 0">Weekly Progress Report</h2>
      <p style="font-size:12px;color:#93c5fd;margin:0">${weekStart} &mdash; ${weekEnd}</p>
    </div>

    <div style="padding:24px 30px">

      <!-- Student -->
      <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e5e7eb">
        <h3 style="font-size:11px;font-weight:600;color:#2563eb;margin:0 0 6px 0;text-transform:uppercase;letter-spacing:0.05em">Student</h3>
        <p style="margin:0;font-size:16px;font-weight:700;color:#111827">${studentName}</p>
      </div>

      <!-- Score -->
      <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e5e7eb">
        <h3 style="font-size:11px;font-weight:600;color:#2563eb;margin:0 0 10px 0;text-transform:uppercase;letter-spacing:0.05em">Score</h3>
        <table style="width:100%;border-collapse:collapse"><tr>
          <td style="width:33%;padding-right:6px">
            <div style="background:#f0f4ff;border:1px solid #c7d2fe;padding:12px;border-radius:6px;text-align:center">
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Current</div>
              <div style="font-size:22px;font-weight:800;color:#2563eb">${currentScore || '—'}</div>
            </div>
          </td>
          <td style="width:33%;padding:0 3px">
            <div style="background:#f0f4ff;border:1px solid #c7d2fe;padding:12px;border-radius:6px;text-align:center">
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Change</div>
              <div style="font-size:22px;font-weight:800;color:${scoreChangeColor}">${scoreChange || '—'}</div>
            </div>
          </td>
          <td style="width:33%;padding-left:6px">
            <div style="background:#f0f4ff;border:1px solid #c7d2fe;padding:12px;border-radius:6px;text-align:center">
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Target</div>
              <div style="font-size:22px;font-weight:800;color:#7c3aed">${targetScore || '—'}</div>
            </div>
          </td>
        </tr></table>
      </div>

      <!-- Sessions -->
      ${sessions.length > 0 ? `
      <div style="margin-bottom:20px;padding-bottom:4px;border-bottom:1px solid #e5e7eb">
        <h3 style="font-size:11px;font-weight:600;color:#2563eb;margin:0 0 12px 0;text-transform:uppercase;letter-spacing:0.05em">Sessions (${sessions.length})</h3>
        ${sessionCards}
      </div>` : ''}

      <!-- Concepts Mastered -->
      ${conceptPills}

      <!-- Overall Progress -->
      ${overallProgress ? `
      <div style="margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #e5e7eb">
        <h3 style="font-size:11px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">Overall Progress</h3>
        <p style="font-size:13px;margin:0;color:#374151">${overallProgress}</p>
      </div>` : ''}

      <!-- Gameplan -->
      ${gamePlanChanges ? `
      <div style="margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #e5e7eb">
        <h3 style="font-size:11px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">Gameplan Changes</h3>
        <p style="font-size:13px;margin:0;color:#374151">${gamePlanChanges}</p>
      </div>` : ''}

      <!-- Next Week -->
      ${nextWeekPriorities ? `
      <div style="margin-bottom:18px">
        <h3 style="font-size:11px;font-weight:600;color:#2563eb;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">Next Week Priorities</h3>
        <p style="font-size:13px;margin:0;color:#374151">${nextWeekPriorities}</p>
      </div>` : ''}

    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;padding:14px;font-size:11px;color:#9ca3af">
      StudyCore SAT Prep &bull; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    </div>
  </div>
</body></html>`;

    // Build attachment if a PDF was uploaded
    let attachments: { filename: string; content: Buffer }[] | undefined;
    if (pdfFile && pdfFile.size > 0) {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      attachments = [{ filename: `${studentName}-GamePlan.pdf`, content: pdfBuffer }];
    }

    await resend.emails.send({
      from: 'StudyCore Reports <noreply@studycore.net>',
      to: parentEmail,
      subject: `Weekly Report: ${studentName} — ${weekStart} to ${weekEnd}`,
      html,
      ...(attachments ? { attachments } : {}),
    });

    await resend.emails.send({
      from: 'StudyCore Reports <noreply@studycore.net>',
      to: studentEmail,
      subject: `Your Weekly Report — ${weekStart} to ${weekEnd}`,
      html,
      ...(attachments ? { attachments } : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send report error:', error);
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
  }
}
