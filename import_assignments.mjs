/**
 * One-time assignment import script.
 * Usage: node import_assignments.mjs
 *
 * Reads studycore_scores_import_all.json — same outer shape as the scores JSON:
 * [
 *   {
 *     "name": "Student Name",
 *     "email": "student@email.com",
 *     "assignments": [
 *       {
 *         "date": "2026-08-13",
 *         "name": "Khan Academy – Algebra",   // also accepts "assignment_name"
 *         "correct": 8,
 *         "incorrect": 2,
 *         "missed": 1,
 *         "total": 11,                        // also accepts "total_questions"
 *         "accuracy": 73                      // also accepts "accuracy_pct"
 *       }
 *     ]
 *   }
 * ]
 *
 * Dedup key: student_id + assignment_date + assignment_name (safe to re-run).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(__dirname, '.env.local');
  if (!existsSync(envPath)) { console.error('❌  .env.local not found'); process.exit(1); }
  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── Name matching (same logic as import_scores.mjs) ───────────────────────────
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}
function matchScore(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const ta = na.split(' '), tb = nb.split(' ');
  const overlap = ta.filter(t => t.length > 1 && tb.includes(t)).length;
  if (overlap > 0) return overlap / Math.max(ta.length, tb.length);
  return 0;
}
const MATCH_THRESHOLD = 0.5;

// ── Field normalisation helpers ───────────────────────────────────────────────
const pick = (obj, ...keys) => { for (const k of keys) if (obj[k] != null) return obj[k]; return null; };
const pickInt = (obj, ...keys) => { const v = pick(obj, ...keys); return v != null ? parseInt(v, 10) || null : null; };

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const JSON_FILE = join(__dirname, 'studycore_scores_import_all.json');
  if (!existsSync(JSON_FILE)) {
    console.error('❌  studycore_scores_import_all.json not found in project root.');
    process.exit(1);
  }

  const importData = JSON.parse(readFileSync(JSON_FILE, 'utf-8'));
  console.log(`\n📂  Loaded ${importData.length} entries from studycore_scores_import_all.json`);

  const { data: dbStudents, error: fetchErr } = await supabase
    .from('students').select('id, name');
  if (fetchErr) { console.error('❌  Failed to fetch students:', fetchErr.message); process.exit(1); }
  console.log(`📋  Found ${dbStudents.length} students in Supabase\n`);

  // ── Match / create students ─────────────────────────────────────────────────
  const matched   = [];
  const unmatched = [];

  for (const entry of importData) {
    // Only process entries that actually have assignments
    const assignments = entry.assignments || entry.attempts || [];
    if (!Array.isArray(assignments) || assignments.length === 0) continue;

    let best = null, bestScore = 0;
    for (const s of dbStudents) {
      const sc = matchScore(entry.name, s.name);
      if (sc > bestScore) { bestScore = sc; best = s; }
    }

    if (best && bestScore >= MATCH_THRESHOLD) {
      matched.push({ entry, student: best, assignments });
      console.log(`  ✅ Matched  "${entry.name}"  →  "${best.name}"  (${(bestScore * 100).toFixed(0)}%)`);
    } else {
      unmatched.push({ entry, assignments });
      console.log(`  ⚠️  No match "${entry.name}"  (will create)`);
    }
  }

  console.log(`\nMatched: ${matched.length} | Need creation: ${unmatched.length}\n`);

  // Create missing students
  for (const { entry, assignments } of unmatched) {
    const { data: newStudent, error: createErr } = await supabase
      .from('students')
      .insert({ name: entry.name, student_email: entry.email || null, parent_email: null })
      .select('id, name')
      .single();

    if (createErr) {
      console.error(`  ❌  Could not create "${entry.name}": ${createErr.message}`);
      continue;
    }
    console.log(`  ➕  Created student "${newStudent.name}"`);
    matched.push({ entry, student: newStudent, assignments });
  }

  // ── Insert assignments (idempotent) ────────────────────────────────────────
  let inserted = 0, skipped = 0, errors = 0;

  for (const { entry, student, assignments } of matched) {
    // Fetch existing (date + name) combos for this student
    const { data: existing } = await supabase
      .from('assignments')
      .select('assignment_date, assignment_name')
      .eq('student_id', student.id);

    const existingKeys = new Set(
      (existing || []).map(r => `${r.assignment_date}||${r.assignment_name}`)
    );

    for (const a of assignments) {
      const assignDate = pick(a, 'date', 'assignment_date');
      const assignName = pick(a, 'name', 'assignment_name', 'title') || 'Assignment';
      if (!assignDate) { errors++; continue; }

      const deupKey = `${assignDate}||${assignName}`;
      if (existingKeys.has(deupKey)) {
        skipped++;
        continue;
      }

      const correct   = pickInt(a, 'correct');
      const incorrect = pickInt(a, 'incorrect');
      const missed    = pickInt(a, 'missed');
      const total     = pickInt(a, 'total', 'total_questions');
      const accuracy  = pickInt(a, 'accuracy', 'accuracy_pct');

      const { error: insertErr } = await supabase.from('assignments').insert({
        student_id:      student.id,
        assignment_name: assignName,
        assignment_date: assignDate,
        correct,
        incorrect,
        missed,
        total_questions: total,
        accuracy_pct:    accuracy,
      });

      if (insertErr) {
        console.error(`    ❌  ${student.name} / ${assignDate} / "${assignName}": ${insertErr.message}`);
        errors++;
      } else {
        const acc = accuracy != null ? `${accuracy}%` : '—';
        console.log(`    ✅  ${student.name} / ${assignDate} / "${assignName}"  accuracy=${acc}`);
        inserted++;
        existingKeys.add(deupKey);
      }
    }
  }

  console.log('\n' + '═'.repeat(58));
  console.log(`Import complete`);
  console.log(`  Assignments inserted : ${inserted}`);
  console.log(`  Skipped (duplicates) : ${skipped}`);
  console.log(`  Errors               : ${errors}`);
  console.log('═'.repeat(58));
}

main().catch(err => { console.error('\n❌  Unexpected error:', err); process.exit(1); });
