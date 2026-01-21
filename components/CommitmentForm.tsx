
import React, { useState, useMemo, useEffect } from 'react';
import { Credit, Commitment, UG } from '../types';
import { Save, ArrowLeft, Landmark } from 'lucide-react';
import { UGS } from '../constants';

interface CommitmentFormProps {
  credits: Credit[];
  onSave: (commitment: Commitment) => void;
  onCancel: () => void;
  initialData?: Commitment;
}

const CommitmentForm: React.FC<CommitmentFormProps> = ({ credits, onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    ug: '' as UG | '',
    creditId: initialData?.creditId || '',
    ne: initialData?.ne || '2026NE',
    value: initialData?.value || 0,
    description: initialData?.description || '',
    date: initialData?.date || new Date().toISOString().split('T')[0]
  });

  const availableCredits = useMemo(() => {
    return (credits || []).filter(c => !formData.ug || c.ug === formData.ug);
  }, [credits, formData.ug]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.creditId || formData.value <= 0) return;

    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      ne: formData.ne.toUpperCase(),
      creditId: formData.creditId,
      value: Number(formData.value),
      date: formData.date,
      description: formData.description
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 font-sans text-black">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-red-700 font-black text-[10px] uppercase tracking-widest">
        <ArrowLeft size={16} /> Voltar à lista
      </button>

      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
        <div className="bg-red-800 px-8 py-7 text-white flex items-center justify-between">
           <h2 className="text-xl font-black uppercase italic">Registrar Nota de Empenho (NE)</h2>
           <Landmark className="opacity-20" size={40} />
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidade Gestora</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-bold" value={formData.ug} onChange={e => setFormData({...formData, ug: e.target.value as UG})}>
                  <option value="">Todas as UGs</option>
                  {UGS.map(ug => <option key={ug} value={ug}>{ug}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nota de Crédito (Dotação)</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-bold" value={formData.creditId} onChange={e => setFormData({...formData, creditId: e.target.value})}>
                  <option value="">Selecione a NC...</option>
                  {availableCredits.map(c => (
                    <option key={c.id} value={c.id}>{c.nc} - Saldo: R$ {c.valueAvailable.toLocaleString('pt-BR')}</option>
                  ))}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Número da NE</label>
                <input type="text" maxLength={12} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase" value={formData.ne} onChange={e => setFormData({...formData, ne: e.target.value.toUpperCase()})} />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor do Empenho (R$)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-2xl font-black text-red-700" value={formData.value || ''} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Histórico da Despesa</label>
            <textarea rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-medium" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <button type="submit" className="w-full py-4 bg-red-700 hover:bg-red-800 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
            <Save size={18} /> Confirmar Lançamento de NE
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommitmentForm;
