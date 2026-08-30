import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqhsfeusirbhdltgvkmr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaHNmZXVzaXJiaGRsdGd2a21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc4MzExMCwiZXhwIjoyMTAzMzU5MTEwfQ.bDCtGRSCzrDCAOalax-bAvdsz_jmW8_1NEK-_eyH5HM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const updates = [
  { name: 'Shaunak Bhattacharya', next_test_date: '2026-09-13', target_score: 1500 },
  { name: 'Anaya Kumar',          next_test_date: '2026-10-11', target_score: 1500 },
  { name: 'Ismail Mohammed',      next_test_date: '2026-11-07', target_score: 1400 },
  { name: 'Neel Vadlamani',       next_test_date: '2026-10-11', target_score: 1550 },
  { name: 'Alia Zerhouni',        next_test_date: '2026-10-11', target_score: 1500 },
  { name: 'Yahya',                next_test_date: '2026-12-06', target_score: 1500 },
  { name: 'Mansi',                next_test_date: '2027-03-08', target_score: 1500 },
  { name: 'Adam Clinkscale',      next_test_date: '2026-09-13', target_score: 1500 },
  { name: 'Fabrizio Cavalieri',   next_test_date: '2026-10-11', target_score: 1400 },
  { name: 'Nana Manu',            next_test_date: '2026-10-11', target_score: 1500 },
  { name: 'Eliana Burrs',         next_test_date: '2026-09-13', target_score: 1200 },
  { name: 'Aaron Chen',           next_test_date: '2026-10-11', target_score: 1500 },
  { name: 'Jack Roll',            next_test_date: '2026-12-06', target_score: 1400 },
  { name: 'Ping Chow',            next_test_date: '2026-10-11', target_score: 1400 },
  { name: 'Ahmad',                next_test_date: '2026-10-11', target_score: 1400 },
  { name: 'Daniella De Vries',    next_test_date: '2026-10-11', target_score: 1500 },
  { name: 'Evelin Binu',          next_test_date: '2026-09-13', target_score: 1400 },
  { name: 'Evan Binu',            next_test_date: '2026-09-13', target_score: 1400 },
  { name: 'Rhea',                 next_test_date: '2026-10-11', target_score: 1450 },
  { name: 'Lukas Stueve',         next_test_date: '2026-09-13', target_score: 1450 },
  { name: 'Christian Banke',      next_test_date: '2026-10-11', target_score: 1400 },
  { name: 'Abigail Smith',        next_test_date: '2026-10-11', target_score: 1500 },
  { name: 'Rithik Krishna',       next_test_date: '2026-11-07', target_score: 1400 },
  { name: 'Trisha',               next_test_date: '2026-10-11', target_score: 1550 },
  { name: 'Preethee Deva',        next_test_date: '2026-09-13', target_score: 1450 },
  { name: 'Ssanyu',               next_test_date: '2026-11-07', target_score: 1500 },
  { name: 'Liam Tourand',         next_test_date: '2026-08-22', target_score: 1350 },
  { name: 'Suhani Parmar',        next_test_date: '2026-09-13', target_score: 1500 },
  { name: 'Elise Garver',         next_test_date: '2026-09-13', target_score: 1400 },
  { name: 'Rory Best',            next_test_date: '2026-08-22', target_score: 1500 },
  { name: 'Nikki Obiorah',        next_test_date: '2026-08-22', target_score: 1500 },
  { name: 'Seanna Shrestha',      next_test_date: '2026-10-11', target_score: 1500 },
  { name: 'Shreya Nippani',       next_test_date: '2026-11-07', target_score: 1550 },
];

// Fetch all students once
const { data: allStudents, error: fetchError } = await supabase
  .from('students')
  .select('id, name');

if (fetchError) {
  console.error('Error fetching students:', fetchError);
  process.exit(1);
}

console.log(`Fetched ${allStudents.length} students from DB.\n`);

function normalize(str) {
  return str.toLowerCase().trim();
}

function matchStudent(targetName, students) {
  const normTarget = normalize(targetName);
  // Exact match first
  let match = students.find(s => normalize(s.name) === normTarget);
  if (match) return match;

  // First name only match (for single-word queries like Yahya, Mansi, etc.)
  const targetParts = normTarget.split(' ');
  if (targetParts.length === 1) {
    match = students.find(s => normalize(s.name).startsWith(normTarget));
    if (match) return match;
  }

  // Fuzzy: check if all target parts appear in the student name
  match = students.find(s => {
    const normStudentName = normalize(s.name);
    return targetParts.every(part => normStudentName.includes(part));
  });
  if (match) return match;

  // Partial: first name matches
  match = students.find(s => normalize(s.name).startsWith(targetParts[0]));
  return match || null;
}

const results = { updated: [], notFound: [], errors: [] };

for (const update of updates) {
  const student = matchStudent(update.name, allStudents);

  if (!student) {
    console.warn(`NOT FOUND: ${update.name}`);
    results.notFound.push(update.name);
    continue;
  }

  const { error } = await supabase
    .from('students')
    .update({ next_test_date: update.next_test_date, target_score: update.target_score })
    .eq('id', student.id);

  if (error) {
    console.error(`ERROR updating ${update.name} (matched: ${student.name}):`, error.message);
    results.errors.push(update.name);
  } else {
    console.log(`OK: ${update.name} → matched "${student.name}" → date=${update.next_test_date}, score=${update.target_score}`);
    results.updated.push({ input: update.name, matched: student.name });
  }
}

console.log('\n=== Summary ===');
console.log(`Updated:   ${results.updated.length}`);
console.log(`Not found: ${results.notFound.length}`, results.notFound.length ? results.notFound : '');
console.log(`Errors:    ${results.errors.length}`, results.errors.length ? results.errors : '');
