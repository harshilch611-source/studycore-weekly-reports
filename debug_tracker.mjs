import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nqhsfeusirbhdltgvkmr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaHNmZXVzaXJiaGRsdGd2a21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc4MzExMCwiZXhwIjoyMTAzMzU5MTEwfQ.bDCtGRSCzrDCAOalax-bAvdsz_jmW8_1NEK-_eyH5HM'
);

// 1. Students sample
const { data: students } = await supabase
  .from('students')
  .select('name, next_test_date, target_score')
  .not('next_test_date', 'is', null)
  .limit(5);
console.log('=== 5 students ===');
console.table(students);

// 2. Sample assignments (last 30 days)
const d30 = new Date(); d30.setDate(d30.getDate() - 30);
const d30str = d30.toISOString().split('T')[0];
const { data: asgns } = await supabase
  .from('assignments')
  .select('student_id, assignment_date, accuracy_pct')
  .gte('assignment_date', d30str)
  .limit(20);
console.log(`\n=== assignments since ${d30str} (first 20) ===`);
console.table(asgns);
console.log('Total returned:', asgns?.length);

// 3. Sample practice_scores
const { data: scores } = await supabase
  .from('practice_scores')
  .select('student_id, test_date, composite')
  .not('composite', 'is', null)
  .order('test_date', { ascending: false })
  .limit(10);
console.log('\n=== practice_scores (latest 10) ===');
console.table(scores);

// 4. For one student, show all their assignments + scores
const { data: stud1 } = await supabase
  .from('students')
  .select('id, name')
  .not('next_test_date', 'is', null)
  .limit(1)
  .single();
console.log('\n=== Deep dive: student', stud1?.name, stud1?.id, '===');
const { data: s1asgns } = await supabase.from('assignments').select('*').eq('student_id', stud1.id);
const { data: s1scores } = await supabase.from('practice_scores').select('*').eq('student_id', stud1.id);
console.log('assignments:', s1asgns);
console.log('scores:', s1scores);
