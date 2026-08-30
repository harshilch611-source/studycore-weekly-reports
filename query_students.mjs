import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqhsfeusirbhdltgvkmr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaHNmZXVzaXJiaGRsdGd2a21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc4MzExMCwiZXhwIjoyMTAzMzU5MTEwfQ.bDCtGRSCzrDCAOalax-bAvdsz_jmW8_1NEK-_eyH5HM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Fetch all students with a next_test_date
const { data: students, error: sErr } = await supabase
  .from('students')
  .select('id, name, next_test_date, target_score')
  .not('next_test_date', 'is', null);

if (sErr) { console.error('Students error:', sErr.message); process.exit(1); }

// Fetch all assignments since Aug 1 2026
const { data: assignments, error: aErr } = await supabase
  .from('assignments')
  .select('student_id, assignment_date, accuracy_pct')
  .gte('assignment_date', '2026-08-01');

if (aErr) { console.error('Assignments error:', aErr.message); process.exit(1); }

// Group assignments by student_id
const assignmentMap = {};
for (const a of assignments) {
  if (!assignmentMap[a.student_id]) assignmentMap[a.student_id] = [];
  assignmentMap[a.student_id].push(a);
}

// Build result rows
const rows = students.map(s => {
  const asgns = assignmentMap[s.id] || [];
  const count = asgns.length;
  const lastDate = count > 0
    ? asgns.reduce((max, a) => a.assignment_date > max ? a.assignment_date : max, asgns[0].assignment_date)
    : null;
  const accuracies = asgns.map(a => a.accuracy_pct).filter(v => v != null);
  const avgAcc = accuracies.length > 0
    ? Math.round(accuracies.reduce((s, v) => s + v, 0) / accuracies.length)
    : null;
  return {
    name: s.name,
    next_test_date: s.next_test_date,
    target_score: s.target_score,
    assignments_since_aug1: count,
    last_assignment: lastDate,
    avg_accuracy: avgAcc,
  };
});

// Sort: assignments_since_aug1 ASC, next_test_date ASC
rows.sort((a, b) => {
  if (a.assignments_since_aug1 !== b.assignments_since_aug1)
    return a.assignments_since_aug1 - b.assignments_since_aug1;
  return (a.next_test_date || '').localeCompare(b.next_test_date || '');
});

// Print as table
const cols = [
  { key: 'name',                  label: 'Name',              width: 28 },
  { key: 'next_test_date',        label: 'Next Test',         width: 12 },
  { key: 'target_score',          label: 'Target',            width: 7  },
  { key: 'assignments_since_aug1',label: 'Assign (Aug+)',     width: 13 },
  { key: 'last_assignment',       label: 'Last Assign',       width: 12 },
  { key: 'avg_accuracy',          label: 'Avg Acc%',          width: 9  },
];

const pad = (str, width) => String(str ?? '—').padEnd(width);
const sep = cols.map(c => '-'.repeat(c.width)).join('-+-');
const header = cols.map(c => pad(c.label, c.width)).join(' | ');

console.log(header);
console.log(sep);
for (const row of rows) {
  console.log(cols.map(c => pad(row[c.key], c.width)).join(' | '));
}
console.log(`\n${rows.length} students`);
