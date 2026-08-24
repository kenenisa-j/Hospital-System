import React, { useState } from 'react';
import {
    Plus, Search, Filter, Pill, ShieldAlert, CheckCircle,
    MoreVertical, Edit2, Trash2, Eye
} from 'lucide-react';
import { Medicine, DosageForm, UnitType } from '@/types/pharmacy';

const INITIAL_MEDICINES: Medicine[] = [
    {
        id: 'MED-001',
        brandName: 'Panadol Extra',
        genericName: 'Paracetamol / Caffeine',
        category: 'Analgesics',
        dosageForm: 'Tablet',
        strength: '500mg / 65mg',
        unitType: 'Box',
        requiresPrescription: false,
        manufacturer: 'GSK',
        reorderLevel: 50,
        status: 'ACTIVE',
        createdAt: '2026-01-15',
    },
    {
        id: 'MED-002',
        brandName: 'Amoxil',
        genericName: 'Amoxicillin',
        category: 'Antibiotics',
        dosageForm: 'Capsule',
        strength: '500mg',
        unitType: 'Strip',
        requiresPrescription: true,
        manufacturer: 'Beecham',
        reorderLevel: 100,
        status: 'ACTIVE',
        createdAt: '2026-02-01',
    },
];

export default function MedicineCatalog() {
    const [medicines, setMedicines] = useState<Medicine[]>(INITIAL_MEDICINES);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedForm, setSelectedForm] = useState<string>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Medicine Form State
    const [formData, setFormData] = useState<Omit<Medicine, 'id' | 'createdAt'>>({
        brandName: '',
        genericName: '',
        category: '',
        dosageForm: 'Tablet',
        strength: '',
        unitType: 'Box',
        requiresPrescription: false,
        manufacturer: '',
        reorderLevel: 20,
        status: 'ACTIVE',
    });

    const handleCreateMedicine = (e: React.FormEvent) => {
        e.preventDefault();
        const newEntry: Medicine = {
            ...formData,
            id: `MED-${String(medicines.length + 1).padStart(3, '0')}`,
            createdAt: new Date().toISOString().split('T')[0],
        };
        setMedicines([newEntry, ...medicines]);
        setIsModalOpen(false);
        setFormData({
            brandName: '',
            genericName: '',
            category: '',
            dosageForm: 'Tablet',
            strength: '',
            unitType: 'Box',
            requiresPrescription: false,
            manufacturer: '',
            reorderLevel: 20,
            status: 'ACTIVE',
        });
    };

    const filteredMedicines = medicines.filter((item) => {
        const matchesSearch =
            item.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesForm = selectedForm === 'ALL' || item.dosageForm === selectedForm;
        return matchesSearch && matchesForm;
    });

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Medicine Catalog</h1>
                    <p className="text-sm text-slate-500">Manage generic & brand medicines, strengths, and unit types.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
                >
                    <Plus className="w-4 h-4" /> Add Medicine
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by brand name, generic name, or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={selectedForm}
                        onChange={(e) => setSelectedForm(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Dosage Forms</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Injection">Injection</option>
                        <option value="Ointment">Ointment</option>
                        <option value="Drops">Drops</option>
                    </select>
                </div>
            </div>

            {/* Catalog Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4">Medicine Info</th>
                            <th className="py-3 px-4">Generic Name</th>
                            <th className="py-3 px-4">Form & Strength</th>
                            <th className="py-3 px-4">Unit Type</th>
                            <th className="py-3 px-4">Prescription</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {filteredMedicines.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <Pill className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800">{item.brandName}</div>
                                            <div className="text-xs text-slate-400">{item.id} • {item.category}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-600">{item.genericName}</td>
                                <td className="py-3 px-4">
                                    <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-xs font-medium mr-2">
                                        {item.dosageForm}
                                    </span>
                                    <span className="text-xs text-slate-500">{item.strength}</span>
                                </td>
                                <td className="py-3 px-4 text-slate-600">{item.unitType}</td>
                                <td className="py-3 px-4">
                                    {item.requiresPrescription ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                            <ShieldAlert className="w-3.5 h-3.5" /> Rx Required
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                            <CheckCircle className="w-3.5 h-3.5" /> OTC
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-2 text-slate-400">
                                        <button className="p-1 hover:text-blue-600 rounded"><Eye className="w-4 h-4" /></button>
                                        <button className="p-1 hover:text-amber-600 rounded"><Edit2 className="w-4 h-4" /></button>
                                        <button className="p-1 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Medicine Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-800">Add New Medicine</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateMedicine} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Brand Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Panadol"
                                        value={formData.brandName}
                                        onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Generic Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Paracetamol"
                                        value={formData.genericName}
                                        onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Analgesic, Antibiotic"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Dosage Form</label>
                                    <select
                                        value={formData.dosageForm}
                                        onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value as DosageForm })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Tablet">Tablet</option>
                                        <option value="Capsule">Capsule</option>
                                        <option value="Syrup">Syrup</option>
                                        <option value="Injection">Injection</option>
                                        <option value="Ointment">Ointment</option>
                                        <option value="Drops">Drops</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Strength *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 500mg, 10mg/ml"
                                        value={formData.strength}
                                        onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Unit Type</label>
                                    <select
                                        value={formData.unitType}
                                        onChange={(e) => setFormData({ ...formData, unitType: e.target.value as UnitType })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Box">Box</option>
                                        <option value="Strip">Strip</option>
                                        <option value="Bottle">Bottle</option>
                                        <option value="Vial">Vial</option>
                                        <option value="Ampoule">Ampoule</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="rx"
                                    checked={formData.requiresPrescription}
                                    onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="rx" className="text-sm text-slate-700">Requires Prescription (Rx)</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                                >
                                    Save Medicine
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}