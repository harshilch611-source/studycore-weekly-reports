'use client';
import { useState, useRef } from 'react';
import studentsData from '@/lib/students.json';

interface Student { studentName: string; parentEmail: string; studentEmail: string; }
const students: Student[] = studentsData as any;

interface Session {
  date: string;
  tutorName: string;
  topicsCovered: string;
  wentWell: string;
  needsWork: string;
  homeworkAssigned: string;
}

const inp: any = { width: '100%', padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' as any, fontFamily: 'inherit' };
const sec = (title: string) => ({ fontSize: '14px', fontWeight: '600' as any, color: '#1e40af', borderBottom: '2px solid #2563eb', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase' as any });
const lbl: any = { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '3px' };

const blankSession = (): Session => ({
  date: new Date().toISOString().split('T')[0],
  tutorName: '',
  topicsCovered: '',
  wentWell: '',
  needsWork: '',
  homeworkAssigned: '',
});

const concepts = [
  'Algebra', 'Advanced Math', 'Geometry & Trig', 'Words in Context',
  'Craft & Structure', 'Transitions', 'Rhetorical Synthesis', 'SEC',
  'Information & Ideas', 'Expression of Ideas',
];

export default function Dashboard() {
  const [form, setForm] = useState({
    studentName: '', parentEmail: '', studentEmail: '',
    weekStart: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    weekEnd: new Date().toISOString().split('T')[0],
    currentScore: '', scoreChange: '', targetScore: '',
    conceptsMastered: [] as string[],
    overallProgress: '', gamePlanChanges: '', nextWeekPriorities: '',
  });
  const [sessions, setSessions] = useState<Session[]>([blankSession()]);
  const [gamePlanPDF, setGamePlanPDF] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggle = (c: string) => set('conceptsMastered', form.conceptsMastered.includes(c) ? form.conceptsMastered.filter(x => x !== c) : [...form.conceptsMastered, c]);

  const searchStudent = (v: string) => {
    set('studentName', v);
    setSuggestions(v.length > 0 ? students.filter(s => s.studentName.toLowerCase().includes(v.toLowerCase())).slice(0, 6) : []);
  };
  const selectStudent = (s: Student) => {
    setForm(p => ({ ...p, studentName: s.studentName, parentEmail: s.parentEmail, studentEmail: s.studentEmail }));
    setSuggestions([]);
  };

  const setSession = (i: number, k: keyof Session, v: string) => {
    setSessions(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  };
  const addSession = () => {
    if (sessions.length < 5) setSessions(prev => [...prev, blankSession()]);
  };
  const removeSession = (i: number) => {
    if (sessions.length > 1) setSessions(prev => prev.filter((_, idx) => idx !== i));
  };

  const handlePDFFile = (file: File) => {
    if (file.type === 'application/pdf') setGamePlanPDF(file);
  };

  const send = async () => {
    setLoading(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('studentName', form.studentName);
      fd.append('parentEmail', form.parentEmail);
      fd.append('studentEmail', form.studentEmail);
      fd.append('weekStart', form.weekStart);
      fd.append('weekEnd', form.weekEnd);
      fd.append('currentScore', form.currentScore);
      fd.append('scoreChange', form.scoreChange);
      fd.append('targetScore', form.targetScore);
      fd.append('overallProgress', form.overallProgress);
      fd.append('gamePlanChanges', form.gamePlanChanges);
      fd.append('nextWeekPriorities', form.nextWeekPriorities);
      fd.append('conceptsMastered', JSON.stringify(form.conceptsMastered));
      fd.append('sessions', JSON.stringify(sessions));
      if (gamePlanPDF) fd.append('gamePlanPDF', gamePlanPDF);

      const res = await fetch('/api/send-report', { method: 'POST', body: fd });
      if (res.ok) {
        setMsg('✅ Report sent to parent and student!');
        setForm(p => ({ ...p, studentName: '', parentEmail: '', studentEmail: '', currentScore: '', scoreChange: '', targetScore: '', conceptsMastered: [], overallProgress: '', gamePlanChanges: '', nextWeekPriorities: '' }));
        setSessions([blankSession()]);
        setGamePlanPDF(null);
      } else {
        const e = await res.json();
        setMsg('❌ Error: ' + e.error);
      }
    } catch { setMsg('❌ Failed to send'); }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ color: '#1e40af', marginBottom: '25px', fontSize: '24px' }}>📊 Weekly Report</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '30px', alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div>
          {/* Student */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Student') as any}>Student</h2>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <label style={lbl}>Name</label>
              <input type="text" value={form.studentName} onChange={e => searchStudent(e.target.value)} placeholder="Type to search..." style={inp} />
              {suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #d1d5db', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 10 }}>
                  {suggestions.map((s, i) => (
                    <div key={i} onClick={() => selectStudent(s)} style={{ padding: '8px 9px', cursor: 'pointer', fontSize: '13px', borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}>
                      {s.studentName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '10px' }}><label style={lbl}>Parent Email</label><input type="email" value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Student Email</label><input type="email" value={form.studentEmail} onChange={e => set('studentEmail', e.target.value)} style={inp} /></div>
          </div>

          {/* Week */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Week') as any}>Week</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><label style={lbl}>Start</label><input type="date" value={form.weekStart} onChange={e => set('weekStart', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>End</label><input type="date" value={form.weekEnd} onChange={e => set('weekEnd', e.target.value)} style={inp} /></div>
            </div>
          </div>

          {/* Score */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Score') as any}>Score</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div><label style={lbl}>Current</label><input type="number" value={form.currentScore} onChange={e => set('currentScore', e.target.value)} placeholder="1430" style={inp} /></div>
              <div><label style={lbl}>Change</label><input type="text" value={form.scoreChange} onChange={e => set('scoreChange', e.target.value)} placeholder="+15" style={inp} /></div>
              <div><label style={lbl}>Target</label><input type="number" value={form.targetScore} onChange={e => set('targetScore', e.target.value)} placeholder="1500" style={inp} /></div>
            </div>
          </div>

          {/* Concepts Mastered */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Concepts') as any}>Concepts Mastered</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {concepts.map(c => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.conceptsMastered.includes(c)} onChange={() => toggle(c)} style={{ marginRight: '6px', width: 'auto', cursor: 'pointer' }} />
                  {c}
                </label>
              ))}
            </div>
          </div>

          {/* Textareas */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Summary') as any}>Summary</h2>
            <div style={{ marginBottom: '10px' }}>
              <label style={lbl}>Overall Progress</label>
              <textarea value={form.overallProgress} onChange={e => set('overallProgress', e.target.value)} placeholder="Key wins, areas of focus..." style={{ ...inp, minHeight: '70px', resize: 'vertical' as any }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={lbl}>Gameplan Changes</label>
              <textarea value={form.gamePlanChanges} onChange={e => set('gamePlanChanges', e.target.value)} placeholder="No changes, or describe updates..." style={{ ...inp, minHeight: '60px', resize: 'vertical' as any }} />
            </div>

            {/* PDF Upload */}
            <div style={{ marginBottom: '10px' }}>
              <label style={lbl}>Gameplan PDF <span style={{ fontWeight: 400, color: '#6b7280' }}>(optional)</span></label>
              <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePDFFile(f); e.target.value = ''; }} />
              {gamePlanPDF ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '13px', color: '#1e40af' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as any }}>📄 {gamePlanPDF.name}</span>
                  <button onClick={() => setGamePlanPDF(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }} title="Remove">✕</button>
                </div>
              ) : (
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handlePDFFile(f); }}
                  style={{ border: `2px dashed ${dragOver ? '#2563eb' : '#93c5fd'}`, borderRadius: '4px', padding: '14px 10px', textAlign: 'center' as any, cursor: 'pointer', background: dragOver ? '#eff6ff' : '#f8fafc', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>📁</div>
                  <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500 }}>Drop PDF here or click to upload</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>PDF files only</div>
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>Next Week Priorities</label>
              <textarea value={form.nextWeekPriorities} onChange={e => set('nextWeekPriorities', e.target.value)} placeholder="2-3 key priorities..." style={{ ...inp, minHeight: '60px', resize: 'vertical' as any }} />
            </div>
          </div>

          {msg && <div style={{ padding: '10px', backgroundColor: msg.includes('✅') ? '#f0fdf4' : '#fef2f2', color: msg.includes('✅') ? '#166534' : '#991b1b', borderRadius: '4px', fontSize: '13px', marginBottom: '15px' }}>{msg}</div>}

          <button onClick={send} disabled={loading || !form.studentName || !form.parentEmail}
            style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', opacity: loading || !form.studentName ? 0.7 : 1 }}>
            {loading ? '⏳ Sending...' : '📧 Send Report'}
          </button>
        </div>

        {/* RIGHT COLUMN — Session Blocks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ ...sec('Sessions') as any, marginBottom: 0, borderBottom: 'none' }}>Sessions</h2>
            {sessions.length < 5 && (
              <button onClick={addSession} style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                + Add Session
              </button>
            )}
          </div>
          <div style={{ borderBottom: '2px solid #2563eb', marginBottom: '16px' }} />

          {sessions.map((session, i) => (
            <div key={i} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', marginBottom: '16px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase' as any }}>Session {i + 1}</span>
                {sessions.length > 1 && (
                  <button onClick={() => removeSession(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', lineHeight: 1, padding: '0 4px' }} title="Remove session">✕</button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" value={session.date} onChange={e => setSession(i, 'date', e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Tutor Name</label>
                  <input type="text" value={session.tutorName} onChange={e => setSession(i, 'tutorName', e.target.value)} placeholder="Tutor name" style={inp} />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={lbl}>Topics Covered</label>
                <input type="text" value={session.topicsCovered} onChange={e => setSession(i, 'topicsCovered', e.target.value)} placeholder="e.g. Algebra, Craft & Structure" style={inp} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ ...lbl, color: '#059669' }}>What Went Well</label>
                <textarea value={session.wentWell} onChange={e => setSession(i, 'wentWell', e.target.value)} placeholder="Strengths and wins this session..." style={{ ...inp, minHeight: '60px', resize: 'vertical' as any, borderColor: '#86efac' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ ...lbl, color: '#d97706' }}>Needs Work</label>
                <textarea value={session.needsWork} onChange={e => setSession(i, 'needsWork', e.target.value)} placeholder="Areas to improve..." style={{ ...inp, minHeight: '60px', resize: 'vertical' as any, borderColor: '#fcd34d' }} />
              </div>

              <div>
                <label style={lbl}>Homework Assigned</label>
                <input type="text" value={session.homeworkAssigned} onChange={e => setSession(i, 'homeworkAssigned', e.target.value)} placeholder="e.g. Khan Academy module 3, practice test" style={inp} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
