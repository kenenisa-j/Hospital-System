import React, { useState } from 'react';
import {
    PackageCheck, AlertTriangle, Clock, Plus, Search,
    ArrowDownUp, AlertCircle, Calendar, ShieldAlert
} from 'lucide-react';
import { Medicine, StockBatch } from '@/types/pharmacy';

interface StockBatchTrackerProps {
    medicines: Medicine[];
}

const INITIAL_BATCHES: StockBatch[] = [
    {
        id: 'BAT-101',
        medicineId: 'MED-001',
        batchNumber: 'PND-2025-A1',
        quantityOnHand: 150,
        costPrice: 1.20,
        sellingPrice: 2.50,
        expiryDate: '2026-09-15', // Near expiry
        supplierName: 'PharmaDist Co.',
        receivedDate: '2025-09-10',
        status: 'ACTIVE',
    },
    {
        id: 'BAT-102',
        medicineId: 'MED-001',
        batchNumber: 'PND-2026-B2',
        quantityOnHand: 300,
        costPrice: 1.25,
        sellingPrice: 2.50,
        expiryDate: '2027-12-01',
        supplierName: 'PharmaDist Co.',
        receivedDate: '2026-01-10',
        status: 'ACTIVE',
    },
    {
        id: 'BAT-103',
        medicineId: 'MED-002',
        batchNumber: 'AMX-2024-X9',
        quantityOnHand: 40,
        costPrice: 3.50,
        sellingPrice: 7.00,
        expiryDate: '2026-08-25', // Urgently expiring soon!
        supplierName: 'Global Meds Ltd.',
        receivedDate: '2024-09-01',
        status: 'ACTIVE',
    },
];

export default function StockBatchTracker({ medicines }: StockBatchTrackerProps) {
    const [batches, setBatches] = useState<StockBatch[]>(INITIAL_BATCHES);
    const [selectedMedicineId, setSelectedMedicineId] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);

    // New Batch Form State
    const [batchForm, setBatchForm] = useState<Omit<StockBatch, 'id' | 'status'>>({
        medicineId: medicines[0]?.id || 'MED-001',
        batchNumber: '',
        quantityOnHand: 100,
        costPrice: 0,
        sellingPrice: 0,
        expiryDate: '',
        supplierName: '',
        receivedDate: new Date().toISOString().split('T')[0],
    });

    // Calculate days until expiry helper
    const getDaysUntilExpiry = (expiryDateStr: string) => {
        const today = new Date();
        const expiry = new Date(expiryDateStr);
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Helper for FEFO Status Styling
    const getExpiryBadge = (expiryDateStr: string) => {
        const days = getDaysUntilExpiry(expiryDateStr);
        if (days < 0) {
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-md border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5" /> Expired
                </span>
            );
        }
        if (days <= 60) {
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" /> Expiring in {days} days
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
                <Clock className="w-3.5 h-3.5" /> {days} days left
            </span>
        );
    };

    const handleAddBatch = (e: React.FormEvent) => {
        e.preventDefault();
        const newBatch: StockBatch = {
            ...batchForm,
            id: `BAT-${Math.floor(100 + Math.random() * 900)}`,
            status: 'ACTIVE',
        };
        setBatches([...batches, newBatch]);
        setIsAddBatchOpen(false);
    };

    // FEFO Sorting Logic: Sort batches by Expiry Date ASCENDING (Earliest Expiry First)
    const filteredAndSortedBatches = batches
        .filter((b) => {
            const med = medicines.find((m) => m.id === b.medicineId);
            const matchesMedFilter = selectedMedicineId === 'ALL' || b.medicineId === selectedMedicineId;
            const matchesSearch =
                b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                med?.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                med?.genericName.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesMedFilter && matchesSearch;
        })
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    // Metrics
    const totalStockItems = batches.reduce((acc, b) => acc + b.quantityOnHand, 0);
    const expiringSoonCount = batches.filter((b) => {
        const days = getDaysUntilExpiry(b.expiryDate);
        return days >= 0 && days <= 60;
    }).length;

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header & FEFO Indicator */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-800">Inventory & FEFO Batch Tracker</h1>
                        <span className="bg-indigo-100 text-indigo-700 font-semibold text-xs px-2.5 py-0.5 rounded-full border border-indigo-200">
                            FEFO Priority Enabled
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        First Expiry, First Out management strategy to minimize pharmaceutical waste.
                    </p>
                </div>

                <button
                    onClick={() => setIsAddBatchOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
                >
                    <Plus className="w-4 h-4" /> Receive New Stock Batch
                </button>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-400">Total Units in Stock</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{totalStockItems}</div>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <PackageCheck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-400">Batches Expiring (&lt; 60 Days)</div>
                        <div className="text-2xl font-bold text-amber-600 mt-1">{expiringSoonCount}</div>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-400">Active Managed Batches</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{batches.length}</div>
                    </div>
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                        <ArrowDownUp className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search batch number or medicine name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <select
                    value={selectedMedicineId}
                    onChange={(e) => setSelectedMedicineId(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="ALL">All Medicines</option>
                    {medicines.map((m) => (
                        <option key={m.id} value={m.id}>{m.brandName} ({m.strength})</option>
                    ))}
                </select>
            </div>

            {/* FEFO Batches Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span>FEFO Queue (Earliest Expiry Prioritized at Top)</span>
                    <span className="text-indigo-600 font-medium normal-case">Sorted by Expiry Date ASC ↑</span>
                </div>

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                            <th className="py-3 px-4">FEFO Order</th>
                            <th className="py-3 px-4">Medicine Name</th>
                            <th className="py-3 px-4">Batch Number</th>
                            <th className="py-3 px-4">Qty On Hand</th>
                            <th className="py-3 px-4">Cost / Selling Price</th>
                            <th className="py-3 px-4">Expiry Date</th>
                            <th className="py-3 px-4">Expiry Health</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {filteredAndSortedBatches.map((batch, index) => {
                            const med = medicines.find((m) => m.id === batch.medicineId);
                            return (
                                <tr key={batch.id} className={index === 0 ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                                            }`}>
                                            #{index + 1}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                        {med ? `${med.brandName} (${med.strength})` : 'Unknown Medicine'}
                                        <div className="text-xs font-normal text-slate-400">{med?.genericName}</div>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{batch.batchNumber}</td>
                                    <td className="py-3 px-4 font-medium text-slate-800">{batch.quantityOnHand} units</td>
                                    <td className="py-3 px-4 text-xs">
                                        <div>Cost: <span className="font-medium">${batch.costPrice.toFixed(2)}</span></div>
                                        <div>Sell: <span className="font-medium text-emerald-600">${batch.sellingPrice.toFixed(2)}</span></div>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-slate-700">{batch.expiryDate}</td>
                                    <td className="py-3 px-4">{getExpiryBadge(batch.expiryDate)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add New Batch Modal */}
            {isAddBatchOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-800">Receive Stock Batch</h3>
                            <button onClick={() => setIsAddBatchOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAddBatch} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Select Medicine *</label>
                                <select
                                    value={batchForm.medicineId}
                                    onChange={(e) => setBatchForm({ ...batchForm, medicineId: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    {medicines.map((m) => (
                                        <option key={m.id} value={m.id}>{m.brandName} - {m.strength} ({m.genericName})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Batch Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. BATCH-2026-X1"
                                        value={batchForm.batchNumber}
                                        onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Quantity Received *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={batchForm.quantityOnHand}
                                        onChange={(e) => setBatchForm({ ...batchForm, quantityOnHand: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Cost Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={batchForm.costPrice}
                                        onChange={(e) => setBatchForm({ ...batchForm, costPrice: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Selling Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={batchForm.sellingPrice}
                                        onChange={(e) => setBatchForm({ ...batchForm, sellingPrice: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={batchForm.expiryDate}
                                        onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Supplier Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. MedSupply Co."
                                        value={batchForm.supplierName}
                                        onChange={(e) => setBatchForm({ ...batchForm, supplierName: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddBatchOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                                >
                                    Save Batch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}