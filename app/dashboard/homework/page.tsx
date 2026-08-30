import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 0;

type HomeworkStudent = {
  id: string;
  name: string;
  next_test_date: string;
  target_score: number | null;
  assignments_since_aug1: number;
  last_assignment: string | null;
  avg_accuracy: number | null;
  days_until_test: number;
  category: 'none' | 'low' | 'active';
};

function StatusBadge({ category, avg_accuracy }: { category: HomeworkStudent['category']; avg_accuracy: number | null }) {
  if (category === 'none') {
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: '#fee2e2', color: '#b91c1c' }}>
        🔴 No Homework
      </span>
    );
  }
  if (category === 'low') {
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: '#fef9c3', color: '#92400e' }}>
        🟡 Low Activity
      </span>
    );
  }
  const warn = avg_accuracy != null && avg_accuracy < 50;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>
      🟢 Active{warn ? ' ⚠' : ''}
    </span>
  );
}

function StudentTable({ students }: { students: HomeworkStudent[] }) {
  if (students.length === 0) {
    return <p style={{ color: '#9ca3af', fontSize: '13px', padding: '8px 0 24px' }}>No students in this group.</p>;
  }
  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '36px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {['Student', 'Test Date', 'Target', 'Assignments', 'Last Assignment', 'Avg Acc %', 'Status'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const testDateRed = s.days_until_test <= 14;
            const accLow = s.avg_accuracy != null && s.avg_accuracy < 50;
            return (
              <tr key={s.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500, color: '#111827' }}>{s.name}</td>
                <td style={{ padding: '10px 12px', color: testDateRed ? '#dc2626' : '#374151', fontWeight: testDateRed ? 600 : 400 }}>
                  {s.next_test_date}
                  {testDateRed && (
                    <span style={{ marginLeft: '6px', fontSize: '11px' }}>({s.days_until_test}d)</span>
                  )}
                </td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>{s.target_score ?? '—'}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: s.assignments_since_aug1 === 0 ? '#dc2626' : s.assignments_since_aug1 <= 4 ? '#d97706' : '#16a34a' }}>
                  {s.assignments_since_aug1}
                </td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>{s.last_assignment ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: accLow ? '#dc2626' : '#374151', fontWeight: accLow ? 600 : 400 }}>
                  {s.avg_accuracy != null ? `${s.avg_accuracy}%` : '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <StatusBadge category={s.category} avg_accuracy={s.avg_accuracy} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function HomeworkPage() {
  const [{ data: students, error: sErr }, { data: assignments }] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select('id, name, next_test_date, target_score')
      .not('next_test_date', 'is', null)
      .order('name'),
    supabaseAdmin
      .from('assignments')
      .select('student_id, assignment_date, accuracy_pct')
      .gte('assignment_date', '2026-08-01'),
  ]);

  if (sErr) throw new Error(sErr.message);

  // Group assignments by student_id
  const map: Record<string, { assignment_date: string; accuracy_pct: number | null }[]> = {};
  for (const a of (assignments ?? [])) {
    if (!map[a.student_id]) map[a.student_id] = [];
    map[a.student_id].push(a);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows: HomeworkStudent[] = (students ?? []).map(s => {
    const asgns = map[s.id] ?? [];
    const count = asgns.length;
    const lastDate = count > 0
      ? asgns.reduce((max, a) => a.assignment_date > max ? a.assignment_date : max, asgns[0].assignment_date)
      : null;
    const accuracies = asgns.map(a => a.accuracy_pct).filter((v): v is number => v != null);
    const avgAcc = accuracies.length > 0
      ? Math.round(accuracies.reduce((sum, v) => sum + v, 0) / accuracies.length)
      : null;
    const testDate = new Date(s.next_test_date + 'T00:00:00');
    const days_until_test = Math.round((testDate.getTime() - today.getTime()) / 86400000);
    const category: HomeworkStudent['category'] = count === 0 ? 'none' : count <= 4 ? 'low' : 'active';

    return {
      id: s.id,
      name: s.name,
      next_test_date: s.next_test_date,
      target_score: s.target_score,
      assignments_since_aug1: count,
      last_assignment: lastDate,
      avg_accuracy: avgAcc,
      days_until_test,
      category,
    };
  });

  // Sort by next_test_date ascending within each category
  rows.sort((a, b) => a.next_test_date.localeCompare(b.next_test_date));

  const none = rows.filter(r => r.category === 'none');
  const low = rows.filter(r => r.category === 'low');
  const active = rows.filter(r => r.category === 'active');

  const summaryCards = [
    { label: 'No Homework', count: none.length, bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', note: '0 assignments' },
    { label: 'Low Activity', count: low.length, bg: '#fef9c3', color: '#92400e', border: '#fde68a', note: '1–4 assignments' },
    { label: 'Active', count: active.length, bg: '#dcfce7', color: '#15803d', border: '#86efac', note: '5+ assignments' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>Homework Tracker</h1>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px' }}>
        {rows.length} students · assignments since Aug 1, 2026
      </p>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '36px', flexWrap: 'wrap' }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px',
            padding: '16px 24px', minWidth: '160px', flex: '1',
          }}>
            <div style={{ fontSize: '30px', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.count}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: c.color, marginTop: '4px' }}>{c.label}</div>
            <div style={{ fontSize: '11px', color: c.color, opacity: 0.7, marginTop: '2px' }}>{c.note}</div>
          </div>
        ))}
      </div>

      {/* No Homework section */}
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#b91c1c', margin: '0 0 10px' }}>
        🔴 No Homework
        <span style={{ fontWeight: 400, fontSize: '13px', color: '#6b7280', marginLeft: '8px' }}>{none.length} students</span>
      </h2>
      <StudentTable students={none} />

      {/* Low Activity section */}
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#92400e', margin: '0 0 10px' }}>
        🟡 Low Activity
        <span style={{ fontWeight: 400, fontSize: '13px', color: '#6b7280', marginLeft: '8px' }}>{low.length} students · 1–4 assignments</span>
      </h2>
      <StudentTable students={low} />

      {/* Active section */}
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#15803d', margin: '0 0 10px' }}>
        🟢 Active
        <span style={{ fontWeight: 400, fontSize: '13px', color: '#6b7280', marginLeft: '8px' }}>{active.length} students · 5+ assignments</span>
      </h2>
      <StudentTable students={active} />
    </div>
  );
}
