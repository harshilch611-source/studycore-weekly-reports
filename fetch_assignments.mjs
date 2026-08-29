/**
 * Fetches all student attempts from my.studycore.net GraphQL API
 * and writes studycore_scores_import_all.json in the format
 * expected by import_assignments.mjs.
 *
 * Usage: node fetch_assignments.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GQL = 'https://my.studycore.net/api/graphql';
const COOKIE = 'cookieconsent_status=allow; _ga=GA1.1.1839253790.1777363680; ak_tid=ak_3amz4wvndmqsx1qpt; _fbp=fb.1.1782356512426.94481271299005471; _clck=1w5rx9y%5E2%5Eg77%5E0%5E2367; _gcl_au=1.1.1896346966.1785728662; _ga_67JVFGJ1HP=GS2.1.s1785728661$o4$g0$t1785728662$j59$l0$h0; csrf-token=de422f1a1b90e0310b29e74e46159cfa5718f5a3facebf3d363633aab5a2596a; sessionId=7b304e45-0e52-4a6c-b620-aeac7bc1b5fa; auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTYwNjEwMTZiMzZmZjFmMzViMDU0YTYiLCJyb2xlIjoiZGlyZWN0b3IiLCJpbnN0YW5jZUtleSI6Im5leHRra1c1WVlKWkllQHImSjk3enFVaGlnaHNjb3JlcyIsImV4cCI6MTgxOTU2ODY1NiwiaWF0IjoxNzg4MDMyNjU2fQ.5VLTsmOu79RyzVa-CWR8_fK8Xc7B8YagcA2gGA32FOc';
const CSRF = 'de422f1a1b90e0310b29e74e46159cfa5718f5a3facebf3d363633aab5a2596a';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cookie': COOKIE,
  'X-CSRF-Token': CSRF,
};

async function gql(query, variables = {}) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    const msg = json.errors.map(e => e.message).join('; ');
    throw new Error(`GraphQL error: ${msg}`);
  }
  return json.data;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function toDate(iso) {
  if (!iso) return null;
  return iso.slice(0, 10); // "2026-08-28T21:36:26.112Z" → "2026-08-28"
}

// ── Fetch all students (paginated) ──────────────────────────────────────────
async function fetchAllStudents() {
  const PAGE_SIZE = 500;
  let page = 1;
  const all = [];

  while (true) {
    const data = await gql(`
      query($page: Int, $limit: Int) {
        assignedStudents(pagination: { page: $page, limit: $limit }) {
          edges { node { _id name email } }
        }
      }
    `, { page, limit: PAGE_SIZE });

    const edges = data.assignedStudents?.edges ?? [];
    for (const e of edges) all.push(e.node);
    console.log(`  Students page ${page}: ${edges.length} returned (total so far: ${all.length})`);
    if (edges.length < PAGE_SIZE) break;
    page++;
    await sleep(200);
  }

  return all;
}

// ── Fetch all attempts for one student (paginated) ──────────────────────────
async function fetchStudentAttempts(userId) {
  const PAGE_SIZE = 500;
  let page = 1;
  const all = [];

  while (true) {
    const data = await gql(`
      query($userId: ID, $page: Int, $limit: Int) {
        getStudentAttempts(
          userId: $userId
          pagination: { page: $page, limit: $limit }
        ) {
          edges {
            node {
              _id
              createdAt
              finishedAt
              status
              totalQuestions
              totalCorrects
              totalErrors
              totalMissed
              assessmentInfo { title }
            }
          }
        }
      }
    `, { userId, page, limit: PAGE_SIZE });

    const edges = data.getStudentAttempts?.edges ?? [];
    for (const e of edges) all.push(e.node);
    if (edges.length < PAGE_SIZE) break;
    page++;
    await sleep(100);
  }

  return all;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📡  Fetching students from my.studycore.net…\n');
  const students = await fetchAllStudents();
  console.log(`\n✅  ${students.length} students fetched\n`);

  const output = [];
  let totalAttempts = 0, skippedAttempts = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    process.stdout.write(`[${String(i + 1).padStart(3)}/${students.length}]  ${student.name.padEnd(30)}`);

    let attempts;
    try {
      attempts = await fetchStudentAttempts(student._id);
    } catch (err) {
      console.log(` ❌ error: ${err.message}`);
      await sleep(500);
      continue;
    }

    // Filter to evaluated attempts only; skip if no questions recorded
    const assignments = [];
    for (const a of attempts) {
      if (a.status !== 'evaluated') { skippedAttempts++; continue; }
      if (!a.totalQuestions || a.totalQuestions === 0) { skippedAttempts++; continue; }

      const date = toDate(a.finishedAt || a.createdAt);
      if (!date) { skippedAttempts++; continue; }

      const title = a.assessmentInfo?.title ?? 'Assignment';
      const correct   = a.totalCorrects  ?? 0;
      const incorrect = a.totalErrors    ?? 0;
      const missed    = a.totalMissed    ?? 0;
      const total     = a.totalQuestions ?? 0;
      const accuracy  = total > 0 ? Math.round((correct / total) * 100) : null;

      assignments.push({ date, name: title, correct, incorrect, missed, total, accuracy });
      totalAttempts++;
    }

    console.log(` ${attempts.length} attempts → ${assignments.length} kept`);

    if (assignments.length > 0) {
      output.push({ name: student.name, email: student.email || null, assignments });
    }

    // Polite rate limiting — ~5 req/sec
    await sleep(200);
  }

  const outPath = join(__dirname, 'studycore_scores_import_all.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log('\n' + '═'.repeat(58));
  console.log(`Fetch complete`);
  console.log(`  Students with data  : ${output.length}`);
  console.log(`  Assignments written : ${totalAttempts}`);
  console.log(`  Attempts skipped    : ${skippedAttempts}`);
  console.log(`  Output              : ${outPath}`);
  console.log('═'.repeat(58) + '\n');
}

main().catch(err => { console.error('\n❌  Fatal:', err.message); process.exit(1); });
