'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { TrackerStudent } from '@/lib/tracker';

type SortKey = 'name' | 'status' | 'days_until_test' | 'score_gap' | 'assignments_7d' | 'assignments_14d' | 'latest_composite';
type Dir = 'asc' | 'desc';

const STATUS_ORDER = { on_pace: 0, at_risk: 1, off_track: 2 };
const STATUS_LABEL: Record<string, string> = { on_pace: '🟢 On Pace', at_risk: '🟡 At Risk', off_track: '🔴 Off Track' };
const TREND_LABEL: Record<string, string> = { up: '↑ Up', flat: '→ Flat', down: '↓ Down', insufficient: '–' };
const TREND_COLOR: Record<string, string> = { up: '#16a34a', flat: '#6b7280', down: '#dc2626', insufficient: '#9ca3af' };

const pill: any = (bg: string, color = 'white') => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: '999px',
  fontSize: '12px', fontWeight: 600, background: bg, color,
});

const STATUS_PILL: Record<string, any> = {
  on_pace:  pill('#dcfce7', '#15803d'),
  at_risk:  pill('#fef9c3', '#92400e'),
  off_track: pill('#fee2e2', '#b91c1c'),
};

function EditModal({ student, onClose, onSave }: {
  student: TrackerStudent;
  onClose: () => void;
  onSave: (id: string, next_test_date: string, target_score: string) => void;
}) {
  const [testDate, setTestDate] = useState(student.next_test_date ?? '');
  const [targetScore, setTargetScore] = useState(student.target_score?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setSaving(true); setErr('');
    const res = await fetch('/api/students/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: student.id, next_test_date: testDate, target_score: targetScore }),
    });
    const json = await res.json();
    if (!res.ok) { setErr(json.error ?? 'Error'); setSaving(false); return; }
    onSave(student.id, testDate, targetScore);
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: '10px', padding: '24px', width: '340px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>Edit — {student.name}</h3>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
          Next Test Date
        </label>
        <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
          Target Score
        </label>
        <input type="number" value={targetScore} onChange={e => setTargetScore(e.target.value)}
          placeholder="e.g. 1450"
          style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        {err && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 12px' }}>{err}</p>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', background: '#1e40af', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrackerClient({ students: initial }: { students: TrackerStudent[] }) {
  const [students, setStudents] = useState<TrackerStudent[]>(initial);
  const [filter, setFilter] = useState<'all' | 'on_pace' | 'at_risk' | 'off_track'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<Dir>('asc');
  const [editStudent, setEditStudent] = useState<TrackerStudent | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function handleSave(id: string, next_test_date: string, target_score: string) {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const ts = target_score ? parseInt(target_score, 10) : null;
      const ntd = next_test_date || null;
      const today = new Date(); today.setHours(0,0,0,0);
      const days_until_test = ntd ? Math.round((new Date(ntd + 'T00:00:00').getTime() - today.getTime()) / 86400000) : null;
      const score_gap = (ts != null && s.latest_composite != null) ? ts - s.latest_composite : null;
      return { ...s, next_test_date: ntd, target_score: ts, days_until_test, score_gap };
    }));
  }

  const filtered = useMemo(() => {
    let list = filter === 'all' ? students : students.filter(s => s.status === filter);
    list = [...list].sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'status': va = STATUS_ORDER[a.status]; vb = STATUS_ORDER[b.status]; break;
        case 'days_until_test': va = a.days_until_test ?? 9999; vb = b.days_until_test ?? 9999; break;
        case 'score_gap': va = a.score_gap ?? -9999; vb = b.score_gap ?? -9999; break;
        case 'assignments_7d': va = a.assignments_7d; vb = b.assignments_7d; break;
        case 'assignments_14d': va = a.assignments_14d; vb = b.assignments_14d; break;
        case 'latest_composite': va = a.latest_composite ?? 0; vb = b.latest_composite ?? 0; break;
        default: va = a.name.toLowerCase(); vb = b.name.toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [students, filter, sortKey, sortDir]);

  const counts = useMemo(() => ({
    on_pace: students.filter(s => s.status === 'on_pace').length,
    at_risk: students.filter(s => s.status === 'at_risk').length,
    off_track: students.filter(s => s.status === 'off_track').length,
  }), [students]);

  function SortHeader({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <th onClick={() => handleSort(col)} style={{
        padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600,
        color: active ? '#1e40af' : '#6b7280', cursor: 'pointer', whiteSpace: 'nowrap',
        background: '#f9fafb', borderBottom: '1px solid #e5e7eb', userSelect: 'none',
      }}>
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </th>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>Student Tracker</h1>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
        {students.length} students · updated on page load
      </p>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['all', 'on_pace', 'at_risk', 'off_track'] as const).map(f => {
          const count = f === 'all' ? students.length : counts[f];
          const active = filter === f;
          const colors: Record<string, string> = { all: '#1e40af', on_pace: '#16a34a', at_risk: '#d97706', off_track: '#dc2626' };
          const labels: Record<string, string> = { all: 'All', on_pace: '🟢 On Pace', at_risk: '🟡 At Risk', off_track: '🔴 Off Track' };
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: '999px', border: `1.5px solid ${active ? colors[f] : '#e5e7eb'}`,
              background: active ? colors[f] : 'white', color: active ? 'white' : '#374151',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>
              {labels[f]} · {count}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <SortHeader col="name" label="Student" />
              <SortHeader col="status" label="Status" />
              <SortHeader col="latest_composite" label="Latest" />
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Best</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Target</th>
              <SortHeader col="score_gap" label="Gap" />
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Trend</th>
              <SortHeader col="days_until_test" label="Test Date" />
              <SortHeader col="assignments_7d" label="Asgn 7d" />
              <SortHeader col="assignments_14d" label="Asgn 14d" />
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Asgn 30d</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Acc 7d</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                  <Link href={`/progress/${s.progress_token}`} target="_blank"
                    style={{ color: '#1e40af', textDecoration: 'none' }}>{s.name}</Link>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={STATUS_PILL[s.status]}>{STATUS_LABEL[s.status]}</span>
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>
                  {s.latest_composite ?? '–'}
                </td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>
                  {s.best_composite ?? '–'}
                </td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>
                  {s.target_score ?? '–'}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: s.score_gap == null ? '#9ca3af' : s.score_gap > 100 ? '#dc2626' : s.score_gap > 0 ? '#d97706' : '#16a34a' }}>
                  {s.score_gap == null ? '–' : s.score_gap > 0 ? `+${s.score_gap}` : s.score_gap}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: TREND_COLOR[s.trend] }}>
                  {TREND_LABEL[s.trend]}
                </td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>
                  {s.next_test_date ? (
                    <span>
                      {s.next_test_date}
                      {s.days_until_test != null && (
                        <span style={{ marginLeft: '6px', color: s.days_until_test < 14 ? '#dc2626' : '#6b7280', fontWeight: 600 }}>
                          ({s.days_until_test}d)
                        </span>
                      )}
                    </span>
                  ) : '–'}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: s.assignments_7d === 0 ? '#dc2626' : s.assignments_7d < 3 ? '#d97706' : '#16a34a' }}>
                  {s.assignments_7d}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: s.assignments_14d === 0 ? '#dc2626' : '#374151' }}>
                  {s.assignments_14d}
                </td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>{s.assignments_30d}</td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>
                  {s.avg_accuracy_7d != null ? `${s.avg_accuracy_7d}%` : '–'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => setEditStudent(s)}
                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '5px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', color: '#374151' }}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '32px', fontSize: '14px' }}>No students match this filter.</p>
      )}

      {editStudent && (
        <EditModal student={editStudent} onClose={() => setEditStudent(null)} onSave={handleSave} />
      )}
    </div>
  );
}
