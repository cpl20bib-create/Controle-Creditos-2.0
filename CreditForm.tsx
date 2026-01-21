
import React, { useState, useEffect } from 'react';
import { Credit, UG } from '../types';
import { UGS, SECTION_OPTIONS } from '../constants';
import { Save, AlertCircle, CheckCircle2, ArrowLeft, Edit3 } from 'lucide-react';

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

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nc || formData.nc.length < 12 || !formData.pi || formData.pi.length !== 11 || !formData.nd || formData.nd.length !== 6) {
      setError('Verifique os formatos: NC (12 caracteres), PI (11 caracteres), ND (6 caracteres).');
      return;
    }

    if (!formData.valueReceived || formData.valueReceived <= 0 || !formData.deadline) {
      setError('Preencha os valores e prazos corretamente.');
      return;
    }

    const isDuplicateExact = !initialData && existingCredits.some(c => 
      c.nc === formData.nc && 
      c.pi === formData.pi && 
      c.nd === formData.nd && 
      c.ug === formData.ug
    );

    if (isDuplicateExact) {
      setError('Já existe um lançamento idêntico (Mesma NC, PI e ND) para esta UG.');
      return;
    }

    const creditToSave: Credit = {
      ...formData,
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      createdAt: initialData?.createdAt || new Date().toISOString(),
    } as Credit;

    onSave(creditToSave);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-emerald-700 font-black text-[10px] uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Voltar à lista
      </button>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-emerald-900 px-8 py-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight italic">
              {initialData ? 'Editar Crédito Orçamentário' : 'Registrar Crédito Orçamentário'}
            </h2>
            <p className="text-emerald-400 text-[9px] uppercase tracking-widest font-black mt-1">20º Batalhão de Infantaria Blindado</p>
          </div>
          {initialData ? <Edit3 className="text-emerald-400 opacity-50" size={40} /> : <CheckCircle2 className="text-emerald-400 opacity-50" size={40} />}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100">
              <AlertCircle size={20} />
              <p className="text-[10px] font-black uppercase">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidade Gestora</label>
                <div className="flex gap-2">
                  {UGS.map(ug => (
                    <button key={ug} type="button" onClick={() => setFormData({...formData, ug})} className={`flex-1 py-3 rounded-xl border text-xs font-black uppercase transition-all ${formData.ug === ug ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {ug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nota de Crédito (2026NCXXXXXX)</label>
                <input 
                  type="text" 
                  maxLength={12} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase focus:ring-2 focus:ring-emerald-500 outline-none text-black placeholder:text-slate-300" 
                  value={formData.nc} 
                  onChange={e => setFormData({...formData, nc: e.target.value.toUpperCase()})} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plano Interno (11 Caracteres)</label>
                <input 
                  type="text" 
                  maxLength={11} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase focus:ring-2 focus:ring-emerald-500 outline-none text-black" 
                  value={formData.pi} 
                  onChange={e => setFormData({...formData, pi: e.target.value.toUpperCase()})} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Natureza ND (6 Caracteres)</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase focus:ring-2 focus:ring-emerald-500 outline-none text-black" 
                  value={formData.nd} 
                  onChange={e => setFormData({...formData, nd: e.target.value.toUpperCase()})} 
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Recebido (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-2xl font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.valueReceived ?? ''} 
                  onChange={e => setFormData({...formData, valueReceived: e.target.value === '' ? undefined : parseFloat(e.target.value)})} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seção Interessada</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-none text-black" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})}>
                  {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prazo Limite</label>
                <input 
                  type="date" 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black focus:ring-2 focus:ring-emerald-500 outline-none text-slate-950 [color-scheme:light]" 
                  value={formData.deadline} 
                  onChange={e => setFormData({...formData, deadline: e.target.value})} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Órgão Descentralizador</label>
                <input 
                  type="text" 
                  placeholder="EX: COMANDO MILITAR"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase text-black"
                  value={formData.organ}
                  onChange={e => setFormData({...formData, organ: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição detalhada do Crédito</label>
            <textarea 
              rows={3}
              placeholder="Descreva a finalidade deste crédito e outras observações importantes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none text-black"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="pt-4">
            <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 transition-all flex items-center justify-center gap-3">
              <Save size={18} />
              {initialData ? 'Atualizar Dados' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreditForm;
