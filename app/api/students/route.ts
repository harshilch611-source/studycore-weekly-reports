import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, parentEmail, studentEmail, targetScore } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: student, error } = await supabaseAdmin
      .from('students')
      .insert({
        name: name.trim(),
        parent_email: parentEmail || null,
        student_email: studentEmail || null,
        target_score: targetScore ? Number(targetScore) : null,
      })
      .select('id, name, target_score, progress_token')
      .single();

    if (error) {
      const msg = error.message.includes('unique') ? 'A student with that name already exists' : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true, student });
  } catch (err) {
    console.error('Add student error:', err);
    return NextResponse.json({ error: 'Failed to add student' }, { status: 500 });
  }
}
