import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqhsfeusirbhdltgvkmr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaHNmZXVzaXJiaGRsdGd2a21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc4MzExMCwiZXhwIjoyMTAzMzU5MTEwfQ.bDCtGRSCzrDCAOalax-bAvdsz_jmW8_1NEK-_eyH5HM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Search for any student whose student_email contains 'malihairshad' or 'irshad'
const { data: matches, error: searchError } = await supabase
  .from('students')
  .select('id, name, student_email, parent_email')
  .or('student_email.ilike.%malihairshad%,student_email.ilike.%irshad%');

if (searchError) {
  console.error('Search error:', searchError.message);
  process.exit(1);
}

console.log(`Found ${matches.length} match(es):`, matches);

if (matches.length > 0) {
  for (const student of matches) {
    const { error } = await supabase
      .from('students')
      .update({ next_test_date: '2026-12-06', target_score: 1500 })
      .eq('id', student.id);

    if (error) {
      console.error(`Error updating ${student.name}:`, error.message);
    } else {
      console.log(`Updated: ${student.name} (${student.student_email}) → date=2026-12-06, score=1500`);
    }
  }
} else {
  console.log('No match found. Creating new student "Yahya"...');
  const { data: newStudent, error: insertError } = await supabase
    .from('students')
    .insert({
      name: 'Yahya',
      student_email: null,
      parent_email: 'malihairshad0@gmail.com',
      next_test_date: '2026-12-06',
      target_score: 1500,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Insert error:', insertError.message);
  } else {
    console.log('Created new student:', newStudent);
  }
}
