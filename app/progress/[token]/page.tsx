import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';

interface PracticeScore {
  id: string;
  test_date: string;
  composite: number | null;
  rw_score: number | null;
  math_score: number | null;
  craft_structure: number | null;
  expression_ideas: number | null;
  standard_english: number | null;
  information_ideas: number | null;
  algebra: number | null;
  advanced_math: number | null;
  geometry_trig: number | null;
  notes: string | null;
}

interface SentReport {
  id: string;
  week_start: string;
  week_end: string;
  sent_at: string;
  report_data: Record<string, unknown>;
}

function ScoreChart({ scores, targetScore }: { scores: PracticeScore[], targetScore: number | null }) {
  const valid = scores.filter(s => s.composite != null);
  if (valid.length === 0) return <p style={{ color: '#9ca3af', fontSize: '13px' }}>No composite scores recorded yet.</p>;

  const W = 560, H = 200, PL = 48, PR = 20, PT = 24, PB = 36;
  const cW = W - PL - PR, cH = H - PT - PB;

  const vals = valid.map(s => s.composite as number);
  const all = targetScore != null ? [...vals, targetScore] : vals;
  const rawMin = Math.min(...all), rawMax = Math.max(...all);
  const yMin = Math.max(400, Math.floor((rawMin - 40) / 100) * 100);
  const yMax = Math.min(1600, Math.ceil((rawMax + 40) / 100) * 100);
  const yRange = yMax - yMin || 100;

  const times = valid.map(s => new Date(s.test_date).getTime());
  const tMin = Math.min(...times), tMax = Math.max(...times);
  const tRange = tMax - tMin || 1;

  const toX = (d: string) => PL + ((new Date(d).getTime() - tMin) / tRange) * cW;
  const toY = (v: number) => PT + cH - ((v - yMin) / yRange) * cH;

  const pts = valid.map(s => `${toX(s.test_date)},${toY(s.composite!)}`).join(' ');

  const yLabels: number[] = [];
  for (let v = yMin; v <= yMax; v += 100) yLabels.push(v);

  const targetY = targetScore != null ? toY(targetScore) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: `${W}px`, height: 'auto', display: 'block' }}>
      {/* Grid + Y labels */}
      {yLabels.map(v => (
        <g key={v}>
          <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={PL - 4} y={toY(v) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{v}</text>
        </g>
      ))}

      {/* Target score dashed line */}
      {targetY != null && (
        <>
          <line x1={PL} y1={targetY} x2={W - PR} y2={targetY} stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x={W - PR + 2} y={targetY + 4} fontSize="9" fill="#10b981">Target</text>
        </>
      )}

      {/* Score line */}
      {valid.length > 1 && (
        <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* Dots + score labels */}
      {valid.map((s, i) => {
        const cx = toX(s.test_date), cy = toY(s.composite!);
        const isLast = i === valid.length - 1;
        return (
          <g key={s.id}>
            <circle cx={cx} cy={cy} r={isLast ? 5 : 4} fill={isLast ? '#10b981' : '#2563eb'} stroke="white" strokeWidth="2" />
            <text x={cx} y={cy - 9} textAnchor="middle" fontSize="10" fontWeight="bold" fill={isLast ? '#065f46' : '#1e40af'}>{s.composite}</text>
          </g>
        );
      })}

      {/* X axis date labels */}
      {valid.map((s, i) => (
        <text key={`xl-${i}`} x={toX(s.test_date)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
          {new Date(s.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
      ))}
    </svg>
  );
}

const DOMAINS: { key: keyof PracticeScore, label: string }[] = [
  { key: 'craft_structure', label: 'Craft & Structure' },
  { key: 'expression_ideas', label: 'Expression of Ideas' },
  { key: 'standard_english', label: 'Standard English' },
  { key: 'information_ideas', label: 'Information & Ideas' },
  { key: 'algebra', label: 'Algebra' },
  { key: 'advanced_math', label: 'Advanced Math' },
  { key: 'geometry_trig', label: 'Geometry & Trig' },
];

function DomainBars({ score }: { score: PracticeScore }) {
  const max = 800;
  return (
    <div>
      {DOMAINS.map(d => {
        const val = score[d.key] as number | null;
        const pct = val != null ? Math.round((val / max) * 100) : null;
        return (
          <div key={d.key} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: '#374151' }}>{d.label}</span>
              <span style={{ fontWeight: 600, color: '#1e40af' }}>{val ?? '—'}</span>
            </div>
            {pct != null && (
              <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, background: '#2563eb', height: '100%', borderRadius: '999px', transition: 'width 0.3s' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function ProgressPage({ params }: { params: { token: string } }) {
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, name, target_score, progress_token')
    .eq('progress_token', params.token)
    .maybeSingle();

  if (!student) notFound();

  const [{ data: scores }, { data: reports }] = await Promise.all([
    supabaseAdmin
      .from('practice_scores')
      .select('*')
      .eq('student_id', student.id)
      .order('test_date', { ascending: true }),
    supabaseAdmin
      .from('sent_reports')
      .select('id, week_start, week_end, sent_at, report_data')
      .eq('student_id', student.id)
      .order('sent_at', { ascending: false }),
  ]);

  const practiceScores: PracticeScore[] = scores || [];
  const sentReports: SentReport[] = reports || [];
  const latestScore = practiceScores.length > 0 ? practiceScores[practiceScores.length - 1] : null;

  const section = (title: string) => ({
    fontSize: '11px', fontWeight: 600, color: '#2563eb',
    textTransform: 'uppercase' as any, letterSpacing: '0.06em',
    margin: '0 0 12px 0', borderBottom: '2px solid #2563eb', paddingBottom: '6px',
  });

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: '#f3f4f6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', padding: '28px 24px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ fontSize: '13px', color: '#93c5fd', fontWeight: 500, marginBottom: '4px' }}>StudyCore</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'white', margin: '0 0 4px 0' }}>{student.name}</h1>
          {student.target_score && (
            <div style={{ fontSize: '13px', color: '#bfdbfe' }}>Target Score: <strong style={{ color: 'white' }}>{student.target_score}</strong></div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px' }}>

        {/* Score Chart */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          <h2 style={section('Score Trend')}>Score Trend</h2>
          <ScoreChart scores={practiceScores} targetScore={student.target_score} />
        </div>

        {/* Domain Breakdown */}
        {latestScore && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <h2 style={section('Domain Breakdown')}>Domain Breakdown</h2>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 14px 0' }}>
              Based on most recent test — {new Date(latestScore.test_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <DomainBars score={latestScore} />
          </div>
        )}

        {/* Score History Table */}
        {practiceScores.length > 0 && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <h2 style={section('Score History')}>Score History</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Date', 'Composite', 'R/W', 'Math', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left' as any, fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0', fontSize: '12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...practiceScores].reverse().map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      {new Date(s.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#2563eb' }}>{s.composite ?? '—'}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#374151' }}>{s.rw_score ?? '—'}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#374151' }}>{s.math_score ?? '—'}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#6b7280', fontSize: '12px' }}>{s.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Past Reports */}
        {sentReports.length > 0 && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h2 style={section('Weekly Reports')}>Weekly Reports</h2>
            <div style={{ display: 'flex', flexDirection: 'column' as any, gap: '8px' }}>
              {sentReports.map(r => {
                const rd = r.report_data as Record<string, unknown>;
                const sessions = (rd.sessions as Record<string, unknown>[] | undefined) || [];
                return (
                  <details key={r.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <summary style={{ padding: '12px 14px', cursor: 'pointer', fontWeight: 500, fontSize: '13px', background: '#f8fafc', listStyle: 'none', display: 'flex', justifyContent: 'space-between' as any, alignItems: 'center' }}>
                      <span>Week of {r.week_start} → {r.week_end}</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>
                        {new Date(r.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </summary>
                    <div style={{ padding: '16px' }}>
                      {/* Score row */}
                      {(rd.currentScore || rd.scoreChange || rd.targetScore) && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                          {[
                            { label: 'Score', val: rd.currentScore as string, color: '#2563eb' },
                            { label: 'Change', val: rd.scoreChange as string, color: (rd.scoreChange as string)?.startsWith('-') ? '#dc2626' : '#059669' },
                            { label: 'Target', val: rd.targetScore as string, color: '#7c3aed' },
                          ].map(b => b.val ? (
                            <div key={b.label} style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '8px 12px', textAlign: 'center' as any, minWidth: '70px' }}>
                              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' as any }}>{b.label}</div>
                              <div style={{ fontSize: '18px', fontWeight: 800, color: b.color }}>{b.val}</div>
                            </div>
                          ) : null)}
                        </div>
                      )}
                      {/* Sessions */}
                      {sessions.length > 0 && sessions.map((s: Record<string, unknown>, i: number) => (
                        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px 12px', marginBottom: '8px', fontSize: '13px' }}>
                          <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '6px', fontSize: '12px' }}>
                            Session {i + 1}{s.date ? ` — ${s.date}` : ''}{s.tutorName ? ` | ${s.tutorName}` : ''}
                          </div>
                          {s.topicsCovered && <p style={{ margin: '0 0 4px 0' }}><strong>Topics:</strong> {s.topicsCovered as string}</p>}
                          {s.wentWell && <p style={{ margin: '0 0 4px 0', color: '#166534' }}>✓ {s.wentWell as string}</p>}
                          {s.needsWork && <p style={{ margin: '0 0 4px 0', color: '#92400e' }}>△ {s.needsWork as string}</p>}
                          {s.homeworkAssigned && <p style={{ margin: 0, color: '#374151' }}><strong>HW:</strong> {s.homeworkAssigned as string}</p>}
                        </div>
                      ))}
                      {/* Concepts */}
                      {(rd.conceptsMastered as string[] | undefined)?.length ? (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' as any, marginBottom: '6px' }}>Concepts Mastered</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap' as any, gap: '5px' }}>
                            {(rd.conceptsMastered as string[]).map(c => (
                              <span key={c} style={{ background: '#dbeafe', color: '#1e40af', fontSize: '11px', padding: '2px 8px', borderRadius: '999px' }}>{c}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {rd.overallProgress && <p style={{ fontSize: '13px', marginTop: '10px', color: '#374151' }}><strong>Progress:</strong> {rd.overallProgress as string}</p>}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}

        {practiceScores.length === 0 && sentReports.length === 0 && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center' as any, border: '1px solid #e2e8f0', color: '#9ca3af', fontSize: '14px' }}>
            No data yet. Scores and reports will appear here as they are added.
          </div>
        )}

        <div style={{ textAlign: 'center' as any, marginTop: '24px', fontSize: '11px', color: '#9ca3af' }}>
          StudyCore SAT Prep • Progress Tracker
        </div>
      </div>
    </div>
  );
}
