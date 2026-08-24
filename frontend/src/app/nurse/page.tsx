'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Admission {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bedId: string;
  bedNumber: string;
  reason: string;
  doctorNotes: string | null;
  status: string;
  admittedAt: string;
}

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

const conditionColor: Record<string, string> = {
  STABLE: '#10b981',
  IMPROVING: '#3b82f6',
  GUARDED: '#f59e0b',
  CRITICAL: '#ef4444',
};

export default function NurseDashboard() {
  const router = useRouter();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/wards/admissions`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load admissions');
      const data = await res.json();
      setAdmissions(data.admissions || []);
    } catch (e: any) {
      setError(e.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = admissions.filter(a =>
    !search ||
    (a.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.mrn || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.bedNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Admitted today';
    return `Day ${days + 1}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏥</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Nursing Station</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Ward Patient Management</p>
          </div>
        </div>
        <button onClick={load} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '10px 20px', color: '#818cf8', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          🔄 Refresh
        </button>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
          {[
            { label: 'Total Inpatients', value: admissions.length, color: '#6366f1', icon: '🛏️' },
            { label: 'Admitted Today', value: admissions.filter(a => { const d = new Date(a.admittedAt); return d.toDateString() === new Date().toDateString(); }).length, color: '#10b981', icon: '📋' },
            { label: 'Long Stay (>3 days)', value: admissions.filter(a => { const diff = Date.now() - new Date(a.admittedAt).getTime(); return diff > 3 * 86400000; }).length, color: '#f59e0b', icon: '📅' },
            { label: 'Active Admissions', value: admissions.filter(a => a.status === 'ACTIVE').length, color: '#3b82f6', icon: '✅' },
          ].map(card => (
            <div key={card.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 20px', borderTop: `3px solid ${card.color}` }}>
              <div style={{ fontSize: 28 }}>{card.icon}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: card.color, marginTop: 8 }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by patient name, MRN, or bed number…"
            style={{ width: '100%', maxWidth: 480, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Patients Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
            <p>Loading patients…</p>
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 40, textAlign: 'center', color: '#fca5a5' }}>
            <p>{error}</p>
            <button onClick={load} style={{ marginTop: 12, padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 80, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛏️</div>
            <h3 style={{ margin: '0 0 8px', color: '#94a3b8' }}>No admitted patients</h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              {search ? 'No patients matching your search.' : 'When doctors admit patients, they will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filtered.map(adm => (
              <div key={adm.id}
                onClick={() => router.push(`/nurse/patients/${adm.id}`)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 22, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 14 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                {/* Patient Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                      {(adm.patientName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{adm.patientName || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{adm.mrn}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#818cf8', fontSize: 15 }}>🛏️ {adm.bedNumber || '—'}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{daysSince(adm.admittedAt)}</div>
                  </div>
                </div>

                {/* Reason */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admission Reason</div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>{adm.reason}</div>
                </div>

                {adm.doctorNotes && (
                  <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: '10px 12px', borderLeft: '3px solid rgba(99,102,241,0.5)' }}>
                    <div style={{ fontSize: 11, color: '#818cf8', marginBottom: 4, fontWeight: 600 }}>DOCTOR NOTES</div>
                    <div style={{ fontSize: 12, color: '#c7d2fe', lineHeight: 1.4 }}>{adm.doctorNotes.substring(0, 100)}{adm.doctorNotes.length > 100 ? '…' : ''}</div>
                  </div>
                )}

                {/* Admitted date + action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Admitted {new Date(adm.admittedAt).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: 13, color: '#818cf8', fontWeight: 600 }}>View Chart →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
