'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) { router.push('/dashboard'); }
      else { setError('Invalid credentials'); }
    } catch { setError('An error occurred'); }
    finally { setLoading(false); }
  };

  const s: any = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
    h1: { color: '#2563eb', fontSize: '28px', fontWeight: '700', textAlign: 'center', margin: '0 0 8px 0' },
    h2: { fontSize: '18px', fontWeight: '600', color: '#1f2937', textAlign: 'center', margin: '0 0 30px 0' },
    label: { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '5px' },
    input: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as any, marginBottom: '15px' },
    btn: { width: '100%', padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
    err: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px' },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.h1}>StudyCore</h1>
        <h2 style={s.h2}>Weekly Reports</h2>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={s.input} required />
          <label style={s.label}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={s.input} required />
          {error && <div style={s.err}>{error}</div>}
          <button type="submit" disabled={loading} style={s.btn}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '20px', textAlign: 'center' }}>SSC and admins only</p>
      </div>
    </div>
  );
}
