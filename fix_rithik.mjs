import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nqhsfeusirbhdltgvkmr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaHNmZXVzaXJiaGRsdGd2a21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc4MzExMCwiZXhwIjoyMTAzMzU5MTEwfQ.bDCtGRSCzrDCAOalax-bAvdsz_jmW8_1NEK-_eyH5HM'
);

// Find Rithik Krishna's student id
const { data: student } = await supabase.from('students').select('id, name').ilike('name', '%rithik%').single();
console.log('Student:', student);

// Find the bad score row
const { data: rows } = await supabase.from('practice_scores').select('id, test_date, composite, rw_score, math_score').eq('student_id', student.id);
console.log('All scores:', rows);

const bad = rows.find(r => r.composite === 470);
if (!bad) { console.log('Row with composite=470 not found'); process.exit(0); }

console.log('Deleting:', bad);
const { error } = await supabase.from('practice_scores').delete().eq('id', bad.id);
if (error) { console.error('Delete error:', error.message); process.exit(1); }
console.log('Deleted successfully.');
