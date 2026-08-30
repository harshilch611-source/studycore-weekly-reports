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
  days_until_test: number | null;
  score_gap: number | null;
  trend: 'up' | 'flat' | 'down' | 'insufficient';
  assignments_7d: number;
  assignments_14d: number;
  assignments_30d: number;
  avg_accuracy_7d: number | null;
  status: 'on_pace' | 'at_risk' | 'off_track';
}

function computeTrend(scores: number[]): 'up' | 'flat' | 'down' | 'insufficient' {
  // Need at least 2 full-test scores to determine trend.
  // Compare first recorded score to latest — this shows overall trajectory,
  // not just recent wobble.
  if (scores.length < 2) return 'insufficient';
  const first = scores[0];
  const latest = scores[scores.length - 1];
  const diff = latest - first;
  if (diff > 0) return 'up';      // any net improvement = up
  if (diff >= -50) return 'flat'; // within 50 pts down = flat
  return 'down';                  // dropped >50 pts = down
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function computeStatus(
  trend: TrackerStudent['trend'],
  assignments_7d: number,
  assignments_14d: number,
  days_until_test: number | null,
  score_gap: number | null,
): TrackerStudent['status'] {
  // No data: fewer than 2 full tests → can't judge trend → default At Risk
  if (trend === 'insufficient') return 'at_risk';

  // Off Track conditions (checked in priority order)
  if (trend === 'down') return 'off_track';
  if (assignments_14d === 0) return 'off_track';
  if (days_until_test != null && days_until_test <= 14 && score_gap != null && score_gap > 150) return 'off_track';

  // On Pace: improving score AND actively doing homework (14d window —
  // a student tutored 2x/week hits 3 assignments over 2 weeks, not necessarily 7 days)
  if (trend === 'up' && assignments_14d >= 3) return 'on_pace';

  // At Risk: flat trend, or up but low recent homework, or 1–2 assignments in 7d
  return 'at_risk';
}

export async function fetchTrackerData(): Promise<TrackerStudent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d7 = new Date(today); d7.setDate(d7.getDate() - 7);
  const d14 = new Date(today); d14.setDate(d14.getDate() - 14);
  const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
  const d7str  = d7.toISOString().split('T')[0];
  const d14str = d14.toISOString().split('T')[0];
  const d30str = d30.toISOString().split('T')[0];

  // Fetch all students
  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select('id, name, progress_token, target_score, next_test_date')
    .order('name');

  if (sErr || !students) return [];

  // Full-test scores only: require both rw_score and math_score to be present.
  // Section-only imports (e.g. RW=720, math=null, composite=720) would corrupt
  // trend calculations by making a score look like it dropped hundreds of points.
  const { data: allScores } = await supabaseAdmin
    .from('practice_scores')
    .select('student_id, test_date, composite')
    .not('composite', 'is', null)
    .not('math_score', 'is', null)
    .not('rw_score', 'is', null)
    .order('test_date', { ascending: true });

  // Fetch assignments in last 30 days (covers all windows: 7d, 14d, 30d)
  const { data: recentAssignments } = await supabaseAdmin
    .from('assignments')
    .select('student_id, assignment_date, accuracy_pct')
    .gte('assignment_date', d30str);

  // Group by student
  const scoresByStudent = new Map<string, { test_date: string; composite: number }[]>();
  for (const s of allScores ?? []) {
    if (!scoresByStudent.has(s.student_id)) scoresByStudent.set(s.student_id, []);
    scoresByStudent.get(s.student_id)!.push({ test_date: s.test_date, composite: s.composite });
  }

  const assignsByStudent = new Map<string, { assignment_date: string; accuracy_pct: number | null }[]>();
  for (const a of recentAssignments ?? []) {
    if (!assignsByStudent.has(a.student_id)) assignsByStudent.set(a.student_id, []);
    assignsByStudent.get(a.student_id)!.push({ assignment_date: a.assignment_date, accuracy_pct: a.accuracy_pct });
  }

  return students.map(student => {
    const scores = scoresByStudent.get(student.id) ?? [];
    const composites = scores.map(s => s.composite);
    const latest_composite = composites.length > 0 ? composites[composites.length - 1] : null;
    const best_composite = composites.length > 0 ? Math.max(...composites) : null;
    const trend = computeTrend(composites);
    const days_until_test = daysUntil(student.next_test_date);
    const score_gap = (student.target_score != null && latest_composite != null)
      ? student.target_score - latest_composite
      : null;

    const assigns = assignsByStudent.get(student.id) ?? [];
    const assigns7  = assigns.filter(a => a.assignment_date >= d7str);
    const assigns14 = assigns.filter(a => a.assignment_date >= d14str);
    const assignments_7d  = assigns7.length;
    const assignments_14d = assigns14.length;
    const assignments_30d = assigns.length;

    const acc7 = assigns7.filter(a => a.accuracy_pct != null).map(a => a.accuracy_pct as number);
    const avg_accuracy_7d = acc7.length > 0 ? Math.round(acc7.reduce((s, v) => s + v, 0) / acc7.length) : null;

    const status = computeStatus(trend, assignments_7d, assignments_14d, days_until_test, score_gap);

    return {
      id: student.id,
      name: student.name,
      progress_token: student.progress_token,
      target_score: student.target_score,
      next_test_date: student.next_test_date,
      latest_composite,
      best_composite,
      days_until_test,
      score_gap,
      trend,
      assignments_7d,
      assignments_14d,
      assignments_30d,
      avg_accuracy_7d,
      status,
    };
  });
}
