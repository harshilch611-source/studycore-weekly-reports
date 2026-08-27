import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student_id, test_date, composite, rw_score, math_score,
      craft_structure, expression_ideas, standard_english,
      information_ideas, algebra, advanced_math, geometry_trig, notes,
    } = body;

    if (!student_id || !test_date) {
      return NextResponse.json({ error: 'student_id and test_date are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('practice_scores').insert({
      student_id,
      test_date,
      composite: composite || null,
      rw_score: rw_score || null,
      math_score: math_score || null,
      craft_structure: craft_structure || null,
      expression_ideas: expression_ideas || null,
      standard_english: standard_english || null,
      information_ideas: information_ideas || null,
      algebra: algebra || null,
      advanced_math: advanced_math || null,
      geometry_trig: geometry_trig || null,
      notes: notes || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Scores error:', err);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
