import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';

interface SentReport {
  id: string;
  student_name: string;
  week_start: string;
  week_end: string;
  sent_at: string;
}

export default async function ReportsPage() {
  const { data: reports, error } = await supabaseAdmin
    .from('sent_reports')
    .select('id, student_name, week_start, week_end, sent_at')
    .order('sent_at', { ascending: false });

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ color: '#1e40af', fontSize: '22px', marginBottom: '20px' }}>Sent Reports</h1>

      {error && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
          Error loading reports: {error.message}
        </div>
      )}

      {!reports || reports.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No reports sent yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Student</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Week</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Sent At</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0' }}></th>
            </tr>
          </thead>
          <tbody>
            {(reports as SentReport[]).map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 500 }}>{r.student_name}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#6b7280' }}>
                  {r.week_start} → {r.week_end}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#6b7280' }}>
                  {new Date(r.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                  <Link href={`/reports/${r.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
