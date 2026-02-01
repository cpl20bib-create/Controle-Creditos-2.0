
import React, { useState, useEffect } from 'react';
import { Credit, UG } from '../types';
import { UGS, SECTION_OPTIONS } from '../constants';
import { Save, ArrowLeft, AlertCircle, Landmark, Tag } from 'lucide-react';

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
    fonte: '',
    ptres: '',
    esfera: '',
    ugr: '',
    section: SECTION_OPTIONS[0],
    valueReceived: undefined,
    deadline: '',
    nc: '2026NC',
    organ: '',
    description: ''
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleOnlyNumbers = (value: string, maxLength: number) => {
    const numeric = value.replace(/\D/g, '');
    return numeric.slice(0, maxLength);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações Básicas
    if (!formData.organ || formData.organ.trim().length < 3) {
      setError('O campo Órgão Descentralizador é obrigatório.');
      return;
    }

    if (!formData.nd || formData.nd.length !== 6) {
      setError('O campo ND deve conter exatamente 6 números.');
      return;
    }

    // Validações dos Novos Campos Técnicos
    if (!formData.fonte || formData.fonte.length !== 10) {
      setError('O campo FONTE deve conter exatamente 10 números.');
      return;
    }
    if (!formData.ptres || formData.ptres.length !== 6) {
      setError('O campo PTRES deve conter exatamente 6 números.');
      return;
    }
    if (!formData.esfera || formData.esfera.length !== 1) {
      setError('O campo ESFERA deve conter exatamente 1 número.');
      return;
    }
    if (!formData.ugr || formData.ugr.length !== 6) {
      setError('O campo UGR deve conter exatamente 6 números.');
      return;
    }

    if (!formData.description || formData.description.trim().length < 5) {
      setError('A descrição da Nota de Crédito é obrigatória.');
      return;
    }

    if (!formData.deadline) {
      setError('A Data Limite de Empenho é obrigatória.');
      return;
    }

    if (!formData.valueReceived || formData.valueReceived <= 0) {
      setError('O valor do aporte deve ser superior a zero.');
      return;
    }

    const val = Number(formData.valueReceived) || 0;

    const creditToSave: Credit = {
      ...formData,
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      valueReceived: val,
      valueAvailable: initialData ? (Number(formData.valueAvailable) || val) : val,
      valueUsed: initialData ? (Number(formData.valueUsed) || 0) : 0,
      created_at: initialData?.created_at || new Date().toISOString(),
    } as Credit;

    onSave(creditToSave);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 font-sans text-black pb-20">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-emerald-700 font-black text-[10px] uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Voltar à lista de créditos
      </button>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-emerald-950 px-8 py-7 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tight">
              {initialData ? 'Editar Crédito Orçamentário' : 'Novo Crédito Orçamentário'}
            </h2>
            <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mt-1 opacity-80 italic">
              Entrada de Dotação - SALC BIB 20
            </p>
          </div>
          <Landmark size={32} className="text-emerald-500/30" />
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-black text-[10px] uppercase flex items-center gap-3 animate-shake">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Órgão Descentralizador</label>
                <input 
                  type="text" 
                  placeholder="EX: COMANDO MILITAR DO SUL"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-black uppercase focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.organ} 
                  onChange={e => setFormData({...formData, organ: e.target.value.toUpperCase()})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade Gestora (UG)</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                    value={formData.ug} 
                    onChange={e => setFormData({...formData, ug: e.target.value as UG})}
                  >
                    {UGS.map(ug => <option key={ug} value={ug}>{ug}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Natureza (ND)</label>
                  <input 
                    type="text" 
                    placeholder="339030"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-black focus:ring-2 focus:ring-emerald-500 outline-none" 
                    value={formData.nd} 
                    onChange={e => setFormData({...formData, nd: handleOnlyNumbers(e.target.value, 6)})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano Interno (PI)</label>
                  <input 
                    type="text" 
                    maxLength={11} 
                    placeholder="PI XXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-none" 
                    value={formData.pi} 
                    onChange={e => setFormData({...formData, pi: e.target.value.toUpperCase()})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota de Crédito (NC)</label>
                  <input 
                    type="text" 
                    placeholder="2026NC000XXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-black uppercase focus:ring-2 focus:ring-emerald-500 outline-none" 
                    value={formData.nc} 
                    onChange={e => setFormData({...formData, nc: e.target.value.toUpperCase()})} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Aporte Orçamentário</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">R$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0,00"
                    className="w-full bg-emerald-50 border border-emerald-100 rounded-[1.25rem] pl-12 pr-4 py-4 text-3xl font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" 
                    value={formData.valueReceived || ''} 
                    onChange={e => setFormData({...formData, valueReceived: parseFloat(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo Empenho</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-black focus:ring-2 focus:ring-emerald-500 outline-none [color-scheme:light]" 
                    value={formData.deadline} 
                    onChange={e => setFormData({...formData, deadline: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Seção Destino</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                    value={formData.section} 
                    onChange={e => setFormData({...formData, section: e.target.value})}
                  >
                    {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
               <Tag size={18} className="text-emerald-600" />
               <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Classificação Técnica de Orçamento</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">FONTE (10)</label>
                  <input 
                    type="text" 
                    placeholder="XXXXXXXXXX"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500" 
                    value={formData.fonte} 
                    onChange={e => setFormData({...formData, fonte: handleOnlyNumbers(e.target.value, 10)})}
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PTRES (6)</label>
                  <input 
                    type="text" 
                    placeholder="XXXXXX"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500" 
                    value={formData.ptres} 
                    onChange={e => setFormData({...formData, ptres: handleOnlyNumbers(e.target.value, 6)})}
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ESFERA (1)</label>
                  <input 
                    type="text" 
                    placeholder="X"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500" 
                    value={formData.esfera} 
                    onChange={e => setFormData({...formData, esfera: handleOnlyNumbers(e.target.value, 1)})}
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">UGR (6)</label>
                  <input 
                    type="text" 
                    placeholder="XXXXXX"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500" 
                    value={formData.ugr} 
                    onChange={e => setFormData({...formData, ugr: handleOnlyNumbers(e.target.value, 6)})}
                  />
               </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Detalhada / Finalidade da Dotação</label>
            <textarea 
              rows={3}
              placeholder="Descreva detalhadamente a finalidade deste crédito..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Save size={20} /> 
            {initialData ? 'Atualizar Dados do Crédito' : 'Confirmar Cadastro de Crédito'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreditForm;
