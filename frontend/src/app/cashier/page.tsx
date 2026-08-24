'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  mrn: string;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
  status: string;
  generatedAt: string;
}

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

const statusColor: Record<string, string> = {
  PAID: '#10b981',
  PARTIAL: '#f59e0b',
  PENDING: '#6366f1',
  OVERDUE: '#ef4444',
  CANCELLED: '#64748b',
};

export default function CashierDashboard() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/billing/invoices`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e: any) {
      setError(e.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = invoices.filter(inv => {
    const matchFilter = filter === 'ALL' || inv.status === filter;
    const matchSearch = !search || 
      (inv.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.mrn || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalRevenue = invoices.reduce((s, i) => s + parseFloat(i.amountPaid || '0'), 0);
  const totalPending = invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((s, i) => s + parseFloat(i.balanceDue || '0'), 0);
  const todayInvoices = invoices.filter(i => {
    const d = new Date(i.generatedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const fmt = (n: string | number) => `ETB ${parseFloat(String(n || 0)).toLocaleString('en', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💰</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Cashier</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Billing & Payment Collection</p>
          </div>
        </div>
        <button onClick={load} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 20px', color: '#f59e0b', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          🔄 Refresh
        </button>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
          {[
            { label: "Today's Revenue", value: fmt(invoices.filter(i => { const d = new Date(i.generatedAt); return d.toDateString() === new Date().toDateString(); }).reduce((s, i) => s + parseFloat(i.amountPaid || '0'), 0)), color: '#10b981', icon: '💵' },
            { label: 'Total Revenue', value: fmt(totalRevenue), color: '#6366f1', icon: '💰' },
            { label: 'Pending Balance', value: fmt(totalPending), color: '#f59e0b', icon: '⏳' },
            { label: "Today's Invoices", value: String(todayInvoices.length), color: '#3b82f6', icon: '📄' },
          ].map(card => (
            <div key={card.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 20px', borderTop: `3px solid ${card.color}` }}>
              <div style={{ fontSize: 28 }}>{card.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: card.color, marginTop: 8 }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient name, MRN, or invoice number…"
            style={{ flex: 1, minWidth: 260, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0', fontSize: 14, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {['ALL', 'PENDING', 'PARTIAL', 'PAID', 'OVERDUE'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '10px 16px', borderRadius: 10, border: '1px solid',
                borderColor: filter === f ? (statusColor[f] || '#6366f1') : 'rgba(255,255,255,0.1)',
                background: filter === f ? `${statusColor[f] || '#6366f1'}22` : 'rgba(255,255,255,0.03)',
                color: filter === f ? (statusColor[f] || '#6366f1') : '#94a3b8',
                cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}>
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
            <p>Loading invoices…</p>
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 40, textAlign: 'center', color: '#fca5a5' }}>
            <p>{error}</p>
            <button onClick={load} style={{ marginTop: 12, padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 80, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
            <h3 style={{ margin: '0 0 8px', color: '#94a3b8' }}>No invoices found</h3>
            <p style={{ margin: 0, fontSize: 14 }}>Invoices are created when services are ordered.</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Invoice #', 'Patient', 'MRN', 'Total', 'Paid', 'Balance', 'Status', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, i) => (
                  <tr key={inv.id}
                    onClick={() => router.push(`/cashier/invoices/${inv.id}`)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)')}
                  >
                    <td style={{ padding: '14px 16px', color: '#6366f1', fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '14px 16px', color: '#fff', fontWeight: 600 }}>{inv.patientName || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{inv.mrn || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#e2e8f0', fontWeight: 600 }}>{fmt(inv.grandTotal)}</td>
                    <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 600 }}>{fmt(inv.amountPaid)}</td>
                    <td style={{ padding: '14px 16px', color: parseFloat(inv.balanceDue) > 0 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>{fmt(inv.balanceDue)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${statusColor[inv.status] || '#6366f1'}22`, color: statusColor[inv.status] || '#6366f1', border: `1px solid ${statusColor[inv.status] || '#6366f1'}33` }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 12 }}>{new Date(inv.generatedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
