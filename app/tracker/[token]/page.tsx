import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

const TREND_LABEL: Record<string, string> = { up: '↑ Trending Up', flat: '→ Flat', down: '↓ Trending Down', insufficient: '– Insufficient data' };
const TREND_COLOR: Record<string, string> = { up: '#16a34a', flat: '#6b7280', down: '#dc2626', insufficient: '#9ca3af' };
const STATUS_LABEL: Record<string, string> = { on_pace: '🟢 On Pace', at_risk: '🟡 At Risk', off_track: '🔴 Off Track' };
const STATUS_BG: Record<string, string> = { on_pace: '#dcfce7', at_risk: '#fef9c3', off_track: '#fee2e2' };
const STATUS_COLOR: Record<string, string> = { on_pace: '#15803d', at_risk: '#92400e', off_track: '#b91c1c' };

function computeTrend(composites: number[]): 'up' | 'flat' | 'down' | 'insufficient' {
  const last3 = composites.slice(-3);
  if (last3.length < 2) return 'insufficient';
  const diff = last3[last3.length - 1] - last3[0];
  if (diff >= 30) return 'up';
  if (diff <= -30) return 'down';
  return 'flat';
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86400000);
}

function computeStatus(trend: string, a7: number, days: number | null, gap: number | null) {
  if (trend === 'down' || a7 === 0 || (days != null && days < 14 && gap != null && gap > 100)) return 'off_track';
  if (trend === 'up' && a7 >= 3) return 'on_pace';
  return 'at_risk';
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', flex: '1 1 140px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: color ?? '#111827', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default async function PublicTrackerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d7 = new Date(today); d7.setDate(d7.getDate() - 7);
  const d7str = d7.toISOString().split('T')[0];

  const [studentRes, scoresRes, assigns7Res] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select('id, name, target_score, next_test_date')
      .eq('progress_token', token)
      .maybeSingle(),
    supabaseAdmin
      .from('practice_scores')
      .select('test_date, composite')
      .not('composite', 'is', null)
      .order('test_date', { ascending: true }),
    supabaseAdmin
      .from('assignments')
      .select('assignment_date, accuracy_pct'),
  ]);

  if (!studentRes.data) notFound();
  const student = studentRes.data;

  // Filter scores and assignments to this student
  const studentId = student.id;

  const [myScoresRes, myAssigns7Res] = await Promise.all([
    supabaseAdmin
      .from('practice_scores')
      .select('test_date, composite')
      .eq('student_id', studentId)
      .not('composite', 'is', null)
      .order('test_date', { ascending: true }),
    supabaseAdmin
      .from('assignments')
      .select('assignment_date, accuracy_pct')
      .eq('student_id', studentId)
      .gte('assignment_date', d7str),
  ]);

  const scores = myScoresRes.data ?? [];
  const assigns7 = myAssigns7Res.data ?? [];

  const composites = scores.map(s => s.composite as number);
  const latest_composite = composites.length > 0 ? composites[composites.length - 1] : null;
  const best_composite = composites.length > 0 ? Math.max(...composites) : null;
  const trend = computeTrend(composites);
  const days_until_test = daysUntil(student.next_test_date);
  const score_gap = student.target_score != null && latest_composite != null
    ? student.target_score - latest_composite : null;
  const assignments_7d = assigns7.length;
  const acc7 = assigns7.filter(a => a.accuracy_pct != null).map(a => a.accuracy_pct as number);
  const avg_accuracy_7d = acc7.length > 0 ? Math.round(acc7.reduce((s, v) => s + v, 0) / acc7.length) : null;
  const status = computeStatus(trend, assignments_7d, days_until_test, score_gap);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', width: '100%', maxWidth: '520px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', padding: '24px 28px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            StudyCore · Student Tracker
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>{student.name}</div>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Status badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: STATUS_BG[status], color: STATUS_COLOR[status],
            borderRadius: '999px', padding: '6px 16px', fontSize: '14px', fontWeight: 700,
            marginBottom: '20px',
          }}>
            {STATUS_LABEL[status]}
          </div>

          {/* Score stats */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <Stat label="Current Score" value={latest_composite?.toString() ?? '–'} />
            <Stat label="Best Score" value={best_composite?.toString() ?? '–'} />
            <Stat label="Target Score" value={student.target_score?.toString() ?? '–'}
              sub={score_gap != null ? `${score_gap > 0 ? '+' : ''}${score_gap} to go` : undefined}
              color={score_gap == null ? undefined : score_gap <= 0 ? '#16a34a' : score_gap <= 100 ? '#d97706' : '#dc2626'} />
          </div>

          {/* Test date + trend row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <Stat
              label="Next Test Date"
              value={student.next_test_date ?? '–'}
              sub={days_until_test != null ? `${days_until_test} day${days_until_test !== 1 ? 's' : ''} away` : undefined}
              color={days_until_test != null && days_until_test < 14 ? '#dc2626' : undefined}
            />
            <Stat
              label="Score Trend"
              value={TREND_LABEL[trend]}
              color={TREND_COLOR[trend]}
            />
          </div>

          {/* Assignment stats */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <Stat
              label="Assignments (7d)"
              value={assignments_7d.toString()}
              color={assignments_7d === 0 ? '#dc2626' : assignments_7d < 3 ? '#d97706' : '#16a34a'}
            />
            <Stat
              label="Avg Accuracy (7d)"
              value={avg_accuracy_7d != null ? `${avg_accuracy_7d}%` : '–'}
              color={avg_accuracy_7d == null ? undefined : avg_accuracy_7d >= 80 ? '#16a34a' : avg_accuracy_7d >= 60 ? '#d97706' : '#dc2626'}
            />
          </div>

          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '16px 0 0', textAlign: 'center' }}>
            Data refreshed hourly · StudyCore SAT Prep
          </p>
        </div>
      </div>
    </div>
  );
}
