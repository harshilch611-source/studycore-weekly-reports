/**
 * One-time score import script.
 *
 * Usage:
 *   1. Place studycore_scores_import.json in this directory.
 *   2. node import_scores.mjs
 *
 * JSON shape expected:
 * [
 *   {
 *     "name": "Student Name",
 *     "email": "student@email.com",
 *     "scores": [
 *       { "date": "2026-08-13", "composite": 1460, "math": 760, "rw": 700 },
 *       ...
 *     ]
 *   }
 * ]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Read .env.local ────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(__dirname, '.env.local');
  if (!existsSync(envPath)) {
    console.error('❌  .env.local not found. Make sure it is in the project root.');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Name matching ──────────────────────────────────────────────────────────────
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function matchScore(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const ta = na.split(' '), tb = nb.split(' ');
  // First-name + last-name overlap
  const overlap = ta.filter(t => t.length > 1 && tb.includes(t)).length;
  if (overlap > 0) return overlap / Math.max(ta.length, tb.length);
  return 0;
}

const MATCH_THRESHOLD = 0.5;

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const IMPORT_NOTE = 'Imported from StudyCore platform (my.studycore.net) on 2026-08-27';

  // 1. Read JSON ----------------------------------------------------------------
  const jsonPath = join(__dirname, 'studycore_scores_import.json');
  if (!existsSync(jsonPath)) {
    console.error('❌  studycore_scores_import.json not found in project root.');
    process.exit(1);
  }
  const importData = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  console.log(`\n📂  Loaded ${importData.length} entries from studycore_scores_import.json`);

  // 2. Fetch all DB students ----------------------------------------------------
  const { data: dbStudents, error: fetchErr } = await supabase
    .from('students')
    .select('id, name, progress_token');
  if (fetchErr) { console.error('❌  Failed to fetch students:', fetchErr.message); process.exit(1); }
  console.log(`📋  Found ${dbStudents.length} students in Supabase\n`);

  // 3. Match --------------------------------------------------------------------
  const matched   = []; // { entry, student }
  const unmatched = []; // entries with no DB match

  for (const entry of importData) {
    let best = null, bestScore = 0;
    for (const s of dbStudents) {
      const sc = matchScore(entry.name, s.name);
      if (sc > bestScore) { bestScore = sc; best = s; }
    }
    if (best && bestScore >= MATCH_THRESHOLD) {
      matched.push({ entry, student: best, confidence: bestScore });
      console.log(`  ✅ Matched  "${entry.name}"  →  "${best.name}"  (${(bestScore * 100).toFixed(0)}%)`);
    } else {
      unmatched.push(entry);
      console.log(`  ⚠️  No match "${entry.name}"  (will create)`);
    }
  }

  console.log(`\nMatched: ${matched.length} | Need creation: ${unmatched.length}\n`);

  // 4. Create missing students --------------------------------------------------
  for (const entry of unmatched) {
    const { data: newStudent, error: createErr } = await supabase
      .from('students')
      .insert({
        name: entry.name,
        student_email: entry.email || null,
        parent_email: null,
      })
      .select('id, name, progress_token')
      .single();

    if (createErr) {
      // If it's a unique-constraint error the student exists under a slightly different name
      console.error(`  ❌  Could not create "${entry.name}": ${createErr.message}`);
      continue;
    }

    console.log(`  ➕  Created student "${newStudent.name}" (${newStudent.progress_token})`);
    matched.push({ entry, student: newStudent, confidence: 1.0, wasCreated: true });
  }

  // 5. Insert scores (idempotent) -----------------------------------------------
  let inserted = 0, skipped = 0, errors = 0;

  for (const { entry, student } of matched) {
    if (!Array.isArray(entry.scores) || entry.scores.length === 0) continue;

    // Fetch existing test_dates for this student to skip duplicates
    const { data: existing } = await supabase
      .from('practice_scores')
      .select('test_date')
      .eq('student_id', student.id);

    const existingDates = new Set((existing || []).map(r => r.test_date));

    for (const score of entry.scores) {
      const testDate = score.date;
      if (!testDate) { errors++; continue; }

      if (existingDates.has(testDate)) {
        console.log(`    ⏭  Skip   ${student.name} / ${testDate} (duplicate)`);
        skipped++;
        continue;
      }

      const { error: insertErr } = await supabase.from('practice_scores').insert({
        student_id:   student.id,
        test_date:    testDate,
        composite:    score.composite  ?? null,
        math_score:   score.math      ?? null,
        rw_score:     score.rw        ?? null,
        // domain subscores not available in this import
        craft_structure:  null,
        expression_ideas: null,
        standard_english: null,
        information_ideas: null,
        algebra:          null,
        advanced_math:    null,
        geometry_trig:    null,
        notes: IMPORT_NOTE,
      });

      if (insertErr) {
        console.error(`    ❌  Error  ${student.name} / ${testDate}: ${insertErr.message}`);
        errors++;
      } else {
        console.log(`    ✅  Insert ${student.name} / ${testDate}  composite=${score.composite ?? '—'}  math=${score.math ?? '—'}  rw=${score.rw ?? '—'}`);
        inserted++;
        existingDates.add(testDate); // prevent re-insert if same date appears twice in JSON
      }
    }
  }

  // 6. Summary ------------------------------------------------------------------
  console.log('\n' + '─'.repeat(55));
  console.log(`Import complete`);
  console.log(`  Scores inserted : ${inserted}`);
  console.log(`  Skipped (dups)  : ${skipped}`);
  console.log(`  Errors          : ${errors}`);
  console.log('─'.repeat(55));
  console.log('\nProgress tracker URLs:');
  for (const { entry, student } of matched) {
    if (student.progress_token) {
      console.log(`  ${entry.name.padEnd(30)} /progress/${student.progress_token}`);
    }
  }
}

main().catch(err => { console.error('\n❌  Unexpected error:', err); process.exit(1); });
