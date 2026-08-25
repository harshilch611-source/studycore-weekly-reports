'use client';
import { useState } from 'react';
import studentsData from '@/lib/students.json';

interface Student { studentName: string; parentEmail: string; studentEmail: string; }
const students: Student[] = studentsData as any;

const inp: any = { width: '100%', padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' as any, fontFamily: 'inherit' };
const sec = (title: string) => ({ fontSize: '14px', fontWeight: '600' as any, color: '#1e40af', borderBottom: '2px solid #2563eb', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase' as any });
const lbl: any = { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '3px' };

export default function Dashboard() {
  const [form, setForm] = useState({
    studentName: '', parentEmail: '', studentEmail: '', tutorName: '',
    weekStart: new Date(new Date().setDate(new Date().getDate()-7)).toISOString().split('T')[0],
    weekEnd: new Date().toISOString().split('T')[0],
    currentScore: '', scoreChange: '', sessionsAttended: '2',
    attendance: 'Attended all sessions', homework: 'Completed all',
    conceptsMastered: [] as string[], tutorComment: '', gamePlanChanges: '', nextWeekPriorities: '',
  });
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggle = (c: string) => set('conceptsMastered', form.conceptsMastered.includes(c) ? form.conceptsMastered.filter(x => x !== c) : [...form.conceptsMastered, c]);

  const searchStudent = (v: string) => {
    set('studentName', v);
    setSuggestions(v.length > 0 ? students.filter(s => s.studentName.toLowerCase().includes(v.toLowerCase())).slice(0,6) : []);
  };
  const selectStudent = (s: Student) => {
    setForm(p => ({ ...p, studentName: s.studentName, parentEmail: s.parentEmail, studentEmail: s.studentEmail }));
    setSuggestions([]);
  };

  const send = async () => {
    setLoading(true); setMsg('');
    try {
      const res = await fetch('/api/send-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        setMsg('✅ Report sent to parent and student!');
        setForm(p => ({ ...p, studentName: '', parentEmail: '', studentEmail: '', tutorName: '', currentScore: '', scoreChange: '', conceptsMastered: [], tutorComment: '', gamePlanChanges: '', nextWeekPriorities: '' }));
      } else {
        const e = await res.json();
        setMsg('❌ Error: ' + e.error);
      }
    } catch { setMsg('❌ Failed to send'); }
    setLoading(false);
  };

  const concepts = ['Algebra','Advanced Math','Geometry & Trig','Words in Context','Craft & Structure','Transitions','Rhetorical Synthesis','SEC'];

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ color: '#1e40af', marginBottom: '25px', fontSize: '24px' }}>📊 Weekly Report</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>

        {/* LEFT */}
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Student') as any}>Student</h2>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <label style={lbl}>Name</label>
              <input type="text" value={form.studentName} onChange={e => searchStudent(e.target.value)} placeholder="Type to search..." style={inp} />
              {suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #d1d5db', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 10 }}>
                  {suggestions.map((s, i) => (
                    <div key={i} onClick={() => selectStudent(s)} style={{ padding: '8px 9px', cursor: 'pointer', fontSize: '13px', borderBottom: i < suggestions.length-1 ? '1px solid #f3f4f6' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}>
                      {s.studentName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '10px' }}><label style={lbl}>Parent Email</label><input type="email" value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)} style={inp} /></div>
            <div style={{ marginBottom: '10px' }}><label style={lbl}>Student Email</label><input type="email" value={form.studentEmail} onChange={e => set('studentEmail', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Tutor</label><input type="text" value={form.tutorName} onChange={e => set('tutorName', e.target.value)} placeholder="Tutor name" style={inp} /></div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Week') as any}>Week</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><label style={lbl}>Start</label><input type="date" value={form.weekStart} onChange={e => set('weekStart', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>End</label><input type="date" value={form.weekEnd} onChange={e => set('weekEnd', e.target.value)} style={inp} /></div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Score') as any}>Score</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><label style={lbl}>Current</label><input type="number" value={form.currentScore} onChange={e => set('currentScore', e.target.value)} placeholder="1430" style={inp} /></div>
              <div><label style={lbl}>Change</label><input type="text" value={form.scoreChange} onChange={e => set('scoreChange', e.target.value)} placeholder="+15" style={inp} /></div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Engagement') as any}>Engagement</h2>
            <div style={{ marginBottom: '10px' }}><label style={lbl}>Sessions</label><input type="number" value={form.sessionsAttended} onChange={e => set('sessionsAttended', e.target.value)} min="0" style={inp} /></div>
            <div style={{ marginBottom: '10px' }}>
              <label style={lbl}>Attendance</label>
              <select value={form.attendance} onChange={e => set('attendance', e.target.value)} style={inp}>
                <option>Attended all sessions</option><option>Attended most sessions</option><option>Missed some sessions</option><option>No sessions this week</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Homework</label>
              <select value={form.homework} onChange={e => set('homework', e.target.value)} style={inp}>
                <option>Completed all</option><option>Completed most</option><option>Incomplete</option><option>Not submitted</option>
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
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

          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Feedback') as any}>Tutor Feedback</h2>
            <textarea value={form.tutorComment} onChange={e => set('tutorComment', e.target.value)} placeholder="Key wins, areas of focus..." style={{ ...inp, minHeight: '80px', resize: 'vertical' as any }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={sec('Updates') as any}>Updates</h2>
            <div style={{ marginBottom: '10px' }}><label style={lbl}>Gameplan Changes</label><textarea value={form.gamePlanChanges} onChange={e => set('gamePlanChanges', e.target.value)} placeholder="No changes, or describe updates..." style={{ ...inp, minHeight: '60px', resize: 'vertical' as any }} /></div>
            <div><label style={lbl}>Next Week Priorities</label><textarea value={form.nextWeekPriorities} onChange={e => set('nextWeekPriorities', e.target.value)} placeholder="2-3 key priorities..." style={{ ...inp, minHeight: '60px', resize: 'vertical' as any }} /></div>
          </div>

          {msg && <div style={{ padding: '10px', backgroundColor: msg.includes('✅') ? '#f0fdf4' : '#fef2f2', color: msg.includes('✅') ? '#166534' : '#991b1b', borderRadius: '4px', fontSize: '13px', marginBottom: '15px' }}>{msg}</div>}

          <button onClick={send} disabled={loading || !form.studentName || !form.parentEmail}
            style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', opacity: loading || !form.studentName ? 0.7 : 1 }}>
            {loading ? '⏳ Sending...' : '📧 Send Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
