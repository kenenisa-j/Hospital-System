import React, { useState } from 'react';
import {
    ArrowUpRight, ArrowDownLeft, AlertCircle, History,
    SlidersHorizontal, Plus, Search, Filter, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { Medicine, StockBatch, StockMovement, MovementType } from '@/types/pharmacy';

const INITIAL_MOVEMENTS: StockMovement[] = [
    {
        id: 'MOV-1001',
        batchId: 'BAT-101',
        medicineId: 'MED-001',
        medicineName: 'Panadol Extra (500mg)',
        batchNumber: 'PND-2025-A1',
        movementType: 'PURCHASE',
        quantityChange: 150,
        quantityAfter: 150,
        reason: 'Initial stock intake from PharmaDist Co.',
        performedBy: 'Kenenisa Jaleto',
        timestamp: '2026-08-10 10:30 AM',
    },
    {
        id: 'MOV-1002',
        batchId: 'BAT-103',
        medicineId: 'MED-002',
        medicineName: 'Amoxil (500mg)',
        batchNumber: 'AMX-2024-X9',
        movementType: 'EXPIRED_WRITEOFF',
        quantityChange: -10,
        quantityAfter: 30,
        reason: 'Expired batch deduction',
        performedBy: 'Dr. Sarah Connor',
        timestamp: '2026-08-12 02:15 PM',
    },
];

interface StockMovementProps {
    medicines?: Medicine[];
    batches?: StockBatch[];
}

export default function StockMovementTracker({
    medicines = [],
    batches = []
}: StockMovementProps) {
    const [movements, setMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

    // Adjustment Form State
    const [adjustForm, setAdjustForm] = useState({
        batchId: batches[0]?.id || 'BAT-101',
        movementType: 'MANUAL_ADJUSTMENT' as MovementType,
        quantityChange: 0,
        reason: '',
        performedBy: 'Current User',
    });

    // Calculate Low Stock Alerts
    const lowStockAlerts = medicines.filter(m => {
        // Sum total quantity from active batches
        const totalQty = batches
            .filter(b => b.medicineId === m.id && b.status === 'ACTIVE')
            .reduce((sum, b) => sum + b.quantityOnHand, 0);
        return totalQty <= m.reorderLevel;
    });

    const handleCreateAdjustment = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedBatch = batches.find(b => b.id === adjustForm.batchId);
        const selectedMed = medicines.find(m => m.id === selectedBatch?.medicineId);

        const currentQty = selectedBatch ? selectedBatch.quantityOnHand : 100;
        const finalQty = Math.max(0, currentQty + adjustForm.quantityChange);

        const newMovement: StockMovement = {
            id: `MOV-${Math.floor(1000 + Math.random() * 9000)}`,
            batchId: adjustForm.batchId,
            medicineId: selectedMed?.id || 'MED-001',
            medicineName: selectedMed ? `${selectedMed.brandName} (${selectedMed.strength})` : 'Medicine',
            batchNumber: selectedBatch?.batchNumber || 'BATCH-00',
            movementType: adjustForm.movementType,
            quantityChange: adjustForm.quantityChange,
            quantityAfter: finalQty,
            reason: adjustForm.reason,
            performedBy: adjustForm.performedBy,
            timestamp: new Date().toLocaleString(),
        };

        setMovements([newMovement, ...movements]);
        setIsAdjustModalOpen(false);
        setAdjustForm({
            batchId: batches[0]?.id || 'BAT-101',
            movementType: 'MANUAL_ADJUSTMENT',
            quantityChange: 0,
            reason: '',
            performedBy: 'Current User',
        });
    };

    const filteredMovements = movements.filter((m) => {
        const matchesSearch =
            m.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.performedBy.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'ALL' || m.movementType === filterType;
        return matchesSearch && matchesType;
    });

    const getMovementBadge = (type: MovementType, qty: number) => {
        switch (type) {
            case 'PURCHASE':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
                        <ArrowDownLeft className="w-3.5 h-3.5" /> Purchase (+{qty})
                    </span>
                );
            case 'DISPENSED':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Dispensed ({qty})
                    </span>
                );
            case 'EXPIRED_WRITEOFF':
            case 'DAMAGE_WRITEOFF':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-md border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5" /> Write-off ({qty})
                    </span>
                );
            case 'MANUAL_ADJUSTMENT':
            default:
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-200">
                        <SlidersHorizontal className="w-3.5 h-3.5" /> Adjustment ({qty > 0 ? `+${qty}` : qty})
                    </span>
                );
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Stock Movement & Audit Logs</h1>
                    <p className="text-sm text-slate-500">Track all purchases, manual adjustments, write-offs, and low-stock alerts.</p>
                </div>
                <button
                    onClick={() => setIsAdjustModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm"
                >
                    <SlidersHorizontal className="w-4 h-4" /> Record Stock Adjustment
                </button>
            </div>

            {/* Low Stock Alert Section */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                        <ShieldAlert className="w-5 h-5 text-amber-600" />
                        Low-Stock Reorder Alerts ({lowStockAlerts.length})
                    </div>
                    <span className="text-xs text-amber-700">Automatic threshold trigger</span>
                </div>

                {lowStockAlerts.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50/80 p-3 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" /> All medicine inventory levels are currently above reorder thresholds.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {lowStockAlerts.map(med => (
                            <div key={med.id} className="bg-white p-3 rounded-lg border border-amber-200 flex justify-between items-center shadow-xs">
                                <div>
                                    <div className="font-semibold text-slate-800 text-sm">{med.brandName}</div>
                                    <div className="text-xs text-slate-500">{med.genericName} • {med.strength}</div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                        Reorder Needed
                                    </span>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Reorder Level: <span className="font-semibold">{med.reorderLevel}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Audit Log Controls & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search movement log by medicine, batch number, or staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">All Movement Types</option>
                        <option value="PURCHASE">Purchase / Receiving</option>
                        <option value="DISPENSED">Dispensed / Sold</option>
                        <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                        <option value="EXPIRED_WRITEOFF">Expired Write-off</option>
                        <option value="DAMAGE_WRITEOFF">Damage Write-off</option>
                    </select>
                </div>
            </div>

            {/* Movement Audit Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" /> Inventory Audit Log
                    </span>
                    <span className="text-xs text-slate-400">{filteredMovements.length} Records found</span>
                </div>

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                            <th className="py-3 px-4">Timestamp</th>
                            <th className="py-3 px-4">Medicine & Batch</th>
                            <th className="py-3 px-4">Movement Type</th>
                            <th className="py-3 px-4">Qty Delta</th>
                            <th className="py-3 px-4">Qty After</th>
                            <th className="py-3 px-4">Reason / Notes</th>
                            <th className="py-3 px-4">Staff Member</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {filteredMovements.map((mov) => (
                            <tr key={mov.id} className="hover:bg-slate-50 transition">
                                <td className="py-3 px-4 font-mono text-xs text-slate-500">{mov.timestamp}</td>
                                <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-800">{mov.medicineName}</div>
                                    <div className="text-xs font-mono text-slate-400">Batch: {mov.batchNumber}</div>
                                </td>
                                <td className="py-3 px-4">{getMovementBadge(mov.movementType, mov.quantityChange)}</td>
                                <td className="py-3 px-4">
                                    <span className={`font-mono font-bold ${mov.quantityChange > 0 ? 'text-emerald-600' : 'text-red-600'
                                        }`}>
                                        {mov.quantityChange > 0 ? `+${mov.quantityChange}` : mov.quantityChange}
                                    </span>
                                </td>
                                <td className="py-3 px-4 font-mono font-medium text-slate-800">{mov.quantityAfter}</td>
                                <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">{mov.reason || '—'}</td>
                                <td className="py-3 px-4 text-xs font-medium text-slate-700">{mov.performedBy}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Manual Stock Adjustment Modal */}
            {isAdjustModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-800">Record Manual Stock Adjustment</h3>
                            <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateAdjustment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Target Batch *</label>
                                <select
                                    value={adjustForm.batchId}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, batchId: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                >
                                    {batches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.batchNumber} (Current Qty: {b.quantityOnHand})
                                        </option>
                                    ))}
                                    {batches.length === 0 && <option value="BAT-101">PND-2025-A1 (Sample Batch)</option>}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Adjustment Type *</label>
                                <select
                                    value={adjustForm.movementType}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, movementType: e.target.value as MovementType })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="MANUAL_ADJUSTMENT">Manual Recount (+/-)</option>
                                    <option value="EXPIRED_WRITEOFF">Expiry Disposal (-)</option>
                                    <option value="DAMAGE_WRITEOFF">Damaged / Broken (-)</option>
                                    <option value="PURCHASE">Stock Purchase (+)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Quantity Adjustment (+ to add, - to deduct) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={adjustForm.quantityChange}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, quantityChange: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Reason / Description *</label>
                                <textarea
                                    required
                                    rows={2}
                                    placeholder="e.g. Broken vial during stock audit, physical recount match"
                                    value={adjustForm.reason}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Performed By</label>
                                <input
                                    type="text"
                                    value={adjustForm.performedBy}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, performedBy: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAdjustModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                                >
                                    Save Stock Movement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}