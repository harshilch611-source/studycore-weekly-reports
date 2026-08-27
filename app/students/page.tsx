import { supabaseAdmin } from '@/lib/supabase';
import StudentsClient from './StudentsClient';

export default async function StudentsPage() {
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id, name, target_score, progress_token')
    .order('name');

  return <StudentsClient students={students || []} />;
}
