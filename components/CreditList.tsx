
import React, { useMemo, useState } from 'react';
import { Credit, Commitment, Refund, Cancellation, Filters, UserRole, SortField } from '../types';
import FilterBar from './FilterBar';
import CreditForm from './CreditForm';
import RefundForm from './RefundForm';
import { Search, Calendar, PlusCircle, MinusCircle, Edit3, Trash2, Info, X, Landmark, Receipt, ArrowRightLeft, TrendingDown, History, Info as InfoIcon, AlertCircle, Clock } from 'lucide-react';

interface CreditListProps {
  credits: Credit[];
  commitments: Commitment[];
  refunds: Refund[];
  cancellations: Cancellation[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  onAddCredit: (c: Credit) => void;
  onUpdateCredit: (c: Credit) => void;
  onDeleteCredit: (id: string) => void;
  onAddRefund: (r: Refund) => void;
  userRole: UserRole;
}

const CreditList: React.FC<CreditListProps> = ({ 
  credits, commitments, refunds, cancellations, filters, setFilters, 
  onAddCredit, onUpdateCredit, onDeleteCredit, onAddRefund, userRole 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [detailCreditId, setDetailCreditId] = useState<string | null>(null);

  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

  const getIndividualNCBalance = (credit: Credit) => {
    const totalSpent = commitments.reduce((acc, com) => {
      const alloc = com.allocations?.find(a => a.creditId === credit.id);
      return acc + (alloc ? Number(alloc.value) || 0 : 0);
    }, 0);

    const totalRefunded = refunds.filter(ref => ref.creditId === credit.id).reduce((a, b) => a + (Number(b.value) || 0), 0);
    
    const totalCancelled = cancellations.reduce((acc, can) => {
      const com = commitments.find(c => c.id === can.commitmentId);
      if (!com || !Number(com.value)) return acc;
      
      const alloc = com.allocations?.find(a => a.creditId === credit.id);
      if (!alloc) return acc;

      const totalComValue = Number(com.value) || 1;
      const allocValue = Number(alloc.value) || 0;
      const proportion = allocValue / totalComValue;
      return acc + ((Number(can.value) || 0) * proportion);
    }, 0);

    return (Number(credit.valueReceived) || 0) - totalSpent - totalRefunded + totalCancelled;
  };

  const getExecutionInfo = (credit: Credit) => {
    const balance = getIndividualNCBalance(credit);
    const spent = (Number(credit.valueReceived) || 0) - balance;
    const total = Number(credit.valueReceived) || 1;
    const percentage = (spent / total) * 100;
    const daysLeft = Math.ceil((new Date(credit.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    return { percentage, daysLeft, balance };
  };

  const filteredAndSortedCredits = useMemo(() => {
    const safeCredits = Array.isArray(credits) ? credits : [];
    
    let result = safeCredits.map(c => ({
      ...c,
      info: getExecutionInfo(c)
    })).filter(c => {
      const matchSearch = c.nc.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.pi.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUg = !filters.ug || c.ug === filters.ug;
      const matchPi = !filters.pi || c.pi === filters.pi;
      const matchNd = !filters.nd || c.nd === filters.nd;
      const matchSection = !filters.section || c.section === filters.section;
      
      const isNotZero = c.info.balance >= 0.01;
      const matchHideZero = !filters.hideZeroBalance || isNotZero;

      return matchSearch && matchUg && matchPi && matchNd && matchSection && matchHideZero;
    });

    result.sort((a, b) => {
      const aHasBalance = a.info.balance >= 0.01;
      const bHasBalance = b.info.balance >= 0.01;
      
      if (aHasBalance && !bHasBalance) return -1;
      if (!aHasBalance && bHasBalance) return 1;

      const sortBy = filters.sortBy || 'created_at';
      const order = filters.sortOrder === 'asc' ? 1 : -1;

      if (sortBy === 'valueReceived') {
        return (Number(a.valueReceived) - Number(b.valueReceived)) * order;
      }
      if (sortBy === 'deadline') {
        return (new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) * order;
      }
      if (sortBy === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * order;
      }
      return 0;
    });

    return result;
  }, [credits, searchTerm, filters, commitments, refunds, cancellations]);

  const handleEdit = (credit: Credit) => {
    if (!canEdit) return;
    setEditingCredit(credit);
    setShowCreditForm(true);
  };

  if (showCreditForm) {
    return (
      <CreditForm onSave={(c) => { if (editingCredit) onUpdateCredit(c); else onAddCredit(c); setShowCreditForm(false); setEditingCredit(null); }} existingCredits={credits} onCancel={() => { setShowCreditForm(false); setEditingCredit(null); }} initialData={editingCredit || undefined} />
    );
  }

  if (showRefundForm) {
    return (
      <RefundForm credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} onSave={(r) => { onAddRefund(r); setShowRefundForm(false); }} onCancel={() => setShowRefundForm(false)} />
    );
  }

  const selectedDetailCredit = Array.isArray(credits) ? credits.find(c => c.id === detailCreditId) : null;
  const creditRefunds = selectedDetailCredit ? refunds.filter(r => r.creditId === selectedDetailCredit.id) : [];
  
  const creditAllocations = selectedDetailCredit ? (commitments || []).flatMap(com => {
    const alloc = com.allocations?.find(a => a.creditId === selectedDetailCredit.id);
    return alloc ? [{ ne: com.ne, value: alloc.value, date: com.date, id: com.id }] : [];
  }) : [];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 relative text-black font-sans">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {canEdit ? (
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditingCredit(null); setShowCreditForm(true); }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all tracking-widest"><PlusCircle size={16} /> Novo Crédito</button>
            <button onClick={() => setShowRefundForm(true)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all tracking-widest"><MinusCircle size={16} /> Novo Recolhimento</button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Modo de Apenas Visualização</span>
          </div>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Pesquisar..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} credits={credits} />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status / Nota de Crédito</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Original</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Execução</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo da NC</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredAndSortedCredits.map((credit) => {
              const info = credit.info;
              const isZero = info.balance < 0.01;
              return (
                <tr key={credit.id} className={`transition-colors group ${isZero ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-10 rounded-full ${isZero ? 'bg-slate-300' : info.daysLeft < 0 ? 'bg-red-500' : info.daysLeft < 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                      <div>
                        <div className={`font-black text-xs italic flex items-center gap-2 ${isZero ? 'text-slate-400' : 'text-emerald-800'}`}>
                          {credit.nc}
                          {!isZero && info.daysLeft <= 15 && info.daysLeft >= 0 && <Clock size={12} className="text-amber-500 animate-pulse" />}
                          {!isZero && info.daysLeft < 0 && <AlertCircle size={12} className="text-red-500" />}
                          {isZero && <span className="text-[7px] bg-slate-200 text-slate-500 px-1 rounded not-italic tracking-widest font-black uppercase">Liquidado</span>}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Vence em: {new Date(credit.deadline).toLocaleDateString('pt-BR')} ({info.daysLeft} d)</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-bold text-slate-400">{formatCurrency(credit.valueReceived)}</td>
                  <td className="px-6 py-4 min-w-[140px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                        <span>{(info.percentage || 0).toFixed(0)}%</span>
                        <span>{formatCurrency((Number(credit.valueReceived) || 0) - info.balance)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div className={`h-full transition-all duration-1000 ${isZero ? 'bg-slate-400' : info.percentage > 95 ? 'bg-red-500' : info.percentage > 70 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, info.percentage)}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right text-xs font-black ${isZero ? 'text-slate-400' : 'text-emerald-600'}`}>{formatCurrency(info.balance)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 transition-all">
                      <button onClick={() => setDetailCreditId(credit.id)} className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 rounded-lg transition-all" title="Detalhes"><InfoIcon size={14} /></button>
                      {canEdit && (
                        <>
                          <button onClick={() => handleEdit(credit)} className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 rounded-lg transition-all" title="Editar"><Edit3 size={14} /></button>
                          <button onClick={() => onDeleteCredit(credit.id)} className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700 rounded-lg transition-all" title="Excluir"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedDetailCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 text-black">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-emerald-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20"><Landmark size={24} /></div>
                <div>
                  <h3 className="text-xl font-black italic uppercase leading-none tracking-tight">{selectedDetailCredit.nc}</h3>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Extrato de Movimentação Individual</p>
                </div>
              </div>
              <button onClick={() => setDetailCreditId(null)} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
                  <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Valor Original</p>
                  <p className="text-2xl font-black">{formatCurrency(Number(selectedDetailCredit.valueReceived) || 0)}</p>
                </div>
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                  <p className="text-[9px] font-black text-red-600 uppercase mb-1">Consumido por Empenhos</p>
                  <p className="text-2xl font-black text-red-800">{formatCurrency((Number(selectedDetailCredit.valueReceived) || 0) - getIndividualNCBalance(selectedDetailCredit))}</p>
                </div>
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Saldo Livre Atual</p>
                  <p className="text-2xl font-black text-emerald-800">{formatCurrency(getIndividualNCBalance(selectedDetailCredit))}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2"><History size={14} className="text-emerald-600" /> Histórico de Alocações</h4>
                <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                   <div className="relative flex items-center gap-4">
                      <div className="absolute -left-8 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow-sm"></div>
                      <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase text-slate-500">Aporte de Crédito</span>
                         <span className="text-xs font-black text-emerald-700">+{formatCurrency(Number(selectedDetailCredit.valueReceived) || 0)}</span>
                      </div>
                   </div>
                   
                   {creditAllocations.map(alloc => (
                     <div key={alloc.id} className="relative flex items-center gap-4">
                        <div className="absolute -left-8 w-6 h-6 rounded-full bg-red-400 border-4 border-white shadow-sm"></div>
                        <div className="flex-1 bg-white p-3 rounded-xl border border-red-50 flex justify-between items-center">
                           <div>
                             <span className="text-[10px] font-black uppercase text-red-900 italic">NE {alloc.ne} (Fatia Alocada)</span>
                             <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">{new Date(alloc.date).toLocaleDateString('pt-BR')}</p>
                           </div>
                           <span className="text-xs font-black text-red-600">-{formatCurrency(alloc.value)}</span>
                        </div>
                     </div>
                   ))}

                   {creditRefunds.map(ref => (
                     <div key={ref.id} className="relative flex items-center gap-4">
                        <div className="absolute -left-8 w-6 h-6 rounded-full bg-amber-400 border-4 border-white shadow-sm"></div>
                        <div className="flex-1 bg-amber-50 p-3 rounded-xl border border-amber-100 flex justify-between items-center">
                           <div>
                             <span className="text-[10px] font-black uppercase text-amber-800 italic">Recolhimento efetuado</span>
                             <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">{new Date(ref.date).toLocaleDateString('pt-BR')}</p>
                           </div>
                           <span className="text-xs font-black text-amber-600">-{formatCurrency(ref.value)}</span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
               <button onClick={() => setDetailCreditId(null)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Fechar Extrato</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditList;
