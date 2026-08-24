'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pill, RefreshCw, Clock, CheckCircle2, ClipboardList, AlertTriangle, Stethoscope, ArrowRight, Loader2 } from 'lucide-react';

interface Prescription {
  id: string;
  rxNumber: string;
  visitId: string;
  patientName: string;
  mrn: string;
  doctorName: string;
  clinicalNotes: string;
  status: string;
  dispensedAt: string | null;
  createdAt: string;
}

interface Summary {
  pending: number;
  dispensedToday: number;
  totalToday: number;
  rejected: number;
  partiallyDispensed: number;
}

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

const statusColor: Record<string, string> = {
  PENDING: '#f59e0b',
  DISPENSED: '#10b981',
  PARTIALLY_DISPENSED: '#3b82f6',
  REJECTED: '#ef4444',
};

const statusLabel: Record<string, string> = {
  PENDING: 'Pending',
  DISPENSED: 'Dispensed',
  PARTIALLY_DISPENSED: 'Partial',
  REJECTED: 'Rejected',
};

export default function PharmacyDashboard() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rxRes, sumRes] = await Promise.all([
        fetch(`${API}/pharmacy/prescriptions`, { credentials: 'include' }),
        fetch(`${API}/pharmacy/summary`, { credentials: 'include' }),
      ]);
      if (!rxRes.ok) throw new Error('Failed to load prescriptions');
      const rxData = await rxRes.json();
      const sumData = sumRes.ok ? await sumRes.json() : null;
      setPrescriptions(rxData.prescriptions || []);
      setSummary(sumData);
    } catch (e: any) {
      setError(e.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'ALL'
    ? prescriptions
    : prescriptions.filter(p => p.status === filter);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill style={{ width: 22, height: 22, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Pharmacy</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Prescription Management</p>
          </div>
        </div>
        <button onClick={load} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 20px', color: '#10b981', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw style={{ width: 16, height: 16 }} /> Refresh
        </button>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>
        {/* Stats Cards */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
            {[
              { label: 'Pending', value: summary.pending, color: '#f59e0b', Icon: Clock },
              { label: 'Dispensed Today', value: summary.dispensedToday, color: '#10b981', Icon: CheckCircle2 },
              { label: 'Total Today', value: summary.totalToday, color: '#6366f1', Icon: ClipboardList },
              { label: 'Rejected/Partial', value: summary.rejected + summary.partiallyDispensed, color: '#ef4444', Icon: AlertTriangle },
            ].map(card => (
              <div key={card.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 20px', borderTop: `3px solid ${card.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}><card.Icon style={{ width: 28, height: 28, color: card.color }} /></div>
                <div style={{ fontSize: 36, fontWeight: 800, color: card.color, marginTop: 8 }}>{card.value}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['ALL', 'PENDING', 'DISPENSED', 'PARTIALLY_DISPENSED', 'REJECTED'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid',
              borderColor: filter === f ? (statusColor[f] || '#6366f1') : 'rgba(255,255,255,0.1)',
              background: filter === f ? `${statusColor[f] || '#6366f1'}22` : 'rgba(255,255,255,0.03)',
              color: filter === f ? (statusColor[f] || '#6366f1') : '#94a3b8',
              cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
            }}>
              {f === 'ALL' ? 'All' : (statusLabel[f] || f)}
            </button>
          ))}
        </div>

        {/* Prescriptions Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Pill style={{ width: 48, height: 48, color: '#10b981', opacity: 0.4 }} />
            <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#10b981' }} />
            <p>Loading prescriptions…</p>
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 40, textAlign: 'center', color: '#fca5a5', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <AlertTriangle style={{ width: 40, height: 40, color: '#ef4444' }} />
            <p>{error}</p>
            <button onClick={load} style={{ marginTop: 12, padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 80, textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Pill style={{ width: 64, height: 64, color: '#10b981', opacity: 0.3 }} />
            <h3 style={{ margin: '0 0 8px', color: '#94a3b8', fontWeight: 600 }}>No prescriptions found</h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              {filter === 'ALL'
                ? 'When doctors create prescriptions, they will appear here.'
                : `No ${statusLabel[filter]?.toLowerCase() || filter} prescriptions.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(rx => (
              <div key={rx.id}
                onClick={() => router.push(`/pharmacy/prescriptions/${rx.id}`)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${statusColor[rx.status] || '#6366f1'}22`, border: `2px solid ${statusColor[rx.status] || '#6366f1'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pill style={{ width: 22, height: 22, color: statusColor[rx.status] || '#6366f1' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>{rx.patientName || 'Unknown Patient'}</span>
                      <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{rx.mrn}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#94a3b8', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Stethoscope style={{ width: 12, height: 12 }} /> {rx.doctorName || 'Unknown Doctor'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ClipboardList style={{ width: 12, height: 12 }} /> {rx.rxNumber}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock style={{ width: 12, height: 12 }} /> {timeAgo(rx.createdAt)}</span>
                    </div>
                    {rx.clinicalNotes && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                        "{rx.clinicalNotes.substring(0, 80)}{rx.clinicalNotes.length > 80 ? '…' : ''}"
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: `${statusColor[rx.status] || '#6366f1'}22`, color: statusColor[rx.status] || '#6366f1', border: `1px solid ${statusColor[rx.status] || '#6366f1'}44` }}>
                    {statusLabel[rx.status] || rx.status}
                  </span>
                  <span style={{ color: '#94a3b8' }}><ArrowRight style={{ width: 18, height: 18 }} /></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
