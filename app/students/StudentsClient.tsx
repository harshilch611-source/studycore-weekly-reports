'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  target_score: number | null;
  progress_token: string;
}

const inp: any = { padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const lbl: any = { display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '2px', color: '#374151' };

const SCORE_FIELDS = [
  { key: 'composite', label: 'Composite', full: true },
  { key: 'rw_score', label: 'R/W Score' },
  { key: 'math_score', label: 'Math Score' },
  { key: 'craft_structure', label: 'Craft & Structure' },
  { key: 'expression_ideas', label: 'Expression of Ideas' },
  { key: 'standard_english', label: 'Standard English' },
  { key: 'information_ideas', label: 'Information & Ideas' },
  { key: 'algebra', label: 'Algebra' },
  { key: 'advanced_math', label: 'Advanced Math' },
  { key: 'geometry_trig', label: 'Geometry & Trig' },
];

const blankForm = () => ({
  test_date: new Date().toISOString().split('T')[0],
  composite: '', rw_score: '', math_score: '',
  craft_structure: '', expression_ideas: '', standard_english: '',
  information_ideas: '', algebra: '', advanced_math: '', geometry_trig: '',
  notes: '',
});

export default function StudentsClient({ students }: { students: Student[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(blankForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const toggle = (id: string) => {
    setOpenId(prev => prev === id ? null : id);
    setForm(blankForm());
    setMsg({});
  };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async (studentId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, ...form }),
      });
      if (res.ok) {
        setMsg(m => ({ ...m, [studentId]: '✅ Score saved!' }));
        setForm(blankForm());
        setTimeout(() => { setOpenId(null); setMsg(m => ({ ...m, [studentId]: '' })); }, 1500);
      } else {
        const e = await res.json();
        setMsg(m => ({ ...m, [studentId]: '❌ ' + e.error }));
      }
    } catch {
      setMsg(m => ({ ...m, [studentId]: '❌ Failed to save' }));
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ color: '#1e40af', fontSize: '22px', marginBottom: '20px' }}>Students</h1>

      {students.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No students found. Run <code>/api/setup</code> to seed from students.json.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Name</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Target Score</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <>
                <tr key={s.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={{ padding: '10px 12px', borderBottom: openId === s.id ? 'none' : '1px solid #e2e8f0', fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: '10px 12px', borderBottom: openId === s.id ? 'none' : '1px solid #e2e8f0', color: '#6b7280' }}>
                    {s.target_score ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: openId === s.id ? 'none' : '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => toggle(s.id)}
                        style={{ padding: '4px 10px', background: openId === s.id ? '#e0e7ff' : '#2563eb', color: openId === s.id ? '#3730a3' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        {openId === s.id ? 'Cancel' : '+ Add Score'}
                      </button>
                      <Link href={`/progress/${s.progress_token}`} target="_blank"
                        style={{ padding: '4px 10px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                        View Progress
                      </Link>
                    </div>
                  </td>
                </tr>

                {openId === s.id && (
                  <tr key={`form-${s.id}`} style={{ background: '#f8fafc' }}>
                    <td colSpan={3} style={{ padding: '16px 12px', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ maxWidth: '560px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' as any, marginBottom: '12px' }}>
                          Add Practice Score — {s.name}
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          <label style={lbl}>Test Date</label>
                          <input type="date" value={form.test_date} onChange={e => set('test_date', e.target.value)} style={{ ...inp, width: '180px' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                          {SCORE_FIELDS.filter(f => f.full).map(f => (
                            <div key={f.key} style={{ gridColumn: '1 / -1' }}>
                              <label style={{ ...lbl, color: '#1e40af', fontWeight: 700 }}>{f.label}</label>
                              <input type="number" value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder="e.g. 1400" style={{ ...inp, width: '160px' }} />
                            </div>
                          ))}
                          {SCORE_FIELDS.filter(f => !f.full).map(f => (
                            <div key={f.key}>
                              <label style={lbl}>{f.label}</label>
                              <input type="number" value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder="—" style={inp} />
                            </div>
                          ))}
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={lbl}>Notes</label>
                          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." style={{ ...inp, minHeight: '50px', resize: 'vertical' as any }} />
                        </div>

                        {msg[s.id] && (
                          <div style={{ padding: '8px 10px', background: msg[s.id].includes('✅') ? '#f0fdf4' : '#fef2f2', color: msg[s.id].includes('✅') ? '#166534' : '#991b1b', borderRadius: '4px', fontSize: '12px', marginBottom: '10px' }}>
                            {msg[s.id]}
                          </div>
                        )}

                        <button onClick={() => save(s.id)} disabled={saving || !form.test_date}
                          style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                          {saving ? 'Saving…' : 'Save Score'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
