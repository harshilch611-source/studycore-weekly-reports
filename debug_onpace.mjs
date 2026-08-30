import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nqhsfeusirbhdltgvkmr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaHNmZXVzaXJiaGRsdGd2a21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc4MzExMCwiZXhwIjoyMTAzMzU5MTEwfQ.bDCtGRSCzrDCAOalax-bAvdsz_jmW8_1NEK-_eyH5HM'
);

const today = new Date(); today.setHours(0,0,0,0);
const d7str  = new Date(today); d7str.setDate(d7str.getDate() - 7);
const d14str = new Date(today); d14str.setDate(d14str.getDate() - 14);
const d7  = d7str.toISOString().split('T')[0];
const d14 = d14str.toISOString().split('T')[0];

const { data: students } = await supabase
  .from('students')
  .select('id, name')
  .not('next_test_date', 'is', null);

const { data: scores } = await supabase
  .from('practice_scores')
  .select('student_id, test_date, composite')
  .not('composite', 'is', null)
  .not('math_score', 'is', null)
  .not('rw_score', 'is', null)
  .order('test_date', { ascending: true });

const { data: assignments } = await supabase
  .from('assignments')
  .select('student_id, assignment_date')
  .gte('assignment_date', d14);

// Group
const scoreMap = {};
for (const s of scores ?? []) {
  if (!scoreMap[s.student_id]) scoreMap[s.student_id] = [];
  scoreMap[s.student_id].push(s.composite);
}
const assignMap = {};
for (const a of assignments ?? []) {
  if (!assignMap[a.student_id]) assignMap[a.student_id] = [];
  assignMap[a.student_id].push(a.assignment_date);
}

const trendingUp = [];
const onPace7d = [];
const onPace14d = [];

for (const s of students ?? []) {
  const composites = scoreMap[s.id] ?? [];
  if (composites.length < 2) continue;
  const first = composites[0], latest = composites[composites.length - 1];
  if (latest <= first) continue;
  trendingUp.push({ ...s, first, latest, diff: latest - first });

  const aAll = assignMap[s.id] ?? [];
  const a7  = aAll.filter(d => d >= d7).length;
  const a14 = aAll.length; // already filtered to >= d14

  if (a7 >= 3) onPace7d.push(s.name);
  if (a14 >= 3) onPace14d.push(s.name);
}

console.log(`\n=== Trending up (latest full test > first full test): ${trendingUp.length} students ===`);
for (const s of trendingUp) {
  const aAll = assignMap[s.id] ?? [];
  const a7  = aAll.filter(d => d >= d7).length;
  const a14 = aAll.length;
  const pace7  = a7  >= 3 ? '✅ On Pace (7d)' : `❌ fails 7d  (${a7} asgn since ${d7})`;
  const pace14 = a14 >= 3 ? '✅ On Pace (14d)' : `❌ fails 14d (${a14} asgn since ${d14})`;
  console.log(`  ${s.name.padEnd(28)} +${s.diff}pts (${s.first}→${s.latest})  |  ${pace7}  |  ${pace14}`);
}

console.log(`\n=== On Pace with ≥3 asgn in last 7d:  ${onPace7d.length} ===`, onPace7d);
console.log(`=== On Pace with ≥3 asgn in last 14d: ${onPace14d.length} ===`, onPace14d);
