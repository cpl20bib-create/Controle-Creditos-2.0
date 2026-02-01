import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Credit, Commitment, Refund, Cancellation, UG } from '../types';
import { Save, ArrowLeft, Landmark, Zap, AlertCircle, Calendar, FileText, CheckCircle2, Layers, Tag } from 'lucide-react';
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

// Interface para representar o agrupamento de dotações
interface BudgetCell {
  id: string; // Chave composta
  pi: string;
  nd: string;
  fonte: string;
  ptres: string;
  esfera: string;
  ugr: string;
  totalBalance: number;
  constituentCredits: (Credit & { realBalance: number })[];
}

const CommitmentForm: React.FC<CommitmentFormProps> = ({ 
  credits, commitments, refunds, cancellations, onSave, onCancel, initialData 
}) => {
  const [formData, setFormData] = useState({
    ug: '' as UG | '',
    cellId: '', // ID da célula selecionada
    ne: initialData?.ne || '2026NE',
    totalValue: initialData?.value || 0,
    description: initialData?.description || '',
    date: initialData?.date || new Date().toISOString().split('T')[0]
  });

  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Helper para cálculo de saldo individual de uma NC
  const getNCBalance = useCallback((credit: Credit) => {
    const totalSpent = commitments.filter(com => com.creditId === credit.id).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const totalRefunded = refunds.filter(ref => ref.creditId === credit.id).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const totalCancelled = cancellations.reduce((acc, can) => {
      const com = commitments.find(c => c.id === can.commitmentId);
      return (com && com.creditId === credit.id) ? acc + (Number(can.value) || 0) : acc;
    }, 0);
    return Number(credit.valueReceived) - totalSpent - totalRefunded + totalCancelled;
  }, [commitments, refunds, cancellations]);

  // Agrupamento por Células Orçamentárias
  const budgetCells = useMemo(() => {
    if (!formData.ug) return [];

    const cellsMap: Record<string, BudgetCell> = {};

    credits.filter(c => c.ug === formData.ug).forEach(credit => {
      const realBalance = getNCBalance(credit);
      if (realBalance <= 0.01) return;

      // Chave Única da Célula (PI + ND + FONTE + PTRES + ESFERA + UGR)
      const cellKey = `${credit.pi}-${credit.nd}-${credit.fonte}-${credit.ptres}-${credit.esfera}-${credit.ugr}`;

      if (!cellsMap[cellKey]) {
        cellsMap[cellKey] = {
          id: cellKey,
          pi: credit.pi,
          nd: credit.nd,
          fonte: credit.fonte,
          ptres: credit.ptres,
          esfera: credit.esfera,
          ugr: credit.ugr,
          totalBalance: 0,
          constituentCredits: []
        };
      }

      cellsMap[cellKey].totalBalance += realBalance;
      cellsMap[cellKey].constituentCredits.push({ ...credit, realBalance });
    });

    // Ordenar créditos de cada célula por data (FIFO)
    Object.values(cellsMap).forEach(cell => {
      cell.constituentCredits.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return Object.values(cellsMap).sort((a, b) => a.pi.localeCompare(b.pi));
  }, [credits, formData.ug, getNCBalance]);

  const selectedCell = useMemo(() => 
    budgetCells.find(c => c.id === formData.cellId), [budgetCells, formData.cellId]
  );

  // Resetar seleções ao mudar UG
  useEffect(() => {
    setFormData(prev => ({ ...prev, cellId: '', totalValue: 0 }));
    setAllocations({});
  }, [formData.ug]);

  // Auto-distribuição FIFO baseada no valor total
  useEffect(() => {
    if (selectedCell && formData.totalValue > 0) {
      let remaining = formData.totalValue;
      const newAllocations: Record<string, number> = {};

      for (const nc of selectedCell.constituentCredits) {
        if (remaining <= 0) break;
        const toTake = Math.min(nc.realBalance, remaining);
        if (toTake > 0) {
          newAllocations[nc.id] = parseFloat(toTake.toFixed(2));
          remaining -= toTake;
        }
      }
      
      setAllocations(newAllocations);
      
      if (remaining > 0.01) {
        setError(`Saldo insuficiente na célula. Faltam R$ ${remaining.toLocaleString('pt-BR')}`);
      } else {
        setError(null);
      }
    } else {
      setAllocations({});
    }
  }, [formData.totalValue, selectedCell]);

  // Fix: Explicitly cast Object.values to number[] to resolve unknown type errors in reduce and subsequent arithmetic operations
  const currentAllocatedSum = (Object.values(allocations) as number[]).reduce((a, b) => a + b, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCell) {
      setError("Selecione uma célula orçamentária.");
      return;
    }

    if (Math.abs(currentAllocatedSum - formData.totalValue) > 0.01) {
      setError("A distribuição do saldo está incompleta ou excede o disponível.");
      return;
    }

    if (!formData.ne || formData.ne.length < 10) {
      setError("O número da Nota de Empenho (NE) é obrigatório.");
      return;
    }

    // Persistência: Cria um registro para cada NC consumida (mesma NE)
    // Fix: Explicitly cast Object.entries to resolve unknown type error on 'value'
    (Object.entries(allocations) as [string, number][]).forEach(([ncId, value]) => {
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
    <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500 font-sans text-black pb-24">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-red-700 font-black text-[10px] uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Voltar à lista de empenhos
      </button>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-red-950 px-10 py-8 text-white flex items-center justify-between">
           <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight leading-none">Novo Empenho por Célula</h2>
              <p className="text-red-50 text-[10px] font-black uppercase tracking-widest mt-2 opacity-80 italic">Agrupamento Técnico e FIFO Automático</p>
           </div>
           <div className="bg-red-900/30 p-4 rounded-2xl border border-red-800/30">
              <Layers size={32} className="opacity-30" />
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          {error && (
            <div className="p-5 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-black text-[11px] uppercase flex items-center gap-4 animate-shake shadow-sm">
              <AlertCircle size={24} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Célula Orçamentária (PI | ND | FONTE | SALDO)</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-40 transition-all" 
                  value={formData.cellId} 
                  onChange={e => setFormData({...formData, cellId: e.target.value})}
                  disabled={!formData.ug}
                >
                  <option value="">{budgetCells.length === 0 ? 'Sem células com saldo' : 'Selecione a Célula...'}</option>
                  {budgetCells.map(cell => (
                    <option key={cell.id} value={cell.id}>
                      PI: {cell.pi} | ND: {cell.nd} | FONTE: {cell.fonte} | Saldo: {formatCurrency(cell.totalBalance)}
                    </option>
                  ))}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
             <div className="space-y-8">
                <div className="bg-slate-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border border-slate-800">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  
                  <div className="relative z-10 space-y-8">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Montante Total do Empenho</span>
                        <Zap size={22} className={formData.totalValue > 0 ? 'text-emerald-400 animate-pulse fill-emerald-400' : 'text-slate-800'} />
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
                           disabled={!formData.cellId}
                        />
                     </div>
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
                         <Calendar size={14} className="text-red-500"/> Data do Documento
                      </label>
                      <input 
                        type="date" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-red-500 [color-scheme:light] shadow-sm" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                      />
                   </div>
                </div>
             </div>

             <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8 flex flex-col min-h-[500px] shadow-inner relative overflow-hidden">
                <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                   <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                      Execução FIFO (Distribuição Automática)
                   </h3>
                   {selectedCell && <span className="text-[10px] font-black text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">{selectedCell.constituentCredits.length} Notas</span>}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                   {selectedCell ? selectedCell.constituentCredits.map((nc, idx) => (
                     <div key={nc.id} className={`bg-white p-5 rounded-2xl border transition-all ${allocations[nc.id] ? 'border-emerald-500 shadow-lg' : 'border-slate-100 opacity-60'}`}>
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <div className="flex items-center gap-2">
                                 <p className="text-[11px] font-black text-slate-900 uppercase italic leading-none">{nc.nc}</p>
                                 <span className="text-[7px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">Fila {idx + 1}</span>
                              </div>
                              <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase">Saldo: {formatCurrency(nc.realBalance)}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[9px] font-black text-emerald-600 uppercase">Consumo</p>
                              <p className="text-sm font-black text-emerald-700">{formatCurrency(allocations[nc.id] || 0)}</p>
                           </div>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                              className="h-full bg-emerald-500 transition-all duration-700" 
                              style={{ width: `${Math.min(100, ((allocations[nc.id] || 0) / nc.realBalance) * 100)}%` }}
                           ></div>
                        </div>
                     </div>
                   )) : (
                     <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-12">
                        <Tag size={64} className="mb-6 text-slate-400" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
                          Selecione uma Célula Orçamentária para visualizar o plano de execução automática
                        </p>
                     </div>
                   )}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200 flex justify-between items-center bg-white/50 -mx-8 px-8 pb-4">
                   <div className="text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Alocado</p>
                      <p className={`text-2xl font-black italic ${Math.abs(currentAllocatedSum - formData.totalValue) < 0.01 && formData.totalValue > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formatCurrency(currentAllocatedSum)}
                      </p>
                   </div>
                   {Math.abs(currentAllocatedSum - formData.totalValue) < 0.01 && formData.totalValue > 0 && (
                     <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-xl shadow-emerald-500/20 animate-bounce">
                        <CheckCircle2 size={24} />
                     </div>
                   )}
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Técnica / Finalidade da Despesa</label>
            <textarea 
              rows={2} 
              placeholder="Descreva detalhadamente a finalidade deste empenho..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none shadow-sm" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-7 bg-red-700 hover:bg-red-800 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={formData.totalValue <= 0 || Math.abs(currentAllocatedSum - formData.totalValue) > 0.01}
          >
            <Save size={24} /> Efetivar Empenho Consolidado
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommitmentForm;
