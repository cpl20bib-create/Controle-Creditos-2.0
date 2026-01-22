
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

  // Estado para armazenar as alocações manuais/automáticas por NC { [ncId]: valor }
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // 1. Filtragem Hierárquica
  const availablePIs = useMemo(() => {
    if (!formData.ug) return [];
    const filtered = credits.filter(c => c.ug === formData.ug);
    return Array.from(new Set(filtered.map(c => c.pi))).sort();
  }, [credits, formData.ug]);

  const availableNDs = useMemo(() => {
    if (!formData.ug || !formData.pi) return [];
    const filtered = credits.filter(c => c.ug === formData.ug && c.pi === formData.pi);
    return Array.from(new Set(filtered.map(c => c.nd))).sort();
  }, [credits, formData.ug, formData.pi]);

  const availableNCs = useMemo(() => {
    if (!formData.ug || !formData.pi || !formData.nd) return [];
    return credits
      .filter(c => c.ug === formData.ug && c.pi === formData.pi && c.nd === formData.nd)
      .filter(c => c.valueAvailable > 0)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [credits, formData.ug, formData.pi, formData.nd]);

  // Limpeza de campos dependentes
  useEffect(() => setFormData(prev => ({ ...prev, pi: '', nd: '', totalValue: 0 })), [formData.ug]);
  useEffect(() => setFormData(prev => ({ ...prev, nd: '', totalValue: 0 })), [formData.pi]);
  useEffect(() => {
    setFormData(prev => ({ ...prev, totalValue: 0 }));
    setAllocations({});
  }, [formData.nd]);

  const currentAllocatedSum = Object.values(allocations).reduce((a, b) => a + b, 0);
  const needsDistribution = formData.totalValue > 0 && currentAllocatedSum === 0;

  const handleAutoDistribute = () => {
    if (formData.totalValue <= 0) {
      setError("Insira o valor total do empenho antes de distribuir.");
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
      setError(`Saldo insuficiente nas NCs selecionadas. Faltam R$ ${remaining.toLocaleString('pt-BR')}`);
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
      setError("A soma das alocações deve ser igual ao valor total do empenho.");
      return;
    }

    if (!formData.ne || formData.ne.length < 10) {
      setError("O número da NE parece inválido ou incompleto.");
      return;
    }

    // Gerar empenhos para cada NC que recebeu alocação
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
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500 font-sans text-black pb-20">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-red-700 font-black text-[10px] uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Voltar à lista de empenhos
      </button>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-red-900 px-8 py-7 text-white flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">Nova Nota de Empenho (NE)</h2>
              <p className="text-red-400 text-[9px] font-black uppercase tracking-widest mt-1 opacity-80">Processamento de Alocação Orçamentária - BIB 20</p>
           </div>
           <div className="bg-red-800/50 p-3 rounded-2xl">
              <Landmark size={32} className="opacity-50" />
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-black text-[10px] uppercase flex items-center gap-3 animate-shake">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Seção 1: Identificação e Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade Gestora (UG)</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none" 
                  value={formData.ug} 
                  onChange={e => setFormData({...formData, ug: e.target.value as UG})}
                >
                  <option value="">Selecione a UG</option>
                  {UGS.map(ug => <option key={ug} value={ug}>{ug}</option>)}
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano Interno (PI)</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-40" 
                  value={formData.pi} 
                  onChange={e => setFormData({...formData, pi: e.target.value})}
                  disabled={!formData.ug}
                >
                  <option value="">Selecione o PI</option>
                  {availablePIs.map(pi => <option key={pi} value={pi}>{pi}</option>)}
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Natureza (ND)</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-40" 
                  value={formData.nd} 
                  onChange={e => setFormData({...formData, nd: e.target.value})}
                  disabled={!formData.pi}
                >
                  <option value="">Selecione a ND</option>
                  {availableNDs.map(nd => <option key={nd} value={nd}>{nd}</option>)}
                </select>
             </div>
          </div>

          {/* Seção 2: Valores e Painel de Distribuição */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             <div className="space-y-6">
                <div className="bg-slate-950 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                  
                  <div className="relative z-10 space-y-6">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Montante do Empenho</span>
                        <Zap size={20} className={needsDistribution ? 'text-emerald-500 animate-pulse' : 'text-slate-700'} />
                     </div>
                     
                     <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-700">R$</span>
                        <input 
                           type="number" 
                           step="0.01"
                           placeholder="0,00"
                           className="w-full bg-transparent border-b-2 border-slate-800 focus:border-red-600 outline-none pl-12 py-2 text-5xl font-black text-white transition-all placeholder:text-slate-900"
                           value={formData.totalValue || ''}
                           onChange={e => setFormData({...formData, totalValue: parseFloat(e.target.value) || 0})}
                           disabled={!formData.nd}
                        />
                     </div>

                     <button 
                        type="button"
                        onClick={handleAutoDistribute}
                        disabled={!formData.nd || formData.totalValue <= 0}
                        className={`w-full py-5 rounded-2xl flex items-center justify-center gap-4 transition-all ${
                          needsDistribution 
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse' 
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                     >
                        <Zap size={20} className={needsDistribution ? 'text-white fill-white' : ''} />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Distribuir Saldo</span>
                     </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                         <FileText size={12}/> Número da NE
                      </label>
                      <input 
                        type="text" 
                        maxLength={12}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-red-500" 
                        value={formData.ne} 
                        onChange={e => setFormData({...formData, ne: e.target.value.toUpperCase()})} 
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                         <Calendar size={12}/> Data de Emissão
                      </label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-red-500 [color-scheme:light]" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                      />
                   </div>
                </div>
             </div>

             <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-8 flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500" /> Notas de Crédito Disponíveis
                   </h3>
                   <span className="text-[10px] font-black text-slate-400 uppercase">{availableNCs.length} NCs</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                   {availableNCs.length > 0 ? availableNCs.map(nc => (
                     <div key={nc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-500 transition-all">
                        <div className="flex-1">
                           <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{nc.nc}</p>
                           <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Saldo: {formatCurrency(nc.valueAvailable)}</p>
                           <p className="text-[7px] text-slate-300 font-black mt-0.5 uppercase">Lançado em: {new Date(nc.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="w-32">
                           <input 
                             type="number" 
                             step="0.01"
                             placeholder="R$ 0,00"
                             className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-right text-emerald-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                             value={allocations[nc.id] || ''}
                             onChange={e => handleManualAllocChange(nc.id, parseFloat(e.target.value) || 0)}
                           />
                        </div>
                     </div>
                   )) : (
                     <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-10">
                        <Landmark size={48} className="mb-4" />
                        <p className="text-[9px] font-black uppercase tracking-widest">Aguardando seleção de ND para carregar saldos disponíveis</p>
                     </div>
                   )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
                   <div className="text-left">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Total Alocado</p>
                      <p className={`text-lg font-black ${Math.abs(currentAllocatedSum - formData.totalValue) < 0.01 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formatCurrency(currentAllocatedSum)}
                      </p>
                   </div>
                   {Math.abs(currentAllocatedSum - formData.totalValue) < 0.01 && formData.totalValue > 0 && (
                     <div className="bg-emerald-100 text-emerald-700 p-2 rounded-full animate-bounce">
                        <CheckCircle2 size={20} />
                     </div>
                   )}
                </div>
             </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição / Finalidade da Despesa</label>
            <textarea 
              rows={2} 
              placeholder="Ex: Aquisição de material de expediente conforme pregão 01/2026..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none shadow-inner" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-6 bg-red-700 hover:bg-red-800 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
            disabled={formData.totalValue <= 0 || Math.abs(currentAllocatedSum - formData.totalValue) > 0.01}
          >
            <Save size={20} /> Efetivar Lançamento de Empenho
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommitmentForm;
