
import React, { useState, useMemo, useEffect } from 'react';
import { Credit, Commitment, Refund, Cancellation, UG, CommitmentAllocation } from '../types';
import { Save, AlertCircle, TrendingDown, ArrowLeft, Landmark, ListChecks, ArrowRight, Zap, Info } from 'lucide-react';
import { UGS } from '../constants';

interface CommitmentFormProps {
  credits: Credit[];
  commitments: Commitment[];
  refunds: Refund[];
  cancellations: Cancellation[];
  onSave: (commitment: Commitment) => void;
  onCancel: () => void;
  initialData?: Commitment;
}

const CommitmentForm: React.FC<CommitmentFormProps> = ({ credits, commitments, refunds, cancellations, onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    ug: '' as UG | '',
    pi: '',
    nd: '',
    ne: initialData?.ne || '2026NE',
    totalValue: initialData?.value || 0,
    allocations: initialData?.allocations || [] as CommitmentAllocation[],
    description: initialData?.description || '',
    date: initialData?.date || new Date().toISOString().split('T')[0]
  });

  const [error, setError] = useState<string | null>(null);

  // Cálculo de saldo real de cada NC
  const getNCAvailableBalance = (credit: Credit) => {
    const totalSpent = commitments.reduce((acc, com) => {
      if (com.id === initialData?.id) return acc;
      const alloc = com.allocations?.find(a => a.creditId === credit.id);
      return acc + (alloc ? alloc.value : 0);
    }, 0);
    
    const totalRefunded = refunds.filter(ref => ref.creditId === credit.id).reduce((a, b) => a + b.value, 0);
    
    const totalCancelled = cancellations.reduce((acc, can) => {
      const com = commitments.find(c => c.id === can.commitmentId);
      if (!com) return acc;
      const alloc = com.allocations?.find(a => a.creditId === credit.id);
      if (!alloc) return acc;
      return acc + (can.value * (alloc.value / com.value));
    }, 0);

    return parseFloat((credit.valueReceived - totalSpent - totalRefunded + totalCancelled).toFixed(2));
  };

  const piOptions = useMemo(() => {
    if (!formData.ug) return [];
    
    // Filtra PIs que possuem pelo menos uma NC com saldo disponível
    const pisWithBalance = credits
      .filter(c => c.ug === formData.ug)
      .filter(c => getNCAvailableBalance(c) >= 0.01)
      .map(c => c.pi);

    return Array.from(new Set(pisWithBalance)).sort();
  }, [formData.ug, credits, commitments, refunds, cancellations]);

  const ndOptions = useMemo(() => {
    if (!formData.ug || !formData.pi) return [];

    // Filtra NDs que possuem pelo menos uma NC com saldo disponível para o PI selecionado
    const ndsWithBalance = credits
      .filter(c => c.ug === formData.ug && c.pi === formData.pi)
      .filter(c => getNCAvailableBalance(c) >= 0.01)
      .map(c => c.nd);

    return Array.from(new Set(ndsWithBalance)).sort();
  }, [formData.ug, formData.pi, credits, commitments, refunds, cancellations]);

  // NCs filtradas e ORDENADAS POR DATA (FIFO)
  const availableNCs = useMemo(() => {
    if (!formData.ug || !formData.pi || !formData.nd) return [];
    return credits
      .filter(c => c.ug === formData.ug && c.pi === formData.pi && c.nd === formData.nd)
      .map(c => ({
        ...c,
        available: getNCAvailableBalance(c)
      }))
      .filter(c => c.available >= 0.01 || formData.allocations.some(a => a.creditId === c.id))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [formData.ug, formData.pi, formData.nd, credits, commitments, refunds, cancellations, formData.allocations]);

  const aggregateAvailableBalance = useMemo(() => {
    return parseFloat(availableNCs.reduce((acc, nc) => acc + nc.available, 0).toFixed(2));
  }, [availableNCs]);

  // Distribuição Automática baseada em FIFO
  const handleAutoDistribute = () => {
    setError(null);
    if (formData.totalValue <= 0) {
      setError('⚠️ Informe o valor total da NE primeiro.');
      return;
    }
    
    if (formData.totalValue > aggregateAvailableBalance) {
      setError(`❌ Saldo insuficiente. O grupo possui apenas R$ ${aggregateAvailableBalance.toLocaleString('pt-BR')}`);
      return;
    }
    
    let remaining = formData.totalValue;
    const newAllocations: CommitmentAllocation[] = [];

    for (const nc of availableNCs) {
      if (remaining <= 0) break;
      const take = parseFloat(Math.min(remaining, nc.available).toFixed(2));
      if (take > 0) {
        newAllocations.push({ creditId: nc.id, value: take });
        remaining = parseFloat((remaining - take).toFixed(2));
      }
    }

    setFormData({ ...formData, allocations: newAllocations });
  };

  const handleManualAllocChange = (creditId: string, val: number) => {
    const existingIdx = formData.allocations.findIndex(a => a.creditId === creditId);
    let newAllocations = [...formData.allocations];

    if (existingIdx >= 0) {
      if (val <= 0) newAllocations.splice(existingIdx, 1);
      else newAllocations[existingIdx].value = parseFloat(val.toFixed(2));
    } else if (val > 0) {
      newAllocations.push({ creditId, value: parseFloat(val.toFixed(2)) });
    }

    const currentTotal = parseFloat(newAllocations.reduce((a, b) => a + b.value, 0).toFixed(2));
    setFormData({ ...formData, allocations: newAllocations, totalValue: currentTotal });
  };

  const isDotationReady = formData.ug && formData.pi && formData.nd;
  const needsDistribution = isDotationReady && formData.totalValue > 0 && formData.allocations.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const actualTotal = parseFloat(formData.allocations.reduce((a, b) => a + b.value, 0).toFixed(2));

    if (formData.allocations.length === 0 || actualTotal <= 0) {
      setError('⚠️ Distribua o valor entre as NCs (use o botão de raio).');
      return;
    }

    if (Math.abs(actualTotal - formData.totalValue) > 0.01) {
      setError('⚠️ O valor total alocado não confere com o valor da NE.');
      return;
    }

    if (formData.ne.length < 12) {
      setError('⚠️ O número da NE deve ter 12 caracteres.');
      return;
    }

    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      ne: formData.ne.toUpperCase(),
      allocations: formData.allocations,
      value: actualTotal,
      date: formData.date,
      description: formData.description
    });
    onCancel();
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-20">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-red-700 font-black text-[10px] uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Voltar à lista
      </button>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-red-100 overflow-hidden text-black font-sans">
        {/* Header do Formulário */}
        <div className="bg-red-800 px-8 py-7 text-white flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-red-900/50 rounded-2xl border border-red-700">
               <TrendingDown size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight italic">
                {initialData ? 'Editar Empenho' : 'Novo Empenho Multi-NC'}
              </h2>
              <p className="text-red-300 text-[10px] uppercase tracking-widest font-black mt-1 italic opacity-80">
                Execução Orçamentária • Princípio FIFO (Mais antigo primeiro)
              </p>
            </div>
          </div>
          <Landmark className="text-red-400 opacity-20" size={60} />
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 font-black text-[10px] uppercase flex items-center gap-3 animate-shake">
              <AlertCircle size={20} /> {error}
            </div>
          )}

          {/* Seleção de Dotação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade Gestora</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-red-500 transition-all" 
                value={formData.ug} 
                onChange={e => setFormData({...formData, ug: e.target.value as UG, pi: '', nd: '', allocations: []})} 
                disabled={!!initialData}
              >
                <option value="">Selecione...</option>
                {UGS.map(ug => <option key={ug} value={ug}>{ug}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano Interno (PI)</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-40 transition-all" 
                value={formData.pi} 
                onChange={e => setFormData({...formData, pi: e.target.value, nd: '', allocations: []})} 
                disabled={!formData.ug || !!initialData}
              >
                <option value="">{!formData.ug ? 'Aguardando UG...' : piOptions.length === 0 ? 'Nenhum PI com saldo' : 'Selecione...'}</option>
                {piOptions.map(pi => <option key={pi} value={pi}>{pi}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Natureza (ND)</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-40 transition-all" 
                value={formData.nd} 
                onChange={e => setFormData({...formData, nd: e.target.value, allocations: []})} 
                disabled={!formData.pi || !!initialData}
              >
                <option value="">{!formData.pi ? 'Aguardando PI...' : ndOptions.length === 0 ? 'Nenhuma ND com saldo' : 'Selecione...'}</option>
                {ndOptions.map(nd => <option key={nd} value={nd}>{nd}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Lista de NCs Disponíveis */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <ListChecks size={16} className="text-red-600" /> Distribuição de Saldos
                </h4>
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-400 uppercase leading-none italic">Saldo do Grupo</p>
                   <p className="text-xs font-black text-red-600">R$ {aggregateAvailableBalance.toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-3 custom-scrollbar">
                {availableNCs.length > 0 ? availableNCs.map((nc, idx) => (
                  <div key={nc.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center gap-4 transition-all hover:border-red-200 hover:bg-white shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black bg-red-800 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                          {idx + 1}
                        </span>
                        <p className="text-[11px] font-black text-slate-900 italic tracking-tight">{nc.nc}</p>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5">
                        Saldo: <span className="text-red-600">R$ {nc.available.toLocaleString('pt-BR')}</span>
                      </p>
                      <p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter mt-0.5">
                        Carga em: {new Date(nc.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="w-36">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0,00"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs font-black text-red-700 outline-none focus:ring-2 focus:ring-red-500 shadow-inner"
                          value={formData.allocations.find(a => a.creditId === nc.id)?.value || ''}
                          onChange={e => handleManualAllocChange(nc.id, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-16 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] opacity-40 bg-slate-50 flex flex-col items-center">
                    <Info size={40} className="text-slate-300 mb-3" />
                    <p className="text-[10px] font-black uppercase italic tracking-widest text-slate-400">
                      Selecione UG, PI e ND<br/>para listar os créditos
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Painel de Valor Total e Botão Raio */}
            <div className="space-y-6">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 relative overflow-hidden shadow-2xl">
                {/* Efeito Visual de Fundo */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Zap size={14} fill="currentColor" /> Valor Total da NE (Desejado)
                </label>
                
                <div className="flex flex-col sm:flex-row items-stretch gap-4 relative z-10">
                  <div className="flex-1 relative">
                    <span className="absolute left-0 bottom-4 text-emerald-500 text-lg font-black opacity-40">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full bg-transparent border-b-4 border-slate-800 text-5xl font-black text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-800 pb-2 pl-8" 
                      placeholder="0,00"
                      value={formData.totalValue || ''}
                      onChange={e => setFormData({...formData, totalValue: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  
                  {/* O BOTÃO DE RAIO REESTILIZADO */}
                  <button 
                    type="button"
                    onClick={handleAutoDistribute}
                    className={`
                      px-8 py-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all 
                      ${isDotationReady 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-100' 
                        : 'bg-slate-800 text-slate-500 grayscale opacity-50 cursor-not-allowed'
                      }
                      ${needsDistribution ? 'animate-bounce ring-4 ring-emerald-500/50' : 'active:scale-95'}
                    `}
                    title="Preencher saldos automaticamente seguindo a ordem FIFO"
                  >
                    <Zap size={28} fill="currentColor" className={needsDistribution ? 'animate-pulse' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-tight leading-none">Distribuir<br/>Saldo</span>
                  </button>
                </div>

                <div className="mt-6 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-3">
                   <div className="p-1.5 bg-emerald-500 rounded-lg text-white shadow-lg"><Info size={14} /></div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase italic leading-relaxed">
                     O sistema utilizará prioritariamente os saldos das NCs recebidas há mais tempo (FIFO), respeitando a ordem cronológica de dotação.
                   </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Emissão</label>
                   <input 
                     type="date" 
                     className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-red-500 [color-scheme:light] shadow-sm"
                     value={formData.date}
                     onChange={e => setFormData({...formData, date: e.target.value})}
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota de Empenho (NE)</label>
                   <input 
                     type="text" 
                     maxLength={12}
                     placeholder="2026NE000XXX"
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                     value={formData.ne}
                     onChange={e => setFormData({...formData, ne: e.target.value.toUpperCase()})}
                   />
                 </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Histórico da Despesa</label>
                <textarea 
                  rows={2} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-medium outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                  placeholder="Ex: Aquisição de gêneros alimentícios para o Rancho..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Footer de Ação */}
          <div className="pt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
             <div className="flex-1 bg-slate-50 p-6 rounded-[2rem] flex items-center justify-between border border-slate-100 shadow-inner">
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Total Consolidado nas Alocações</p>
                   <p className="text-3xl font-black text-slate-900">
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.allocations.reduce((a, b) => a + b.value, 0))}
                   </p>
                </div>
                <ArrowRight className="text-slate-200 hidden sm:block" size={40} />
             </div>
             
             <button 
              type="submit" 
              className="px-12 py-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95"
             >
               <Save size={24} /> Confirmar Lançamento
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommitmentForm;
