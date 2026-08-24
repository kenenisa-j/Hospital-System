'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface VitalSign {
  id: string;
  temperature: string | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulse: number | null;
  respiratoryRate: number | null;
  spo2: number | null;
  recordedBy: string;
  recordedAt: string;
}

interface NursingNote {
  id: string;
  shiftType: string;
  category: string;
  noteContent: string;
  patientCondition: string;
  nurseName: string;
  createdAt: string;
}

interface Admission {
  id: string;
  patientName: string;
  mrn: string;
  bedNumber: string;
  reason: string;
  doctorNotes: string | null;
  status: string;
  admittedAt: string;
}

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

const conditionColor: Record<string, string> = {
  STABLE: '#10b981', IMPROVING: '#3b82f6', GUARDED: '#f59e0b', CRITICAL: '#ef4444',
};

const categoryLabel: Record<string, string> = {
  GENERAL_OBSERVATION: 'General Observation',
  POST_OP_CARE: 'Post-Op Care',
  MEDICATION_RESPONSE: 'Medication Response',
  CLINICAL_DECLINE: '🔴 Clinical Decline',
};

export default function NursePatientChart({ params }: { params: Promise<{ id: string }> }) {
  const { id: admissionId } = use(params);
  const router = useRouter();
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [notes, setNotes] = useState<NursingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'vitals' | 'notes'>('vitals');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Vitals form
  const [temperature, setTemperature] = useState('');
  const [systolicBp, setSystolicBp] = useState('');
  const [diastolicBp, setDiastolicBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [rr, setRr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [recordedBy, setRecordedBy] = useState('Nurse');

  // Notes form
  const [shiftType, setShiftType] = useState<'DAY' | 'NIGHT' | 'OVERTIME'>('DAY');
  const [category, setCategory] = useState('GENERAL_OBSERVATION');
  const [noteContent, setNoteContent] = useState('');
  const [patientCondition, setPatientCondition] = useState('STABLE');
  const [nurseName, setNurseName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [admissionsRes, vitalsRes, notesRes] = await Promise.all([
        fetch(`${API}/wards/admissions`, { credentials: 'include' }),
        fetch(`${API}/wards/vitals/${admissionId}`, { credentials: 'include' }),
        fetch(`${API}/wards/notes/${admissionId}`, { credentials: 'include' }),
      ]);

      if (admissionsRes.ok) {
        const d = await admissionsRes.json();
        const adm = (d.admissions || []).find((a: Admission) => a.id === admissionId);
        setAdmission(adm || null);
      }
      if (vitalsRes.ok) { const d = await vitalsRes.json(); setVitals(d.history || []); }
      if (notesRes.ok) { const d = await notesRes.json(); setNotes(d.notes || []); }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [admissionId]);

  const submitVitals = async () => {
    if (!temperature && !systolicBp && !pulse) {
      setError('Please enter at least one vital sign value');
      return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      const body: any = { admissionId, recordedBy };
      if (temperature) body.temperature = parseFloat(temperature);
      if (systolicBp) body.systolicBp = parseInt(systolicBp);
      if (diastolicBp) body.diastolicBp = parseInt(diastolicBp);
      if (pulse) body.pulse = parseInt(pulse);
      if (rr) body.respiratoryRate = parseInt(rr);
      if (spo2) body.spo2 = parseInt(spo2);

      const res = await fetch(`${API}/wards/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setSuccess('✅ Vitals recorded successfully!');
      setTemperature(''); setSystolicBp(''); setDiastolicBp('');
      setPulse(''); setRr(''); setSpo2('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitNote = async () => {
    if (!noteContent || noteContent.length < 10) {
      setError('Note must be at least 10 characters long');
      return;
    }
    if (!nurseName) { setError('Please enter nurse name'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/wards/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          admissionId,
          shiftType,
          category,
          noteContent,
          patientCondition,
          nurseId: 'NURSE-001',
          nurseName,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setSuccess('✅ Nursing note saved!');
      setNoteContent('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 56, marginBottom: 16 }}>🏥</div><p>Loading patient chart…</p></div>
    </div>
  );

  const latestVital = vitals[0];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.push('/nurse')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>← Ward</button>
        {admission && (
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>{admission.patientName}</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>MRN: {admission.mrn} · Bed {admission.bedNumber}</p>
          </div>
        )}
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>

        {/* Left sidebar — Patient info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {admission && (
            <>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 14 }}>
                  {admission.patientName.charAt(0)}
                </div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 4 }}>{admission.patientName}</div>
                <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', marginBottom: 14 }}>{admission.mrn}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bed</div>
                    <div style={{ fontWeight: 700, color: '#818cf8', marginTop: 2 }}>🛏️ {admission.bedNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admitted</div>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{new Date(admission.admittedAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</div>
                    <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 2 }}>{admission.reason}</div>
                  </div>
                  {admission.doctorNotes && (
                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 4 }}>DOCTOR NOTES</div>
                      <div style={{ fontSize: 12, color: '#c7d2fe' }}>{admission.doctorNotes}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Latest vitals summary */}
              {latestVital && (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Vitals</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { icon: '🌡️', label: 'Temp', value: latestVital.temperature ? `${latestVital.temperature}°C` : '—' },
                      { icon: '💓', label: 'BP', value: latestVital.systolicBp ? `${latestVital.systolicBp}/${latestVital.diastolicBp}` : '—' },
                      { icon: '❤️', label: 'Pulse', value: latestVital.pulse ? `${latestVital.pulse} bpm` : '—' },
                      { icon: '💨', label: 'SpO₂', value: latestVital.spo2 ? `${latestVital.spo2}%` : '—' },
                    ].map(v => (
                      <div key={v.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 16 }}>{v.icon}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>{v.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{v.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 10, textAlign: 'center' }}>
                    Recorded by {latestVital.recordedBy} · {new Date(latestVital.recordedAt!).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right — Tabs */}
        <div>
          {/* Tab Bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {(['vitals', 'notes'] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
                style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
                  borderColor: activeTab === tab ? '#6366f1' : 'rgba(255,255,255,0.1)',
                  background: activeTab === tab ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: activeTab === tab ? '#818cf8' : '#94a3b8',
                }}>
                {tab === 'vitals' ? '🌡️ Vital Signs' : '📝 Nursing Notes'}
              </button>
            ))}
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#fca5a5' }}>⚠️ {error}</div>}
          {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#6ee7b7' }}>{success}</div>}

          {/* ── VITALS TAB ── */}
          {activeTab === 'vitals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Entry Form */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                <h3 style={{ margin: '0 0 20px', color: '#fff', fontWeight: 600 }}>Record Vitals</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                  {[
                    { label: '🌡️ Temperature (°C)', val: temperature, set: setTemperature, placeholder: 'e.g. 37.2', step: '0.1' },
                    { label: '💓 Systolic BP (mmHg)', val: systolicBp, set: setSystolicBp, placeholder: 'e.g. 120' },
                    { label: '💓 Diastolic BP (mmHg)', val: diastolicBp, set: setDiastolicBp, placeholder: 'e.g. 80' },
                    { label: '❤️ Pulse (bpm)', val: pulse, set: setPulse, placeholder: 'e.g. 72' },
                    { label: '💨 Respiratory Rate', val: rr, set: setRr, placeholder: 'e.g. 16' },
                    { label: '🩸 SpO₂ (%)', val: spo2, set: setSpo2, placeholder: 'e.g. 98' },
                  ].map(field => (
                    <div key={field.label}>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>{field.label}</label>
                      <input type="number" value={field.val} onChange={e => field.set(e.target.value)}
                        placeholder={field.placeholder} step={field.step || '1'}
                        style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0', fontSize: 15, fontWeight: 600, boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Recorded By</label>
                    <input value={recordedBy} onChange={e => setRecordedBy(e.target.value)}
                      placeholder="Nurse name"
                      style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                  <button onClick={submitVitals} disabled={saving}
                    style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving…' : '📊 Record'}
                  </button>
                </div>
              </div>

              {/* History */}
              <div>
                <h3 style={{ margin: '0 0 16px', color: '#fff', fontWeight: 600 }}>Recent Vitals History</h3>
                {vitals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
                    <p style={{ margin: 0 }}>No vitals recorded yet. Use the form above to record the first entry.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {vitals.map((v, i) => (
                      <div key={v.id} style={{ background: i === 0 ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '14px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? '#818cf8' : '#94a3b8' }}>
                            {i === 0 && '📌 Latest · '}{new Date(v.recordedAt).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>By: {v.recordedBy}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {v.temperature && <div style={vChip}>🌡️ {v.temperature}°C</div>}
                          {v.systolicBp && <div style={vChip}>💓 {v.systolicBp}/{v.diastolicBp} mmHg</div>}
                          {v.pulse && <div style={vChip}>❤️ {v.pulse} bpm</div>}
                          {v.respiratoryRate && <div style={vChip}>💨 RR {v.respiratoryRate}</div>}
                          {v.spo2 && <div style={vChip}>🩸 SpO₂ {v.spo2}%</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Entry Form */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                <h3 style={{ margin: '0 0 20px', color: '#fff', fontWeight: 600 }}>New Nursing Note</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Shift</label>
                    <select value={shiftType} onChange={e => setShiftType(e.target.value as any)}
                      style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0', fontSize: 14 }}>
                      <option value="DAY">Day</option>
                      <option value="NIGHT">Night</option>
                      <option value="OVERTIME">Overtime</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0', fontSize: 14 }}>
                      <option value="GENERAL_OBSERVATION">General Observation</option>
                      <option value="POST_OP_CARE">Post-Op Care</option>
                      <option value="MEDICATION_RESPONSE">Medication Response</option>
                      <option value="CLINICAL_DECLINE">Clinical Decline</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Patient Condition</label>
                    <select value={patientCondition} onChange={e => setPatientCondition(e.target.value)}
                      style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0', fontSize: 14 }}>
                      <option value="STABLE">Stable</option>
                      <option value="IMPROVING">Improving</option>
                      <option value="GUARDED">Guarded</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Nurse Name</label>
                  <input value={nurseName} onChange={e => setNurseName(e.target.value)} placeholder="Your name"
                    style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Observation Note</label>
                  <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={5}
                    placeholder="Describe patient condition, observations, interventions performed, patient response…"
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }} />
                </div>
                <button onClick={submitNote} disabled={saving}
                  style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : '📝 Save Note'}
                </button>
              </div>

              {/* Notes history */}
              <div>
                <h3 style={{ margin: '0 0 16px', color: '#fff', fontWeight: 600 }}>Nursing Notes Timeline</h3>
                {notes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
                    <p style={{ margin: 0 }}>No nursing notes yet. Record your first observation above.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {notes.map(note => (
                      <div key={note.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${note.patientCondition === 'CRITICAL' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${conditionColor[note.patientCondition] || '#6366f1'}22`, color: conditionColor[note.patientCondition] || '#6366f1', border: `1px solid ${conditionColor[note.patientCondition] || '#6366f1'}44` }}>
                            {note.patientCondition}
                          </span>
                          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {categoryLabel[note.category] || note.category}
                          </span>
                          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                            {note.shiftType} Shift
                          </span>
                          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
                            {note.nurseName} · {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>{note.noteContent}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const vChip: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
  background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)',
};
