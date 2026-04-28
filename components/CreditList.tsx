
import React, { useMemo, useState } from 'react';
import { Credit, Commitment, Refund, Cancellation, Filters, UserRole, AuditLog } from '../types';
import FilterBar from './FilterBar';
import CreditForm from './CreditForm';
import RefundForm from './RefundForm';
// Added History to the lucide-react imports to avoid conflict with global History interface
import { Search, Calendar, PlusCircle, MinusCircle, Edit3, Trash2, Info, X, Landmark, Info as InfoIcon, AlertCircle, Clock, Building2, UserCircle, Layout, Tag, ClipboardList, History } from 'lucide-react';
import { formatDateBR, parseLocalDate } from '../utils/dateUtils';

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
  auditLogs: AuditLog[];
}

const CreditList: React.FC<CreditListProps> = ({ 
  credits, commitments, refunds, cancellations, filters, setFilters, 
  onAddCredit, onUpdateCredit, onDeleteCredit, onAddRefund, userRole, auditLogs
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
    const totalSpent = (commitments || []).reduce((acc, com) => {
      return acc + (com.creditId === credit.id ? Number(com.value) || 0 : 0);
    }, 0);

    const totalRefunded = (refunds || []).filter(ref => ref.creditId === credit.id).reduce((a, b) => a + (Number(b.value) || 0), 0);
    
    const totalCancelled = (cancellations || []).reduce((acc, can) => {
      const com = (commitments || []).find(c => c.id === can.commitmentId);
      if (!com || !Number(com.value) || com.creditId !== credit.id) return acc;
      
      return acc + (Number(can.value) || 0);
    }, 0);

    return (Number(credit.valueReceived) || 0) - totalSpent - totalRefunded + totalCancelled;
  };

  const getExecutionInfo = (credit: Credit) => {
    const balance = getIndividualNCBalance(credit);
    const spent = (Number(credit.valueReceived) || 0) - balance;
    const total = Number(credit.valueReceived) || 1;
    const percentage = (spent / total) * 100;
    const daysLeft = Math.ceil((parseLocalDate(credit.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    return { percentage, daysLeft, balance };
  };

  const handleSort = (field: any) => {
    const isSameField = filters.sortBy === field;
    const newOrder = isSameField && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters({ ...filters, sortBy: field, sortOrder: newOrder });
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
        return (parseLocalDate(a.deadline).getTime() - parseLocalDate(b.deadline).getTime()) * order;
      }
      if (sortBy === 'created_at') {
        return (parseLocalDate(a.created_at).getTime() - parseLocalDate(b.created_at).getTime()) * order;
      }
      if (sortBy === 'nc') {
        return a.nc.localeCompare(b.nc) * order;
      }
      if (sortBy === 'balance') {
        return (a.info.balance - b.info.balance) * order;
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
  const creditRefunds = selectedDetailCredit ? (refunds || []).filter(r => r.creditId === selectedDetailCredit.id) : [];
  
  const creditAllocations = selectedDetailCredit ? (commitments || []).flatMap(com => {
    return com.creditId === selectedDetailCredit.id ? [{ ne: com.ne, value: com.value, date: com.date, id: com.id }] : [];
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
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th 
                className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-emerald-600 transition-colors"
                onClick={() => handleSort('nc')}
              >
                <div className="flex items-center gap-1">
                  Status / Nota de Crédito
                  {filters.sortBy === 'nc' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Original</th>
              <th 
                className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-emerald-600 transition-colors"
                onClick={() => handleSort('deadline')}
              >
                <div className="flex items-center gap-1">
                  Execução / Prazo
                  {filters.sortBy === 'deadline' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-emerald-600 transition-colors text-right"
                onClick={() => handleSort('balance')}
              >
                <div className="flex items-center justify-end gap-1">
                  Saldo da NC
                  {filters.sortBy === 'balance' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
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
                          <span className="bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded not-italic font-black uppercase tracking-tighter w-fit">UG {credit.ug}</span>
                          {credit.nc}
                          {!isZero && info.daysLeft <= 15 && info.daysLeft >= 0 && <Clock size={12} className="text-amber-500 animate-pulse" />}
                          {!isZero && info.daysLeft < 0 && <AlertCircle size={12} className="text-red-500" />}
                          {isZero && <span className="text-[7px] bg-slate-200 text-slate-500 px-1 rounded not-italic tracking-widest font-black uppercase">Liquidado</span>}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic flex items-center gap-1">
                           <span>PI: {credit.pi}</span>
                           <span className="opacity-30">|</span>
                           <span>ND: {credit.nd}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-medium text-slate-600 line-clamp-2 max-w-[200px]" title={credit.description}>
                      {credit.description || <span className="text-slate-300 italic">Sem descrição</span>}
                    </p>
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
      </div>

      {/* Modal de Detalhes do Crédito - Global Standard */}
      {selectedDetailCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 text-black">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-emerald-950 p-6 md:p-8 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="p-3 md:p-4 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20"><Landmark size={22} className="md:w-7 md:h-7" /></div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black italic uppercase leading-none tracking-tight">{selectedDetailCredit.nc}</h3>
                  <p className="text-emerald-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-1 md:mt-2 italic">Dossiê Orçamentário</p>
                </div>
              </div>
              <button onClick={() => setDetailCreditId(null)} className="p-2 md:p-3 hover:bg-emerald-900 rounded-full transition-colors"><X size={24} className="md:w-7 md:h-7" /></button>
            </div>

            <div className="p-6 md:p-10 overflow-y-auto space-y-8 md:space-y-10 font-sans flex-1 custom-scrollbar">
              {/* Seção 1: Identificação e Órgão */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-3 md:gap-4 p-4 md:p-5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600 shrink-0"><Building2 size={18} className="md:w-5 md:h-5" /></div>
                    <div className="min-w-0">
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Órgão Descentralizador</p>
                      <p className="text-[10px] md:text-xs font-black text-slate-900 uppercase truncate">{selectedDetailCredit.organ}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:gap-4 p-4 md:p-5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600 shrink-0"><Layout size={18} className="md:w-5 md:h-5" /></div>
                    <div className="min-w-0">
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Seção Interessada</p>
                      <p className="text-[10px] md:text-xs font-black text-slate-900 uppercase italic truncate">{selectedDetailCredit.section}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-4 md:p-5 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Calendar size={10} className="text-emerald-500" /> Cadastro
                    </p>
                    <p className="text-[10px] md:text-xs font-black text-slate-900">{formatDateBR(selectedDetailCredit.created_at)}</p>
                  </div>
                  <div className="p-4 md:p-5 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[8px] md:text-[9px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Clock size={10} className="text-red-500" /> Prazo Final
                    </p>
                    <p className="text-[10px] md:text-xs font-black text-slate-900">{formatDateBR(selectedDetailCredit.deadline)}</p>
                  </div>
                  <div className="col-span-2 p-4 md:p-5 bg-slate-900 rounded-xl text-white shadow-xl">
                    <p className="text-[8px] md:text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 md:mb-2 text-center md:text-left">Montante Total do Aporte</p>
                    <p className="text-lg md:text-2xl font-black italic text-center md:text-left">{formatCurrency(selectedDetailCredit.valueReceived)}</p>
                  </div>
                </div>
              </div>

              {/* Seção 2: Classificação Técnica */}
              <div className="bg-slate-950 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                 <div className="flex items-center gap-3 mb-6 md:mb-8 border-b border-slate-800 pb-4">
                    <Tag size={18} className="text-emerald-500" />
                    <h4 className="text-[9px] md:text-[11px] font-black text-white uppercase tracking-widest md:tracking-[0.2em]">Classificação Orçamentária</h4>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                    <div className="space-y-1">
                       <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">FONTE</p>
                       <p className="text-[10px] md:text-xs font-black text-white font-mono tracking-widest">{selectedDetailCredit.fonte || '----------'}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">PTRES</p>
                       <p className="text-[10px] md:text-xs font-black text-white font-mono tracking-widest">{selectedDetailCredit.ptres || '------'}</p>
                    </div>
                    <div className="space-y-1 text-center hidden md:block">
                       <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">ESFERA</p>
                       <p className="text-[10px] md:text-xs font-black text-white font-mono">{selectedDetailCredit.esfera || '-'}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">UGR</p>
                       <p className="text-[10px] md:text-xs font-black text-white font-mono tracking-tighter sm:tracking-widest">{selectedDetailCredit.ugr || '------'}</p>
                    </div>
                 </div>
                 <div className="mt-6 md:mt-8 grid grid-cols-2 gap-4 md:gap-8 border-t border-slate-800 pt-6">
                    <div className="space-y-1">
                       <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">PI</p>
                       <p className="text-[10px] md:text-xs font-black text-emerald-500 uppercase italic truncate">{selectedDetailCredit.pi}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">Natureza</p>
                       <p className="text-[10px] md:text-xs font-black text-emerald-500 uppercase italic truncate">{selectedDetailCredit.nd}</p>
                    </div>
                 </div>
              </div>

              {/* Seção 3: Descrição */}
              <div className="space-y-3 md:space-y-4">
                 <h4 className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                   <ClipboardList size={14} className="text-emerald-600" /> Descrição Técnica
                 </h4>
                 <div className="bg-emerald-50/30 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-emerald-100/50 shadow-inner overflow-y-auto max-h-40">
                   <p className="text-[10px] md:text-[11px] font-medium text-slate-700 leading-relaxed italic border-l-4 border-emerald-500/30 pl-4 md:pl-8">
                     {selectedDetailCredit.description || "Nenhuma descrição técnica informada."}
                   </p>
                 </div>
              </div>

              {/* Seção 4: Histórico */}
              <div className="space-y-4">
                <h4 className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                   <History size={14} className="text-emerald-600" /> Histórico
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                   <div className="space-y-3">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Empenhos</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {creditAllocations.length > 0 ? creditAllocations.map(alloc => (
                          <div key={alloc.id} className="flex justify-between items-center bg-white p-3 md:p-4 rounded-xl border border-red-50 shadow-sm transition-all">
                             <div>
                               <span className="text-[9px] md:text-[10px] font-black text-red-900 uppercase italic">NE {alloc.ne}</span>
                               <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase mt-0.5">{formatDateBR(alloc.date)}</p>
                             </div>
                             <span className="text-[10px] md:text-sm font-black text-red-600 truncate ml-2">-{formatCurrency(alloc.value)}</span>
                          </div>
                        )) : <p className="text-[8px] md:text-[9px] text-slate-300 italic px-2">Nenhum empenho.</p>}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Recolhimentos</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {creditRefunds.length > 0 ? creditRefunds.map(ref => (
                          <div key={ref.id} className="flex justify-between items-center bg-white p-3 md:p-4 rounded-xl border border-amber-50 shadow-sm transition-all">
                             <div>
                               <span className="text-[9px] md:text-[10px] font-black text-amber-800 uppercase italic">Recolhimento</span>
                               <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase mt-0.5">{formatDateBR(ref.date)}</p>
                             </div>
                             <span className="text-[10px] md:text-sm font-black text-amber-600 truncate ml-2">-{formatCurrency(ref.value)}</span>
                          </div>
                        )) : <p className="text-[8px] md:text-[9px] text-slate-300 italic px-2">Nenhum recolhimento.</p>}
                      </div>
                   </div>
                </div>
              </div>
            </div>
            
            {/* Rodapé Fixo */}
            <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
               <div className="flex flex-col items-center sm:items-start">
                  <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Livre</span>
                  <span className="text-xl md:text-2xl font-black text-emerald-600 italic leading-none">{formatCurrency(getIndividualNCBalance(selectedDetailCredit))}</span>
               </div>
               <button onClick={() => setDetailCreditId(null)} className="w-full sm:w-auto px-10 py-4 md:px-12 md:py-5 bg-slate-950 text-white rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-900/20 active:scale-95">Fechar Dossiê</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditList;
