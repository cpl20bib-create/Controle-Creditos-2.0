
import React, { useState, useMemo, useEffect } from 'react';
import { Credit, Commitment, UG } from '../types';
import { Save, ArrowLeft, Landmark, Zap, AlertCircle, Calendar, FileText, CheckCircle2 } from 'lucide-react';
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
    pi: '',
    nd: '',
    ne: initialData?.ne || '2026NE',
    totalValue: initialData?.value || 0,
    description: initialData?.description || '',
    date: initialData?.date || new Date().toISOString().split('T')[0]
  });

  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // 1. Filtragem Hierárquica
  const availablePIs = useMemo(() => {
    if (!formData.ug) return [];
    return Array.from(new Set(credits.filter(c => c.ug === formData.ug).map(c => c.pi))).sort();
  }, [credits, formData.ug]);

  const availableNDs = useMemo(() => {
    if (!formData.ug || !formData.pi) return [];
    return Array.from(new Set(credits.filter(c => c.ug === formData.ug && c.pi === formData.pi).map(c => c.nd))).sort();
  }, [credits, formData.ug, formData.pi]);

  // Lista ordenada cronologicamente (FIFO)
  const availableNCs = useMemo(() => {
    if (!formData.ug || !formData.pi || !formData.nd) return [];
    return credits
      .filter(c => c.ug === formData.ug && c.pi === formData.pi && c.nd === formData.nd)
      .filter(c => c.valueAvailable > 0)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [credits, formData.ug, formData.pi, formData.nd]);

  // Reset de cascata
  useEffect(() => { setFormData(prev => ({ ...prev, pi: '', nd: '', totalValue: 0 })); setAllocations({}); }, [formData.ug]);
  useEffect(() => { setFormData(prev => ({ ...prev, nd: '', totalValue: 0 })); setAllocations({}); }, [formData.pi]);
  useEffect(() => { setFormData(prev => ({ ...prev, totalValue: 0 })); setAllocations({}); }, [formData.nd]);

  const currentAllocatedSum = Object.values(allocations).reduce((a, b) => a + b, 0);
  const needsDistribution = formData.totalValue > 0 && currentAllocatedSum === 0;

  const handleAutoDistribute = () => {
    if (formData.totalValue <= 0) {
      setError("Insira um valor de empenho válido antes de distribuir.");
      return;
    }
    
    let remaining = formData.totalValue;
    const newAllocations: Record<string, number> = {};

    for (const nc of availableNCs) {
      if (remaining <= 0) break;
      const toTake = Math.min(nc.valueAvailable, remaining);
      if (toTake > 0) {
        newAllocations[nc.id] = parseFloat(toTake.toFixed(2));
        remaining -= toTake;
      }
    }

    if (remaining > 0.01) {
      setError(`O saldo total das NCs (R$ ${(formData.totalValue - remaining).toLocaleString('pt-BR')}) é insuficiente para o valor total desejado.`);
    } else {
      setError(null);
    }

    setAllocations(newAllocations);
  };

  const handleManualAllocChange = (ncId: string, val: number) => {
    const nc = availableNCs.find(n => n.id === ncId);
    if (!nc) return;
    const safeVal = Math.min(nc.valueAvailable, Math.max(0, val));
    setAllocations(prev => ({ ...prev, [ncId]: safeVal }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (Math.abs(currentAllocatedSum - formData.totalValue) > 0.01) {
      setError("Diferença detectada: O valor total alocado nas NCs deve ser idêntico ao valor total do empenho.");
      return;
    }

    if (!formData.ne || formData.ne.length < 10) {
      setError("O número da NE é obrigatório.");
      return;
    }

    // Persistir empenhos para cada NC alocada
    Object.entries(allocations).forEach(([ncId, value]) => {
      if (value > 0) {
        onSave({
          id: Math.random().toString(36).substr(2, 9),
          ne: formData.ne.toUpperCase(),
          creditId: ncId,
          value: value,
          date: formData.date,
          description: formData.description
        });
      }
    });

    onCancel();
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500 font-sans text-black pb-24">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-red-700 font-black text-[10px] uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-red-950 px-8 py-8 text-white flex items-center justify-between">
           <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Nova Nota de Empenho (NE)</h2>
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80 italic">Sistema de Execução Orçamentária - BIB 20</p>
           </div>
           <div className="bg-red-900/40 p-4 rounded-[1.5rem] border border-red-800/30">
              <Landmark size={32} className="opacity-40" />
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          {error && (
            <div className="p-5 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-black text-[11px] uppercase flex items-center gap-4 animate-shake shadow-sm">
              <AlertCircle size={22} />
              {error}
            </div>
          )}

          {/* Seleção de Dotação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade Gestora (UG)</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                  value={formData.ug} 
                  onChange={e => setFormData({...formData, ug: e.target.value as UG})}
                >
                  <option value="">Selecione a UG</option>
                  {UGS.map(ug => <option key={ug} value={ug}>{ug}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano Interno (PI)</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-40 transition-all" 
                  value={formData.pi} 
                  onChange={e => setFormData({...formData, pi: e.target.value})}
                  disabled={!formData.ug}
                >
                  <option value="">Selecione o PI</option>
                  {availablePIs.map(pi => <option key={pi} value={pi}>{pi}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Natureza (ND)</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-40 transition-all" 
                  value={formData.nd} 
                  onChange={e => setFormData({...formData, nd: e.target.value})}
                  disabled={!formData.pi}
                >
                  <option value="">Selecione a ND</option>
                  {availableNDs.map(nd => <option key={nd} value={nd}>{nd}</option>)}
                </select>
             </div>
          </div>

          {/* Painel Central de Distribuição */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
             <div className="space-y-8">
                {/* O PAINEL PRETO ELEGANTE */}
                <div className="bg-slate-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border border-slate-800">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                  
                  <div className="relative z-10 space-y-8">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Valor Total do Empenho</span>
                        <Zap size={22} className={needsDistribution ? 'text-emerald-400 animate-pulse fill-emerald-400' : 'text-slate-800'} />
                     </div>
                     
                     <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-slate-800 italic">R$</span>
                        <input 
                           type="number" 
                           step="0.01"
                           placeholder="0,00"
                           className="w-full bg-transparent border-b-2 border-slate-900 focus:border-emerald-600 outline-none pl-14 py-2 text-6xl font-black text-white transition-all placeholder:text-slate-900 tracking-tighter"
                           value={formData.totalValue || ''}
                           onChange={e => setFormData({...formData, totalValue: parseFloat(e.target.value) || 0})}
                           disabled={!formData.nd}
                        />
                     </div>

                     <button 
                        type="button"
                        onClick={handleAutoDistribute}
                        disabled={!formData.nd || formData.totalValue <= 0}
                        className={`w-full py-6 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-95 ${
                          needsDistribution 
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-pulse' 
                          : 'bg-slate-900 text-slate-600 border border-slate-800'
                        }`}
                     >
                        <Zap size={22} className={needsDistribution ? 'text-white fill-white' : 'text-slate-700'} />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Distribuir Saldo</span>
                     </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                         <FileText size={14} className="text-red-500"/> Nota de Empenho (NE)
                      </label>
                      <input 
                        type="text" 
                        maxLength={12}
                        placeholder="2026NE000XXX"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-red-500 shadow-sm" 
                        value={formData.ne} 
                        onChange={e => setFormData({...formData, ne: e.target.value.toUpperCase()})} 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                         <Calendar size={14} className="text-red-500"/> Data de Emissão
                      </label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-red-500 [color-scheme:light] shadow-sm" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                      />
                   </div>
                </div>
             </div>

             {/* Lista de NCs Disponíveis */}
             <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8 flex flex-col min-h-[480px] shadow-inner">
                <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                   <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                      Composição do Saldo (FIFO)
                   </h3>
                   <span className="text-[10px] font-black text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">{availableNCs.length} Notas de Crédito</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                   {availableNCs.length > 0 ? availableNCs.map(nc => (
                     <div key={nc.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-500 transition-all">
                        <div className="flex-1">
                           <div className="flex items-center gap-2">
                              <p className="text-[11px] font-black text-slate-900 uppercase italic leading-none">{nc.nc}</p>
                              <span className="text-[7px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">Fila {availableNCs.indexOf(nc) + 1}</span>
                           </div>
                           <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase">Disponível: {formatCurrency(nc.valueAvailable)}</p>
                           <p className="text-[7px] text-slate-300 font-black mt-1 uppercase tracking-tighter">Recebida em: {new Date(nc.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="w-36">
                           <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">R$</span>
                              <input 
                                type="number" 
                                step="0.01"
                                placeholder="0,00"
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-3 py-3 text-xs font-black text-right text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                                value={allocations[nc.id] || ''}
                                onChange={e => handleManualAllocChange(nc.id, parseFloat(e.target.value) || 0)}
                              />
                           </div>
                        </div>
                     </div>
                   )) : (
                     <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-12">
                        <Landmark size={56} className="mb-6 text-slate-400" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
                          Selecione UG, PI e ND para visualizar as Notas de Crédito com saldo disponível
                        </p>
                     </div>
                   )}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
                   <div className="text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Montante Alocado</p>
                      <p className={`text-2xl font-black italic ${Math.abs(currentAllocatedSum - formData.totalValue) < 0.01 && formData.totalValue > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formatCurrency(currentAllocatedSum)}
                      </p>
                   </div>
                   {Math.abs(currentAllocatedSum - formData.totalValue) < 0.01 && formData.totalValue > 0 && (
                     <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-500/30 animate-bounce">
                        <CheckCircle2 size={24} />
                     </div>
                   )}
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Objeto / Finalidade da Despesa</label>
            <textarea 
              rows={2} 
              placeholder="Descreva a finalidade desta Nota de Empenho detalhadamente..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none shadow-sm" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-7 bg-red-700 hover:bg-red-800 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={formData.totalValue <= 0 || Math.abs(currentAllocatedSum - formData.totalValue) > 0.01}
          >
            <Save size={24} /> Efetivar Nota de Empenho no Sistema
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommitmentForm;
