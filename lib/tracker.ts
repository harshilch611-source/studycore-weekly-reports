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
  assignments_30d: number;
  avg_accuracy_7d: number | null;
  status: 'on_pace' | 'at_risk' | 'off_track';
}

function computeTrend(scores: number[]): 'up' | 'flat' | 'down' | 'insufficient' {
  // last 3 scores (most recent last), need at least 2
  const last3 = scores.slice(-3);
  if (last3.length < 2) return 'insufficient';
  const first = last3[0];
  const last = last3[last3.length - 1];
  const diff = last - first;
  if (diff >= 30) return 'up';
  if (diff <= -30) return 'down';
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
  trend: TrackerStudent['trend'],
  assignments_7d: number,
  days_until_test: number | null,
  score_gap: number | null,
): TrackerStudent['status'] {
  // Off track conditions
  if (trend === 'down') return 'off_track';
  if (assignments_7d === 0) return 'off_track';
  if (days_until_test != null && days_until_test < 14 && score_gap != null && score_gap > 100) return 'off_track';

  // On pace
  if (trend === 'up' && assignments_7d >= 3) return 'on_pace';

  // At risk (everything else)
  return 'at_risk';
}

export async function fetchTrackerData(): Promise<TrackerStudent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d7 = new Date(today); d7.setDate(d7.getDate() - 7);
  const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
  const d7str = d7.toISOString().split('T')[0];
  const d30str = d30.toISOString().split('T')[0];

  // Fetch all students
  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select('id, name, progress_token, target_score, next_test_date')
    .order('name');

  if (sErr || !students) return [];

  // Fetch all practice scores — full tests only (both sections present)
  // Section-only imports have math_score or rw_score null and a composite that equals
  // just one section score (200–800), which corrupts trend calculations.
  const { data: allScores } = await supabaseAdmin
    .from('practice_scores')
    .select('student_id, test_date, composite')
    .not('composite', 'is', null)
    .not('math_score', 'is', null)
    .not('rw_score', 'is', null)
    .order('test_date', { ascending: true });

  // Fetch assignments in last 30 days
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
    const assigns7 = assigns.filter(a => a.assignment_date >= d7str);
    const assignments_7d = assigns7.length;
    const assignments_30d = assigns.length;

    const acc7 = assigns7.filter(a => a.accuracy_pct != null).map(a => a.accuracy_pct as number);
    const avg_accuracy_7d = acc7.length > 0 ? Math.round(acc7.reduce((s, v) => s + v, 0) / acc7.length) : null;

    const status = computeStatus(trend, assignments_7d, days_until_test, score_gap);

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
      assignments_30d,
      avg_accuracy_7d,
      status,
    };
  });
}
