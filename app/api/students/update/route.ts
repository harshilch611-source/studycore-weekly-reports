import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { id, next_test_date, target_score } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (next_test_date !== undefined) patch.next_test_date = next_test_date || null;
  if (target_score !== undefined) patch.target_score = target_score ? parseInt(target_score, 10) : null;

  const { error } = await supabaseAdmin.from('students').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
