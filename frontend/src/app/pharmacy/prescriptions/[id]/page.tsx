'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pill, User, Stethoscope, Zap, CheckCircle2, AlertTriangle, FileText, XCircle, ArrowLeft } from 'lucide-react';

interface PrescriptionItem {
  id: string;
  medicationName: string;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  route: string;
  quantity: number;
  instructions: string | null;
  status: string;
  dispensedAt: string | null;
  unavailableReason: string | null;
}

interface Prescription {
  id: string;
  rxNumber: string;
  visitId: string;
  patientName: string;
  mrn: string;
  patientDob: string | null;
  patientGender: string | null;
  patientPhone: string | null;
  doctorName: string;
  clinicalNotes: string | null;
  status: string;
  dispensedAt: string | null;
  dispensedBy: string | null;
  createdAt: string;
  items: PrescriptionItem[];
}

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

const statusColor: Record<string, string> = {
  PENDING: '#f59e0b',
  DISPENSED: '#10b981',
  PARTIALLY_DISPENSED: '#3b82f6',
  REJECTED: '#ef4444',
  UNAVAILABLE: '#ef4444',
};

export default function PrescriptionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unavailableModal, setUnavailableModal] = useState<string | null>(null);
  const [unavailableReason, setUnavailableReason] = useState('Out of stock');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/pharmacy/prescriptions/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Prescription not found');
      const data = await res.json();
      setRx(data.prescription);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const dispenseAll = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/pharmacy/prescriptions/${id}/dispense`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to dispense prescription');
      setSuccess('Prescription dispensed successfully.');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const markUnavailable = async (itemId: string) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/pharmacy/prescriptions/${id}/items/${itemId}/unavailable`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: unavailableReason }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      setUnavailableModal(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Pill style={{ width: 56, height: 56, color: '#10b981' }} />
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#10b981' }} />
        <p>Loading prescription…</p>
      </div>
    </div>
  );

  if (error && !rx) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}><p>{error}</p><button onClick={() => router.back()} style={{ marginTop: 16, padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Go Back</button></div>
    </div>
  );

  if (!rx) return null;

  const pendingItems = rx.items.filter(i => i.status === 'PENDING');
  const canDispense = rx.status === 'PENDING' || rx.status === 'PARTIALLY_DISPENSED';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.push('/pharmacy')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
          ← Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>Prescription — {rx.rxNumber}</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Ordered {new Date(rx.createdAt).toLocaleString()}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ padding: '8px 20px', borderRadius: 20, fontWeight: 600, background: `${statusColor[rx.status] || '#6366f1'}22`, color: statusColor[rx.status] || '#6366f1', border: `1px solid ${statusColor[rx.status] || '#6366f1'}44` }}>
            {rx.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>

        {/* Left — Patient & Doctor Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Patient Card */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User style={{ width: 16, height: 16, color: '#94a3b8' }} /> Patient Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div>
                <span style={{ color: '#64748b', fontSize: 12 }}>Name</span>
                <div style={{ color: '#fff', fontWeight: 600, marginTop: 2 }}>{rx.patientName || 'Unknown'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 12 }}>MRN</span>
                <div style={{ color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{rx.mrn}</div>
              </div>
              {rx.patientGender && (
                <div>
                  <span style={{ color: '#64748b', fontSize: 12 }}>Gender</span>
                  <div style={{ color: '#94a3b8', marginTop: 2 }}>{rx.patientGender}</div>
                </div>
              )}
              {rx.patientPhone && (
                <div>
                  <span style={{ color: '#64748b', fontSize: 12 }}>Phone</span>
                  <div style={{ color: '#94a3b8', marginTop: 2 }}>{rx.patientPhone}</div>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Card */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope style={{ width: 16, height: 16, color: '#94a3b8' }} /> Ordering Physician
            </h3>
            <div style={{ color: '#94a3b8', fontSize: 14 }}>{rx.doctorName || 'Unknown Doctor'}</div>
            {rx.clinicalNotes && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 6 }}>CLINICAL NOTES</div>
                <div style={{ fontSize: 13, color: '#c7d2fe', lineHeight: 1.5 }}>{rx.clinicalNotes}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          {canDispense && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#10b981', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap style={{ width: 16, height: 16 }} /> Quick Actions
              </h3>
              {pendingItems.length > 0 ? (
                <button onClick={dispenseAll} disabled={saving} style={{ width: '100%', padding: '14px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                  {saving ? 'Dispensing…' : `Dispense All (${pendingItems.length} item${pendingItems.length > 1 ? 's' : ''})`}
                </button>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#6ee7b7' }}>All items have been handled.</p>
              )}
            </div>
          )}

          {rx.status === 'DISPENSED' && rx.dispensedAt && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8, display: 'flex', justifyContent: 'center' }}><CheckCircle2 style={{ width: 32, height: 32, color: '#10b981' }} /></div>
              <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 4 }}>Dispensed</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                {rx.dispensedBy && <span>By {rx.dispensedBy} · </span>}
                {new Date(rx.dispensedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Right — Medication Items */}
        <div>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill style={{ width: 20, height: 20, color: '#10b981' }} /> Medication Items ({rx.items.length})
          </h2>

          {success && (
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, color: '#6ee7b7', fontWeight: 600 }}>
              {success}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {rx.items.map((item, idx) => (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${item.status === 'DISPENSED' ? 'rgba(16,185,129,0.3)' : item.status === 'UNAVAILABLE' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '20px 22px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>
                      {idx + 1}. {item.medicationName}
                      {item.strength && <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 14 }}> — {item.strength}</span>}
                    </div>
                  </div>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0, background: `${statusColor[item.status] || '#6366f1'}22`, color: statusColor[item.status] || '#6366f1', border: `1px solid ${statusColor[item.status] || '#6366f1'}44` }}>
                    {item.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                  {[
                    { label: 'Dosage', value: item.dosage },
                    { label: 'Frequency', value: item.frequency },
                    { label: 'Duration', value: item.duration },
                    { label: 'Route', value: item.route },
                    { label: 'Quantity', value: item.quantity ? `${item.quantity} unit(s)` : null },
                  ].filter(f => f.value).map(field => (
                    <div key={field.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{field.label}</div>
                      <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{field.value}</div>
                    </div>
                  ))}
                </div>

                {item.instructions && (
                  <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#fde68a', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <FileText style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0 }} /> {item.instructions}
                  </div>
                )}

                {item.status === 'UNAVAILABLE' && item.unavailableReason && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <XCircle style={{ width: 14, height: 14, flexShrink: 0 }} /> Unavailable: {item.unavailableReason}
                  </div>
                )}

                {item.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button
                      onClick={() => { setUnavailableModal(item.id); setUnavailableReason('Out of stock'); }}
                      style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      <XCircle style={{ width: 14, height: 14 }} /> Mark Unavailable
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unavailable Modal */}
      {unavailableModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e2536', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, width: 420, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 20px', color: '#fff' }}>Mark as Unavailable</h3>
            <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Reason</label>
            <select value={unavailableReason} onChange={e => setUnavailableReason(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#e2e8f0', marginBottom: 16, fontSize: 14 }}>
              <option>Out of stock</option>
              <option>Expired</option>
              <option>Substitution required</option>
              <option>Not available in formulary</option>
            </select>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setUnavailableModal(null)} style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => markUnavailable(unavailableModal!)} disabled={saving} style={{ flex: 1, padding: 12, background: '#ef4444', border: 'none', borderRadius: 10, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
