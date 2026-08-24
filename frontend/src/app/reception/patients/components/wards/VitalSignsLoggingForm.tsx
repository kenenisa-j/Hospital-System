"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getErrorMessage } from "@/lib/utils";
import {
  Activity,
  Thermometer,
  HeartPulse,
  Gauge,
  Zap,
  Save,
  Clock,
  History,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface VitalEntry {
  id: string;
  admissionId: string;
  temperature: string | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulse: number | null;
  respiratoryRate: number | null;
  spo2: number | null;
  recordedBy: string;
  recordedAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function VitalSignsLoggingForm({ admissionId }: { admissionId: string }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<VitalEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    temperature: "",
    systolicBp: "",
    diastolicBp: "",
    pulse: "",
    respiratoryRate: "",
    spo2: "",
    recordedBy: "",
  });

  const fetchHistory = useCallback(async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/wards/vitals/${admissionId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch vitals history:", err);
    } finally {
      setLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recordedBy.trim()) {
      setErrorMsg("Please enter the nurse/staff name recording these vitals.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        admissionId,
        recordedBy: form.recordedBy,
      };
      if (form.temperature) payload.temperature = parseFloat(form.temperature);
      if (form.systolicBp) payload.systolicBp = parseInt(form.systolicBp);
      if (form.diastolicBp) payload.diastolicBp = parseInt(form.diastolicBp);
      if (form.pulse) payload.pulse = parseInt(form.pulse);
      if (form.respiratoryRate) payload.respiratoryRate = parseInt(form.respiratoryRate);
      if (form.spo2) payload.spo2 = parseInt(form.spo2);

      const res = await fetch(`${API_BASE_URL}/api/wards/vitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMsg("Vital signs recorded successfully.");
        setForm({ temperature: "", systolicBp: "", diastolicBp: "", pulse: "", respiratoryRate: "", spo2: "", recordedBy: "" });
        fetchHistory();
      } else {
        const err = await res.json();
        setErrorMsg(getErrorMessage(err.error, "Failed to save vital signs."));
      }
    } catch (err) {
      setErrorMsg("A network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto p-6 bg-slate-50 min-h-screen">
      {/* Left Column: Input Form */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" /> Vital Signs Data Entry
          </h2>
          <p className="text-xs text-slate-500">Record current telemetry for ongoing inpatient evaluation.</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" /> Temp (°C)
              </label>
              <input type="number" step="0.1" name="temperature" value={form.temperature} onChange={handleChange}
                placeholder="37.0" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Pulse (bpm)
              </label>
              <input type="number" name="pulse" value={form.pulse} onChange={handleChange}
                placeholder="72" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-500" /> Resp Rate (bpm)
              </label>
              <input type="number" name="respiratoryRate" value={form.respiratoryRate} onChange={handleChange}
                placeholder="16" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-500" /> BP (mmHg)
              </label>
              <div className="flex gap-2">
                <input type="number" name="systolicBp" value={form.systolicBp} onChange={handleChange}
                  placeholder="Sys" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <span className="self-center text-slate-400 font-bold">/</span>
                <input type="number" name="diastolicBp" value={form.diastolicBp} onChange={handleChange}
                  placeholder="Dia" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-sky-500" /> SpO2 (%)
              </label>
              <input type="number" name="spo2" value={form.spo2} onChange={handleChange}
                placeholder="98" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Recorded By (Nurse/Staff Name) *</label>
              <input type="text" name="recordedBy" value={form.recordedBy} onChange={handleChange}
                placeholder="e.g. Nurse Sister Tigist" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Vital Signs</>}
          </button>
        </form>
      </div>

      {/* Right Column: Recent Trend History */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <History className="w-4 h-4 text-indigo-600" /> Recent Vitals History
        </h3>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-400">
            <Activity className="w-10 h-10 text-slate-200 mb-2" />
            <p className="text-xs font-semibold">No vitals recorded yet for this admission.</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto">
            {history.map((entry) => (
              <div key={entry.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(entry.recordedAt).toLocaleTimeString()}</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Logged</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {entry.temperature && <div><span className="text-slate-400">Temp:</span> <strong className="text-slate-700">{entry.temperature}°C</strong></div>}
                  {(entry.systolicBp && entry.diastolicBp) && <div><span className="text-slate-400">BP:</span> <strong className="text-slate-700">{entry.systolicBp}/{entry.diastolicBp}</strong></div>}
                  {entry.pulse && <div><span className="text-slate-400">Pulse:</span> <strong className="text-slate-700">{entry.pulse} bpm</strong></div>}
                  {entry.spo2 && <div><span className="text-slate-400">SpO2:</span> <strong className="text-slate-700">{entry.spo2}%</strong></div>}
                </div>
                <p className="text-[10px] text-slate-400">By {entry.recordedBy}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}