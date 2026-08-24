'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface InvoiceItem {
  id: string;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

interface Payment {
  id: string;
  amountPaid: string;
  paymentMethod: string;
  referenceNumber: string | null;
  cashierName: string;
  processedAt: string;
}

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
  notes: string | null;
  generatedAt: string;
}

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;
const statusColor: Record<string, string> = {
  PAID: '#10b981', PARTIAL: '#f59e0b', PENDING: '#6366f1', OVERDUE: '#ef4444', CANCELLED: '#64748b',
};

export default function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payment form
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/billing/invoices/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Invoice not found');
      const data = await res.json();
      setInvoice(data.invoice);
      setItems(data.items || []);
      setPayments(data.payments || []);
      setPaymentAmount(parseFloat(data.invoice.balanceDue) > 0 ? parseFloat(data.invoice.balanceDue).toFixed(2) : '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const processPayment = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      setError('Please enter a valid payment amount');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/billing/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          invoiceId: id,
          amountPaid: parseFloat(paymentAmount),
          paymentMethod,
          referenceNumber: referenceNumber || null,
          cashierName: 'Cashier',
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Payment failed');
      }
      setSuccess('✅ Payment recorded successfully!');
      setReferenceNumber('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: string | number) => `ETB ${parseFloat(String(n || 0)).toLocaleString('en', { minimumFractionDigits: 2 })}`;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 56, marginBottom: 16 }}>💰</div><p>Loading invoice…</p></div>
    </div>
  );

  if (error && !invoice) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}><p>{error}</p><button onClick={() => router.back()} style={{ marginTop: 16, padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Go Back</button></div>
    </div>
  );

  if (!invoice) return null;

  const isPaid = invoice.status === 'PAID';
  const balance = parseFloat(invoice.balanceDue);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.push('/cashier')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
          ← Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>Invoice — {invoice.invoiceNumber}</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Generated {new Date(invoice.generatedAt).toLocaleString()}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ padding: '8px 20px', borderRadius: 20, fontWeight: 600, background: `${statusColor[invoice.status] || '#6366f1'}22`, color: statusColor[invoice.status] || '#6366f1', border: `1px solid ${statusColor[invoice.status] || '#6366f1'}44` }}>
            {invoice.status}
          </span>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>

        {/* Left — Invoice Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Patient */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff', fontWeight: 600 }}>👤 Patient</h3>
            <div style={{ display: 'flex', gap: 32 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Name</div>
                <div style={{ fontWeight: 700, color: '#fff', marginTop: 4 }}>{invoice.patientName || 'Unknown'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b' }}>MRN</div>
                <div style={{ fontFamily: 'monospace', color: '#94a3b8', marginTop: 4 }}>{invoice.mrn}</div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: 0, color: '#fff', fontWeight: 600 }}>📋 Charges</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {['Service', 'Code', 'Qty', 'Unit Price', 'Total'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: 500 }}>{item.description}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{item.serviceCode}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{item.quantity}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{fmt(item.unitPrice)}</td>
                    <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 700 }}>{fmt(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 280, marginLeft: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 14 }}>
                  <span>Subtotal</span><span>{fmt(invoice.grandTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: 14 }}>
                  <span>Paid</span><span>− {fmt(invoice.amountPaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: balance > 0 ? '#f59e0b' : '#10b981', fontWeight: 800, fontSize: 18, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                  <span>Balance Due</span><span>{fmt(invoice.balanceDue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ margin: 0, color: '#fff', fontWeight: 600 }}>💳 Payment History</h3>
              </div>
              {payments.map(p => (
                <div key={p.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#10b981' }}>{fmt(p.amountPaid)}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{p.paymentMethod} · {p.cashierName} · {new Date(p.processedAt).toLocaleString()}</div>
                    {p.referenceNumber && <div style={{ fontSize: 12, color: '#64748b' }}>Ref: {p.referenceNumber}</div>}
                  </div>
                  <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>PAID</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Payment Collection */}
        <div>
          {!isPaid && balance > 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, position: 'sticky', top: 24 }}>
              <h3 style={{ margin: '0 0 20px', color: '#fff', fontWeight: 700, fontSize: 18 }}>💳 Collect Payment</h3>

              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '16px 18px', marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#fde68a', marginBottom: 4 }}>AMOUNT DUE</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b' }}>{fmt(invoice.balanceDue)}</div>
              </div>

              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>⚠️ {error}</div>}
              {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, color: '#6ee7b7', fontSize: 13 }}>{success}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#e2e8f0', fontSize: 14 }}>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card (POS)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Amount (ETB)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    step="0.01"
                    min="0.01"
                    max={balance}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#e2e8f0', fontSize: 16, fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>

                {(paymentMethod === 'CARD' || paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'MOBILE_MONEY') && (
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Reference Number</label>
                    <input
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      placeholder="Transaction / approval code"
                      style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <button onClick={processPayment} disabled={saving} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 16, marginTop: 8, opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                  {saving ? 'Processing…' : '✅ Record Payment'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: 20, marginBottom: 8 }}>Fully Paid</div>
              <div style={{ fontSize: 14, color: '#6ee7b7' }}>Total Collected: {fmt(invoice.amountPaid)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
