import { supabaseAdmin } from './supabase';

export interface TrackerStudent {
  id: string;
  name: string;
  progress_token: string;
  target_score: number | null;
  next_test_date: string | null;
  // computed
  latest_composite: number | null;
  best_composite: number | null;
  score_diff: number | null;        // latest full test − first full test (null if <1 test)
  score_count: number;              // number of full tests on record
  days_until_test: number | null;
  score_gap: number | null;
  trend: 'up' | 'flat' | 'down' | 'insufficient';
  assignments_7d: number;
  assignments_14d: number;
  assignments_30d: number;
  avg_accuracy_14d: number | null;
  status: 'on_pace' | 'at_risk' | 'off_track';
}

function deriveTrend(score_diff: number | null, score_count: number): TrackerStudent['trend'] {
  if (score_count < 2 || score_diff === null) return 'insufficient';
  if (score_diff >= 30) return 'up';
  if (score_diff <= -30) return 'down';
  return 'flat';
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function computeStatus(
  score_diff: number | null,
  score_count: number,
  assignments_14d: number,
  avg_accuracy_14d: number | null,
  days_until_test: number | null,
  score_gap: number | null,
): TrackerStudent['status'] {
  // ── OFF TRACK: any single condition triggers it ────────────────────────────
  if (score_diff !== null && score_diff <= -30) return 'off_track';
  if (avg_accuracy_14d !== null && avg_accuracy_14d < 45) return 'off_track';
  if (days_until_test !== null && days_until_test <= 14 && score_gap !== null && score_gap > 150) return 'off_track';

  // ── ON PACE: score trending up ≥30pts — accuracy is not a gating requirement ──
  if (score_diff !== null && score_diff >= 30) return 'on_pace';

  // ── AT RISK: everything else ───────────────────────────────────────────────
  // Includes: 0 assignments in 14d, <2 full tests, flat/small score gain, low homework
  return 'at_risk';
}

export async function fetchTrackerData(): Promise<TrackerStudent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d7  = new Date(today); d7.setDate(d7.getDate() - 7);
  const d14 = new Date(today); d14.setDate(d14.getDate() - 14);
  const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
  const d7str  = d7.toISOString().split('T')[0];
  const d14str = d14.toISOString().split('T')[0];
  const d30str = d30.toISOString().split('T')[0];

  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select('id, name, progress_token, target_score, next_test_date')
    .order('name');

  if (sErr || !students) return [];

  // Full-test scores only: both rw_score and math_score must be present.
  // Section-only imports (e.g. RW=720, math=null, composite=720) corrupt
  // trend calculations by making scores look like they dropped massively.
  const { data: allScores } = await supabaseAdmin
    .from('practice_scores')
    .select('student_id, test_date, composite')
    .not('composite', 'is', null)
    .not('math_score', 'is', null)
    .not('rw_score', 'is', null)
    .order('test_date', { ascending: true });

  // Fetch assignments covering the widest window (30d) — filter client-side
  const { data: recentAssignments } = await supabaseAdmin
    .from('assignments')
    .select('student_id, assignment_date, accuracy_pct')
    .gte('assignment_date', d30str);

  const scoresByStudent = new Map<string, number[]>();
  for (const s of allScores ?? []) {
    if (!scoresByStudent.has(s.student_id)) scoresByStudent.set(s.student_id, []);
    scoresByStudent.get(s.student_id)!.push(s.composite);
  }

  const assignsByStudent = new Map<string, { assignment_date: string; accuracy_pct: number | null }[]>();
  for (const a of recentAssignments ?? []) {
    if (!assignsByStudent.has(a.student_id)) assignsByStudent.set(a.student_id, []);
    assignsByStudent.get(a.student_id)!.push({ assignment_date: a.assignment_date, accuracy_pct: a.accuracy_pct });
  }

  return students.map(student => {
    const composites = scoresByStudent.get(student.id) ?? [];
    const score_count = composites.length;
    const latest_composite = score_count > 0 ? composites[score_count - 1] : null;
    const best_composite = score_count > 0 ? Math.max(...composites) : null;
    const score_diff = score_count >= 2 ? composites[score_count - 1] - composites[0] : null;
    const trend = deriveTrend(score_diff, score_count);

    const days_until_test = daysUntil(student.next_test_date);
    const score_gap = (student.target_score != null && latest_composite != null)
      ? student.target_score - latest_composite
      : null;

    const assigns    = assignsByStudent.get(student.id) ?? [];
    const assigns7   = assigns.filter(a => a.assignment_date >= d7str);
    const assigns14  = assigns.filter(a => a.assignment_date >= d14str);
    const assignments_7d  = assigns7.length;
    const assignments_14d = assigns14.length;
    const assignments_30d = assigns.length;

    const acc14 = assigns14.map(a => a.accuracy_pct).filter((v): v is number => v != null);
    const avg_accuracy_14d = acc14.length > 0
      ? Math.round(acc14.reduce((s, v) => s + v, 0) / acc14.length)
      : null;

    const status = computeStatus(score_diff, score_count, assignments_14d, avg_accuracy_14d, days_until_test, score_gap);

    return {
      id: student.id,
      name: student.name,
      progress_token: student.progress_token,
      target_score: student.target_score,
      next_test_date: student.next_test_date,
      latest_composite,
      best_composite,
      score_diff,
      score_count,
      days_until_test,
      score_gap,
      trend,
      assignments_7d,
      assignments_14d,
      assignments_30d,
      avg_accuracy_14d,
      status,
    };
  });
}
