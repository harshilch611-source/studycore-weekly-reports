import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import studentsData from '@/lib/students.json';

interface StudentJson { studentName: string; parentEmail: string; studentEmail: string; }

// SQL to run manually in the Supabase SQL editor if this route fails
const SQL = `
-- Run this in the Supabase SQL editor first, then hit GET /api/setup to seed students

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  parent_email text,
  student_email text,
  target_score integer,
  progress_token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practice_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  test_date date NOT NULL,
  composite integer,
  rw_score integer,
  math_score integer,
  craft_structure integer,
  expression_ideas integer,
  standard_english integer,
  information_ideas integer,
  algebra integer,
  advanced_math integer,
  geometry_trig integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  student_name text,
  week_start date,
  week_end date,
  report_data jsonb,
  sent_at timestamptz DEFAULT now()
);
`;

export async function GET() {
  const results: Record<string, unknown> = {};

  // Seed students from students.json using upsert on name (skip duplicates)
  const studentsToInsert = (studentsData as StudentJson[]).map(s => ({
    name: s.studentName,
    parent_email: s.parentEmail,
    student_email: s.studentEmail,
    target_score: null,
  }));

  const { error: seedError, count } = await supabaseAdmin
    .from('students')
    .upsert(studentsToInsert, { onConflict: 'name', ignoreDuplicates: true })
    .select();

  results.seed = seedError
    ? { error: seedError.message, hint: 'Tables may not exist yet — run the SQL below in the Supabase SQL editor first' }
    : { ok: true, count };

  results.sql = SQL;

  return NextResponse.json(results, { status: seedError ? 500 : 200 });
}
