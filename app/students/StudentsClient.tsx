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

const blankScoreForm = () => ({
  test_date: new Date().toISOString().split('T')[0],
  target_score: '',
  composite: '', rw_score: '', math_score: '',
  craft_structure: '', expression_ideas: '', standard_english: '',
  information_ideas: '', algebra: '', advanced_math: '', geometry_trig: '',
  notes: '',
});

const blankStudentForm = () => ({
  name: '', parentEmail: '', studentEmail: '', targetScore: '',
});

export default function StudentsClient({ students: initial }: { students: Student[] }) {
  const [students, setStudents] = useState<Student[]>(initial);

  // Add-student form state
  const [showAdd, setShowAdd] = useState(false);
  const [studentForm, setStudentForm] = useState(blankStudentForm());
  const [addSaving, setAddSaving] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  // Add-score form state
  const [openId, setOpenId] = useState<string | null>(null);
  const [scoreForm, setScoreForm] = useState<Record<string, string>>(blankScoreForm());
  const [saving, setSaving] = useState(false);
  const [scoreMsg, setScoreMsg] = useState<Record<string, string>>({});

  const toggleScore = (id: string) => {
    setOpenId(prev => prev === id ? null : id);
    setScoreForm(blankScoreForm());
    setScoreMsg({});
  };

  const setScore = (k: string, v: string) => setScoreForm(p => ({ ...p, [k]: v }));
  const setStudent = (k: string, v: string) => setStudentForm(p => ({ ...p, [k]: v }));

  // Add student
  const addStudent = async () => {
    if (!studentForm.name.trim()) return;
    setAddSaving(true); setAddMsg('');
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm),
      });
      const json = await res.json();
      if (res.ok) {
        setStudents(prev => [...prev, json.student].sort((a, b) => a.name.localeCompare(b.name)));
        setStudentForm(blankStudentForm());
        setShowAdd(false);
        setAddMsg('');
      } else {
        setAddMsg('❌ ' + json.error);
      }
    } catch {
      setAddMsg('❌ Failed to add student');
    }
    setAddSaving(false);
  };

  // Save score (also updates target_score on the student if provided)
  const saveScore = async (studentId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, ...scoreForm }),
      });
      if (res.ok) {
        // Update local target_score if one was entered
        if (scoreForm.target_score) {
          setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, target_score: Number(scoreForm.target_score) } : s
          ));
        }
        setScoreMsg(m => ({ ...m, [studentId]: '✅ Score saved!' }));
        setScoreForm(blankScoreForm());
        setTimeout(() => { setOpenId(null); setScoreMsg(m => ({ ...m, [studentId]: '' })); }, 1500);
      } else {
        const e = await res.json();
        setScoreMsg(m => ({ ...m, [studentId]: '❌ ' + e.error }));
      }
    } catch {
      setScoreMsg(m => ({ ...m, [studentId]: '❌ Failed to save' }));
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ color: '#1e40af', fontSize: '22px', margin: 0 }}>Students</h1>
        <button
          onClick={() => { setShowAdd(p => !p); setAddMsg(''); setStudentForm(blankStudentForm()); }}
          style={{ padding: '7px 16px', background: showAdd ? '#e0e7ff' : '#2563eb', color: showAdd ? '#3730a3' : 'white', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          {showAdd ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {/* Add Student inline form */}
      {showAdd && (
        <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' as any, letterSpacing: '0.05em', marginBottom: '14px' }}>
            New Student
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="text" value={studentForm.name} onChange={e => setStudent('name', e.target.value)} placeholder="Full name" style={inp} />
            </div>
            <div>
              <label style={lbl}>Parent Email</label>
              <input type="email" value={studentForm.parentEmail} onChange={e => setStudent('parentEmail', e.target.value)} placeholder="parent@email.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Student Email</label>
              <input type="email" value={studentForm.studentEmail} onChange={e => setStudent('studentEmail', e.target.value)} placeholder="student@email.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Target Score</label>
              <input type="number" value={studentForm.targetScore} onChange={e => setStudent('targetScore', e.target.value)} placeholder="e.g. 1500" style={inp} />
            </div>
          </div>
          {addMsg && (
            <div style={{ padding: '8px 10px', background: '#fef2f2', color: '#991b1b', borderRadius: '4px', fontSize: '12px', marginBottom: '10px' }}>{addMsg}</div>
          )}
          <button onClick={addStudent} disabled={addSaving || !studentForm.name.trim()}
            style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: addSaving || !studentForm.name.trim() ? 0.6 : 1 }}>
            {addSaving ? 'Adding…' : 'Add Student'}
          </button>
        </div>
      )}

      {students.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No students found. Run <code>/api/setup</code> to seed from students.json, or add one above.</p>
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
                      <button onClick={() => toggleScore(s.id)}
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                          <div>
                            <label style={lbl}>Test Date</label>
                            <input type="date" value={scoreForm.test_date} onChange={e => setScore('test_date', e.target.value)} style={inp} />
                          </div>
                          <div>
                            <label style={{ ...lbl, color: '#7c3aed' }}>Update Target Score <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                            <input type="number" value={scoreForm.target_score} onChange={e => setScore('target_score', e.target.value)} placeholder={s.target_score ? String(s.target_score) : 'e.g. 1500'} style={{ ...inp, borderColor: '#c4b5fd' }} />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                          {SCORE_FIELDS.filter(f => f.full).map(f => (
                            <div key={f.key} style={{ gridColumn: '1 / -1' }}>
                              <label style={{ ...lbl, color: '#1e40af', fontWeight: 700 }}>{f.label}</label>
                              <input type="number" value={scoreForm[f.key]} onChange={e => setScore(f.key, e.target.value)} placeholder="e.g. 1400" style={{ ...inp, width: '160px' }} />
                            </div>
                          ))}
                          {SCORE_FIELDS.filter(f => !f.full).map(f => (
                            <div key={f.key}>
                              <label style={lbl}>{f.label}</label>
                              <input type="number" value={scoreForm[f.key]} onChange={e => setScore(f.key, e.target.value)} placeholder="—" style={inp} />
                            </div>
                          ))}
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={lbl}>Notes</label>
                          <textarea value={scoreForm.notes} onChange={e => setScore('notes', e.target.value)} placeholder="Optional notes..." style={{ ...inp, minHeight: '50px', resize: 'vertical' as any }} />
                        </div>

                        {scoreMsg[s.id] && (
                          <div style={{ padding: '8px 10px', background: scoreMsg[s.id].includes('✅') ? '#f0fdf4' : '#fef2f2', color: scoreMsg[s.id].includes('✅') ? '#166534' : '#991b1b', borderRadius: '4px', fontSize: '12px', marginBottom: '10px' }}>
                            {scoreMsg[s.id]}
                          </div>
                        )}

                        <button onClick={() => saveScore(s.id)} disabled={saving || !scoreForm.test_date}
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
