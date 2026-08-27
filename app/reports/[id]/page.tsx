import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Session {
  date: string;
  tutorName: string;
  topicsCovered: string;
  wentWell: string;
  needsWork: string;
  homeworkAssigned: string;
}

interface ReportData {
  studentName: string;
  weekStart: string;
  weekEnd: string;
  currentScore: string;
  scoreChange: string;
  targetScore: string;
  conceptsMastered: string[];
  sessions: Session[];
  overallProgress: string;
  gamePlanChanges: string;
  nextWeekPriorities: string;
}

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const { data: report, error } = await supabaseAdmin
    .from('sent_reports')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !report) notFound();

  const d: ReportData = report.report_data;
  const scoreChangeColor = d.scoreChange?.startsWith('-') ? '#dc2626' : '#059669';

  const field = (label: string, value: string) =>
    value ? (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' as any, letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
        <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>{value}</p>
      </div>
    ) : null;

  return (
    <div style={{ padding: '24px', maxWidth: '720px', margin: '0 auto' }}>
      <Link href="/reports" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px' }}>← Back to Reports</Link>

      <div style={{ marginTop: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', padding: '24px', textAlign: 'center' as any }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>StudyCore</div>
          <div style={{ fontSize: '14px', color: '#bfdbfe', marginBottom: '6px' }}>Weekly Progress Report</div>
          <div style={{ fontSize: '12px', color: '#93c5fd' }}>{d.weekStart} — {d.weekEnd}</div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Student */}
          <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' as any, marginBottom: '4px' }}>Student</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{d.studentName}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Sent {new Date(report.sent_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>

          {/* Score */}
          <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' as any, marginBottom: '10px' }}>Score</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { label: 'Current', value: d.currentScore || '—', color: '#2563eb' },
                { label: 'Change', value: d.scoreChange || '—', color: scoreChangeColor },
                { label: 'Target', value: d.targetScore || '—', color: '#7c3aed' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '12px', textAlign: 'center' as any }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' as any, marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions */}
          {d.sessions?.length > 0 && (
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' as any, marginBottom: '12px' }}>Sessions ({d.sessions.length})</div>
              {d.sessions.map((s, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' as any, marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Session {i + 1}{s.date ? ` — ${s.date}` : ''}{s.tutorName ? ` | Tutor: ${s.tutorName}` : ''}
                  </div>
                  {s.topicsCovered && <p style={{ fontSize: '13px', margin: '0 0 8px 0' }}><strong>Topics:</strong> {s.topicsCovered}</p>}
                  {s.wentWell && (
                    <div style={{ background: '#f0fdf4', borderLeft: '3px solid #22c55e', padding: '8px 10px', borderRadius: '0 4px 4px 0', marginBottom: '8px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#15803d', textTransform: 'uppercase' as any, marginBottom: '3px' }}>What Went Well</div>
                      <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>{s.wentWell}</p>
                    </div>
                  )}
                  {s.needsWork && (
                    <div style={{ background: '#fffbeb', borderLeft: '3px solid #f59e0b', padding: '8px 10px', borderRadius: '0 4px 4px 0', marginBottom: '8px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#b45309', textTransform: 'uppercase' as any, marginBottom: '3px' }}>Needs Work</div>
                      <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>{s.needsWork}</p>
                    </div>
                  )}
                  {s.homeworkAssigned && <p style={{ fontSize: '13px', margin: 0 }}><strong>Homework:</strong> {s.homeworkAssigned}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Concepts */}
          {d.conceptsMastered?.length > 0 && (
            <div style={{ marginBottom: '18px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' as any, marginBottom: '8px' }}>Concepts Mastered</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as any, gap: '6px' }}>
                {d.conceptsMastered.map(c => (
                  <span key={c} style={{ background: '#dbeafe', color: '#1e40af', fontSize: '12px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px' }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {field('Overall Progress', d.overallProgress)}
          {field('Gameplan Changes', d.gamePlanChanges)}
          {field('Next Week Priorities', d.nextWeekPriorities)}
        </div>
      </div>
    </div>
  );
}
