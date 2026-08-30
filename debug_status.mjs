import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nqhsfeusirbhdltgvkmr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaHNmZXVzaXJiaGRsdGd2a21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc4MzExMCwiZXhwIjoyMTAzMzU5MTEwfQ.bDCtGRSCzrDCAOalax-bAvdsz_jmW8_1NEK-_eyH5HM'
);

const today = new Date(); today.setHours(0,0,0,0);
const d14 = new Date(today); d14.setDate(d14.getDate() - 14);
const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
const d14str = d14.toISOString().split('T')[0];
const d30str = d30.toISOString().split('T')[0];

const [{ data: students }, { data: scores }, { data: assignments }] = await Promise.all([
  supabase.from('students').select('id, name, next_test_date, target_score').not('next_test_date', 'is', null).order('name'),
  supabase.from('practice_scores').select('student_id, test_date, composite').not('composite','is',null).not('math_score','is',null).not('rw_score','is',null).order('test_date', { ascending: true }),
  supabase.from('assignments').select('student_id, assignment_date, accuracy_pct').gte('assignment_date', d30str),
]);

// Group
const scoreMap = {};
for (const s of scores ?? []) {
  if (!scoreMap[s.student_id]) scoreMap[s.student_id] = [];
  scoreMap[s.student_id].push({ date: s.test_date, score: s.composite });
}
const assignMap = {};
for (const a of assignments ?? []) {
  if (!assignMap[a.student_id]) assignMap[a.student_id] = [];
  assignMap[a.student_id].push(a);
}

console.log(`Today: ${today.toISOString().split('T')[0]}   14d cutoff: ${d14str}\n`);
console.log('='.repeat(90));

for (const s of students) {
  const fullScores = scoreMap[s.id] ?? [];
  const composites = fullScores.map(f => f.score);
  const scoreCount = composites.length;
  const first = composites[0] ?? null;
  const latest = composites[scoreCount - 1] ?? null;
  const scoreDiff = scoreCount >= 2 ? latest - first : null;

  const allAssigns = assignMap[s.id] ?? [];
  const assigns14 = allAssigns.filter(a => a.assignment_date >= d14str);
  const asgn14Count = assigns14.length;
  const acc14vals = assigns14.map(a => a.accuracy_pct).filter(v => v != null);
  const avgAcc14 = acc14vals.length > 0 ? Math.round(acc14vals.reduce((a,b) => a+b, 0) / acc14vals.length) : null;

  const daysUntil = s.next_test_date
    ? Math.round((new Date(s.next_test_date + 'T00:00:00') - today) / 86400000)
    : null;
  const scoreGap = (s.target_score != null && latest != null) ? s.target_score - latest : null;

  // Evaluate status
  let offTrackReason = null;
  if (asgn14Count === 0)                                              offTrackReason = `0 assignments in 14d`;
  else if (scoreDiff !== null && scoreDiff <= -30)                    offTrackReason = `score dropped ${scoreDiff}pts`;
  else if (avgAcc14 !== null && avgAcc14 < 45)                        offTrackReason = `avg accuracy ${avgAcc14}% < 45%`;
  else if (daysUntil !== null && daysUntil <= 14 && scoreGap !== null && scoreGap > 150)
                                                                      offTrackReason = `test in ${daysUntil}d, gap=${scoreGap}pts > 150`;

  let onPaceFails = [];
  if (!offTrackReason) {
    const goodScore  = (scoreDiff !== null && scoreDiff >= 30) || (scoreCount === 1 && avgAcc14 !== null && avgAcc14 >= 70);
    const goodHw     = asgn14Count >= 2;
    const goodAcc    = avgAcc14 !== null && avgAcc14 >= 60;
    if (!goodScore)  onPaceFails.push(`score: diff=${scoreDiff ?? 'n/a'} (need ≥30), count=${scoreCount} (1-test acc=${avgAcc14 ?? 'n/a'}, need ≥70)`);
    if (!goodHw)     onPaceFails.push(`homework: ${asgn14Count} asgn in 14d (need ≥2)`);
    if (!goodAcc)    onPaceFails.push(`accuracy: ${avgAcc14 ?? 'n/a'}% (need ≥60%)`);
  }

  const status = offTrackReason ? 'OFF TRACK' : onPaceFails.length === 0 ? 'ON PACE' : 'AT RISK';

  console.log(`\n${s.name}`);
  console.log(`  Test date : ${s.next_test_date} (${daysUntil}d)  Target: ${s.target_score ?? '—'}  Gap: ${scoreGap ?? '—'}`);
  console.log(`  Full tests: ${scoreCount === 0 ? 'none' : fullScores.map(f => `${f.date}:${f.score}`).join(', ')}`);
  console.log(`  Trend     : ${scoreDiff !== null ? (scoreDiff >= 0 ? '+' : '') + scoreDiff + 'pts (' + first + '→' + latest + ')' : scoreCount === 1 ? `single test: ${latest}` : 'no full tests'}`);
  console.log(`  Asgn 14d  : ${asgn14Count}  (dates: ${assigns14.map(a => a.assignment_date).join(', ') || 'none'})`);
  console.log(`  Acc 14d   : ${avgAcc14 ?? '—'}%  (values: ${acc14vals.join(', ') || 'none'})`);
  if (offTrackReason)      console.log(`  ❌ OFF TRACK because: ${offTrackReason}`);
  if (onPaceFails.length)  onPaceFails.forEach(f => console.log(`  ⚠ ON PACE fail: ${f}`));
  console.log(`  → STATUS: ${status}`);
}

console.log('\n' + '='.repeat(90));
