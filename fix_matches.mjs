/**
 * One-time script to fix bad name matches from the score import.
 * Moves specific scores from wrong students to correct students,
 * creating the correct student if they don't exist yet.
 *
 * Usage: node fix_matches.mjs
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
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── Corrections ────────────────────────────────────────────────────────────────
const FIXES = [
  {
    from: 'Vineel Motadikela',
    to:   { name: 'Neel Vadlamani',  email: 'vadlamanineel@gmail.com' },
    dates: [
      { date: '2026-08-17', composite: 1400 },
      { date: '2026-08-21', composite: 1470 },
    ],
  },
  {
    from: 'Rauha Khan',
    to:   { name: 'Anaya Kumar', email: 'anayakumar09@gmail.com' },
    dates: [
      { date: '2026-08-10', composite: 1260 },
      { date: '2026-08-26', composite: 720  },
    ],
  },
  {
    from: 'Muhammad Haider',
    to:   { name: 'Irtaza Haider', email: 'smi.haider14@gmail.com' },
    dates: [
      { date: '2026-08-18', composite: 1240 },
    ],
  },
  {
    from: 'Adam Hamid',
    to:   { name: 'Adam Clinkscale', email: 'sportsking@comcast.net' },
    dates: [
      { date: '2026-07-27', composite: 1110 },
      { date: '2026-08-16', composite: 1380 },
    ],
  },
  {
    from: 'Saanvi Kumar',
    to:   { name: 'Saanvi Sunil', email: 'saanvisunil027@gmail.com' },
    dates: [
      { date: '2026-03-06', composite: 580 },
      { date: '2026-03-11', composite: 620 },
      { date: '2026-06-07', composite: 540 },
      { date: '2026-08-24', composite: 630 },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
async function findStudent(name) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, progress_token')
    .ilike('name', name)
    .maybeSingle();
  if (error) console.error(`  DB error looking up "${name}":`, error.message);
  return data;
}

async function findOrCreateStudent({ name, email }) {
  // Try exact match first
  let student = await findStudent(name);
  if (student) {
    console.log(`  ✅ Found target "${student.name}" (${student.id})`);
    return student;
  }

  // Create
  const { data, error } = await supabase
    .from('students')
    .insert({ name, student_email: email || null, parent_email: null })
    .select('id, name, progress_token')
    .single();

  if (error) {
    console.error(`  ❌  Could not create "${name}": ${error.message}`);
    return null;
  }
  console.log(`  ➕ Created target "${data.name}" (${data.id}) — /progress/${data.progress_token}`);
  return data;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  let totalMoved = 0, totalNotFound = 0;

  for (const fix of FIXES) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`FROM: "${fix.from}"  →  TO: "${fix.to.name}"`);

    // 1. Find source student
    const source = await findStudent(fix.from);
    if (!source) {
      console.log(`  ⚠️  Source student "${fix.from}" not found in DB — skipping`);
      totalNotFound += fix.dates.length;
      continue;
    }
    console.log(`  📌 Source "${source.name}" (${source.id})`);

    // 2. Find or create target student
    const target = await findOrCreateStudent(fix.to);
    if (!target) { totalNotFound += fix.dates.length; continue; }

    // 3. Move each score
    for (const { date, composite } of fix.dates) {
      // Find the score row on that date under the source student
      // (verify composite to avoid moving the wrong row if two scores share a date)
      const { data: rows, error: fetchErr } = await supabase
        .from('practice_scores')
        .select('id, test_date, composite')
        .eq('student_id', source.id)
        .eq('test_date', date);

      if (fetchErr) {
        console.error(`  ❌  Error fetching score ${date}:`, fetchErr.message);
        totalNotFound++;
        continue;
      }

      if (!rows || rows.length === 0) {
        console.log(`  ⚠️  Score not found: "${fix.from}" / ${date} / composite=${composite}`);
        totalNotFound++;
        continue;
      }

      // If multiple rows on same date, pick the one matching composite
      const row = rows.find(r => r.composite === composite) ?? rows[0];

      // Check target doesn't already have a score on this date (avoid duplicate)
      const { data: existing } = await supabase
        .from('practice_scores')
        .select('id')
        .eq('student_id', target.id)
        .eq('test_date', date)
        .maybeSingle();

      if (existing) {
        console.log(`  ⏭  Target already has a score on ${date} — deleting source duplicate`);
        await supabase.from('practice_scores').delete().eq('id', row.id);
        totalMoved++;
        continue;
      }

      // Move: update student_id to target
      const { error: updateErr } = await supabase
        .from('practice_scores')
        .update({ student_id: target.id })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`  ❌  Failed to move score ${date}:`, updateErr.message);
        totalNotFound++;
      } else {
        console.log(`  ✅  Moved ${date}  composite=${row.composite}  →  "${target.name}"`);
        totalMoved++;
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Done. Moved: ${totalMoved} scores | Issues: ${totalNotFound}`);
  console.log('═'.repeat(60));
}

main().catch(err => { console.error('\n❌  Unexpected error:', err); process.exit(1); });
