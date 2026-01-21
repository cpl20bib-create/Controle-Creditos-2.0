
import React, { useState, useEffect } from 'react';
import { Credit, UG } from '../types';
import { UGS, SECTION_OPTIONS } from '../constants';
import { Save, ArrowLeft } from 'lucide-react';

interface CreditFormProps {
  onSave: (credit: Credit) => void;
  existingCredits: Credit[];
  onCancel: () => void;
  initialData?: Credit;
}

const CreditForm: React.FC<CreditFormProps> = ({ onSave, existingCredits, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<Credit>>({
    ug: '160211',
    pi: '',
    nd: '',
    section: SECTION_OPTIONS[0],
    valueReceived: undefined,
    deadline: '',
    nc: '2026NC',
    organ: '',
    description: ''
  });

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(formData.valueReceived) || 0;

    const creditToSave: Credit = {
      ...formData,
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      valueReceived: val,
      // Ao criar, o saldo disponível é igual ao recebido e o usado é zero
      valueAvailable: initialData ? (Number(formData.valueAvailable) || val) : val,
      valueUsed: initialData ? (Number(formData.valueUsed) || 0) : 0,
      created_at: initialData?.created_at || new Date().toISOString(),
    } as Credit;

    onSave(creditToSave);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 font-sans text-black">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-emerald-700 font-black text-[10px] uppercase tracking-widest">
        <ArrowLeft size={16} /> Voltar à lista
      </button>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-emerald-900 px-8 py-6 text-white">
          <h2 className="text-lg font-black uppercase italic">{initialData ? 'Editar Crédito' : 'Novo Crédito Orçamentário'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidade Gestora</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold" value={formData.ug} onChange={e => setFormData({...formData, ug: e.target.value as UG})}>
                  {UGS.map(ug => <option key={ug} value={ug}>{ug}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nota de Crédito (NC)</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase" value={formData.nc} onChange={e => setFormData({...formData, nc: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plano Interno (PI)</label>
                <input type="text" maxLength={11} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase" value={formData.pi} onChange={e => setFormData({...formData, pi: e.target.value.toUpperCase()})} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor do Aporte (R$)</label>
                <input type="number" step="0.01" className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-2xl font-black text-emerald-800" value={formData.valueReceived || ''} onChange={e => setFormData({...formData, valueReceived: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data Limite de Empenho</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seção Interessada</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})}>
                  {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
            <Save size={18} /> Salvar Crédito Orçamentário
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreditForm;
