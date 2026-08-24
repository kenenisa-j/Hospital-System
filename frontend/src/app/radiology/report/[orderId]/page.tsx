'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ScanLine, ClipboardList, Zap, CheckCircle2, AlertTriangle, FileText, Lightbulb, Upload, ArrowLeft, Play, CalendarCheck } from 'lucide-react';

interface RadiologyOrder {
  id: string;
  orderNumber: string;
  patientName: string;
  mrn: string;
  examName: string;
  modality: string;
  bodyPart: string | null;
  urgency: string;
  orderingDoctorName: string | null;
  clinicalNotes: string | null;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  findings: string | null;
  impression: string | null;
  radiologistName: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;
const STATUS_FLOW = ['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED'];
const statusColor: Record<string, string> = {
  ORDERED: '#94a3b8', SCHEDULED: '#6366f1', IN_PROGRESS: '#f59e0b', COMPLETED: '#3b82f6', VERIFIED: '#10b981',
};
const urgencyColor: Record<string, string> = { ROUTINE: '#10b981', URGENT: '#f59e0b', STAT: '#ef4444' };

export default function RadiologyReportPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<RadiologyOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [radiologistName, setRadiologistName] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/radiology/orders/${orderId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Order not found');
      const data = await res.json();
      setOrder(data.order);
      if (data.order.findings) setFindings(data.order.findings);
      if (data.order.impression) setImpression(data.order.impression);
      if (data.order.radiologistName) setRadiologistName(data.order.radiologistName);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [orderId]);

  const updateStatus = async (action: 'schedule' | 'start') => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/radiology/orders/${orderId}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({}),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setSuccess('Status updated successfully.'); await load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const submitReport = async () => {
    if (!findings || findings.length < 5) { setError('Findings must be at least 5 characters'); return; }
    if (!impression || impression.length < 3) { setError('Impression is required'); return; }
    if (!radiologistName) { setError('Radiologist name is required'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/radiology/orders/${orderId}/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ findings, impression, radiologistName }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setSuccess('Report submitted successfully.'); await load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const verifyReport = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/radiology/orders/${orderId}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setSuccess('Report verified — Doctor has been notified.'); await load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <ScanLine style={{ width: 56, height: 56, color: '#6366f1' }} />
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#6366f1' }} />
        <p>Loading order…</p>
      </div>
    </div>
  );

  if (error && !order) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}><p>{error}</p><button onClick={() => router.back()} style={{ marginTop: 16, padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Go Back</button></div>
    </div>
  );

  if (!order) return null;
  const currentStatusIndex = STATUS_FLOW.indexOf(order.status);
  const isVerified = order.status === 'VERIFIED';
  const isCompleted = order.status === 'COMPLETED' || isVerified;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.push('/radiology/queue')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Queue
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScanLine style={{ width: 20, height: 20, color: '#818cf8' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>{order.examName} — {order.orderNumber}</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>{order.patientName} · {order.mrn} · {order.modality}{order.bodyPart ? ` · ${order.bodyPart}` : ''}</p>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${urgencyColor[order.urgency] || '#94a3b8'}22`, color: urgencyColor[order.urgency] || '#94a3b8', border: `1px solid ${urgencyColor[order.urgency] || '#94a3b8'}44` }}>{order.urgency}</span>
          <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${statusColor[order.status] || '#94a3b8'}22`, color: statusColor[order.status] || '#94a3b8', border: `1px solid ${statusColor[order.status] || '#94a3b8'}44` }}>{order.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Status Stepper */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 32px', marginBottom: 28, display: 'flex', alignItems: 'center' }}>
          {STATUS_FLOW.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, border: '2px solid', borderColor: i <= currentStatusIndex ? (statusColor[s] || '#94a3b8') : 'rgba(255,255,255,0.15)', background: i < currentStatusIndex ? `${statusColor[STATUS_FLOW[i]]}33` : i === currentStatusIndex ? `${statusColor[s]}33` : 'transparent', color: i <= currentStatusIndex ? (statusColor[s] || '#94a3b8') : '#64748b', marginBottom: 6 }}>
                  {i < currentStatusIndex ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : i + 1}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: i <= currentStatusIndex ? (statusColor[s] || '#94a3b8') : '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{s.replace('_', ' ')}</div>
              </div>
              {i < STATUS_FLOW.length - 1 && <div style={{ height: 2, flex: 1, background: i < currentStatusIndex ? '#4ade80' : 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          {/* Left — Info + Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', color: '#fff', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList style={{ width: 16, height: 16, color: '#818cf8' }} /> Order Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                {[
                  { label: 'Patient', value: order.patientName },
                  { label: 'MRN', value: order.mrn },
                  { label: 'Exam', value: order.examName },
                  { label: 'Body Part', value: order.bodyPart || '—' },
                  { label: 'Ordered by', value: order.orderingDoctorName || 'Unknown' },
                  { label: 'Ordered', value: new Date(order.createdAt).toLocaleString() },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ color: '#e2e8f0' }}>{f.value}</div>
                  </div>
                ))}
                {order.clinicalNotes && (
                  <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '10px 12px', marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 600, marginBottom: 4 }}>CLINICAL INDICATION</div>
                    <div style={{ fontSize: 12, color: '#c7d2fe', lineHeight: 1.5 }}>{order.clinicalNotes}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: '0 0 14px', color: '#fff', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap style={{ width: 16, height: 16, color: '#f59e0b' }} /> Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {order.status === 'ORDERED' && (
                  <button onClick={() => updateStatus('schedule')} disabled={saving} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CalendarCheck style={{ width: 16, height: 16 }} /> Accept &amp; Schedule
                  </button>
                )}
                {order.status === 'SCHEDULED' && (
                  <button onClick={() => updateStatus('start')} disabled={saving} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Play style={{ width: 16, height: 16 }} /> Patient Arrived — Start
                  </button>
                )}
                {order.status === 'COMPLETED' && (
                  <button onClick={verifyReport} disabled={saving} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle2 style={{ width: 16, height: 16 }} /> Verify &amp; Notify Doctor
                  </button>
                )}
                {isVerified && (
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <CheckCircle2 style={{ width: 16, height: 16 }} /> Verified
                    </div>
                    <div style={{ fontSize: 12, color: '#6ee7b7', marginTop: 4 }}>Doctor has been notified</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — Report Form */}
          <div>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#fca5a5', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} /> {error}
            </div>}
            {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 16px', color: '#6ee7b7', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} /> {success}
            </div>}

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28 }}>
              <h2 style={{ margin: '0 0 24px', color: '#fff', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                <ScanLine style={{ width: 20, height: 20, color: '#818cf8' }} /> Radiology Report
              </h2>

              {isVerified && (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>VERIFIED — READ ONLY</div>
                  <div style={{ fontSize: 13, color: '#6ee7b7' }}>Reported by: {order.radiologistName} · {order.completedAt && new Date(order.completedAt).toLocaleString()}</div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 600 }}>
                  <FileText style={{ width: 14, height: 14 }} /> Findings
                  <span style={{ color: '#64748b', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>Describe what is seen on the images</span>
                </label>
                <textarea value={findings} onChange={e => setFindings(e.target.value)} readOnly={isVerified} rows={8}
                  placeholder="The chest X-ray shows… / The ultrasound demonstrates… / CT findings reveal…"
                  style={{ width: '100%', padding: '14px 16px', background: isVerified ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit' }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 600 }}>
                  <Lightbulb style={{ width: 14, height: 14 }} /> Impression / Conclusion
                  <span style={{ color: '#64748b', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>Summary and clinical interpretation</span>
                </label>
                <textarea value={impression} onChange={e => setImpression(e.target.value)} readOnly={isVerified} rows={4}
                  placeholder={"1. No acute findings.\n2. Normal study."}
                  style={{ width: '100%', padding: '14px 16px', background: isVerified ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit' }} />
              </div>

              {!isVerified && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 8, fontWeight: 600 }}>Reported By</label>
                  <input value={radiologistName} onChange={e => setRadiologistName(e.target.value)} placeholder="Radiologist / Technician name"
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              )}

              {!isCompleted && order.status === 'IN_PROGRESS' && (
                <button onClick={submitReport} disabled={saving} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 16, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {saving ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Saving Report…</> : <><Upload style={{ width: 18, height: 18 }} /> Submit Report</>}
                </button>
              )}
              {!isCompleted && order.status !== 'IN_PROGRESS' && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 18px', textAlign: 'center', color: '#fde68a', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} /> Mark the order as "Patient Arrived — Start" before submitting the report.
                </div>
              )}
              {isCompleted && !isVerified && (
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
                  <div style={{ color: '#93c5fd', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <CheckCircle2 style={{ width: 16, height: 16 }} /> Report Submitted
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Click "Verify &amp; Notify Doctor" in the Actions panel.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}