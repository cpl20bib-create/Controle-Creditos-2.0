
import React, { useMemo, useState } from 'react';
import { Credit, Commitment, Refund, Cancellation, Filters, UserRole, SortField } from '../types';
import FilterBar from './FilterBar';
import CreditForm from './CreditForm';
import RefundForm from './RefundForm';
import { Search, PlusCircle, MinusCircle, Edit3, Trash2, Info, X, Landmark, Download, Clock, Info as InfoIcon } from 'lucide-react';

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
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getIndividualNCBalance = (credit: Credit) => {
    const totalSpent = commitments.reduce((acc, com) => {
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

  const filteredAndSortedCredits = useMemo(() => {
    let result = credits.map(c => {
      const balance = getIndividualNCBalance(c);
      const percentage = ((c.valueReceived - balance) / c.valueReceived) * 100;
      const daysLeft = Math.ceil((new Date(c.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return { ...c, balance, percentage, daysLeft };
    }).filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = c.nc.toLowerCase().includes(searchLower) || 
                          c.description.toLowerCase().includes(searchLower) ||
                          c.pi.toLowerCase().includes(searchLower);
      const matchUg = !filters.ug || c.ug === filters.ug;
      const matchPi = !filters.pi || c.pi === filters.pi;
      const matchNd = !filters.nd || c.nd === filters.nd;
      const matchSection = !filters.section || c.section === filters.section;
      const matchHideZero = !filters.hideZeroBalance || c.balance >= 0.01;

      return matchSearch && matchUg && matchPi && matchNd && matchSection && matchHideZero;
    });

    result.sort((a, b) => {
      const aIsZero = a.balance < 0.01;
      const bIsZero = b.balance < 0.01;
      if (!aIsZero && bIsZero) return -1;
      if (aIsZero && !bIsZero) return 1;

      const sortBy = filters.sortBy || 'createdAt';
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'value') return (a.valueReceived - b.valueReceived) * order;
      if (sortBy === 'deadline') return (new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) * order;
      if (sortBy === 'createdAt') return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
      return 0;
    });

    return result;
  }, [credits, searchTerm, filters, commitments, refunds, cancellations]);

  const exportToCSV = () => {
    const headers = ["UG", "Nota de Credito", "Plano Interno", "ND", "Secao", "Valor Recebido", "Saldo Atual", "Vencimento"];
    const rows = filteredAndSortedCredits.map(c => [
      c.ug, c.nc, c.pi, c.nd, c.section, c.valueReceived.toFixed(2), c.balance.toFixed(2), c.deadline
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "creditos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (showCreditForm) {
    return (
      <CreditForm 
        onSave={(c) => { if (editingCredit) onUpdateCredit(c); else onAddCredit(c); setShowCreditForm(false); setEditingCredit(null); }} 
        existingCredits={credits} 
        onCancel={() => { setShowCreditForm(false); setEditingCredit(null); }} 
        initialData={editingCredit || undefined} 
      />
    );
  }

  if (showRefundForm) {
    return (
      <RefundForm 
        credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} 
        onSave={(r) => { onAddRefund(r); setShowRefundForm(false); }} 
        onCancel={() => setShowRefundForm(false)} 
      />
    );
  }

  const selectedDetailCredit = credits.find(c => c.id === detailCreditId);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-black">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <>
              <button onClick={() => { setEditingCredit(null); setShowCreditForm(true); }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all tracking-widest"><PlusCircle size={16} /> Novo Crédito</button>
              <button onClick={() => setShowRefundForm(true)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all tracking-widest"><MinusCircle size={16} /> Novo Recolhimento</button>
            </>
          )}
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm transition-all tracking-widest"><Download size={16} /> Exportar Excel</button>
        </div>
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
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nota de Crédito / PI / ND</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Original</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Execução</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo Atual</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredAndSortedCredits.map((credit) => (
              <tr key={credit.id} className={`transition-colors group ${credit.balance < 0.01 ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50'}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-10 rounded-full ${credit.balance < 0.01 ? 'bg-slate-300' : credit.daysLeft < 15 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                    <div>
                      <div className="font-black text-xs italic text-emerald-800 flex items-center gap-2">
                        {credit.nc}
                        {credit.balance >= 0.01 && credit.daysLeft <= 15 && <Clock size={12} className="text-amber-500 animate-pulse" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest bg-slate-50 text-slate-600">ND {credit.nd}</span>
                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">PI: {credit.pi}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-xs font-bold text-slate-400">{formatCurrency(credit.valueReceived)}</td>
                <td className="px-6 py-4 min-w-[140px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                      <span>{credit.percentage.toFixed(0)}%</span>
                      <span>{formatCurrency(credit.valueReceived - credit.balance)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className={`h-full transition-all duration-1000 ${credit.balance < 0.01 ? 'bg-slate-400' : credit.percentage > 90 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, credit.percentage)}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className={`px-6 py-4 text-right text-xs font-black ${credit.balance < 0.01 ? 'text-slate-400' : 'text-emerald-600'}`}>{formatCurrency(credit.balance)}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 transition-all">
                    <button onClick={() => setDetailCreditId(credit.id)} className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 rounded-lg transition-all"><InfoIcon size={14} /></button>
                    {canEdit && (
                      <>
                        <button onClick={() => { setEditingCredit(credit); setShowCreditForm(true); }} className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 rounded-lg transition-all"><Edit3 size={14} /></button>
                        <button onClick={() => onDeleteCredit(credit.id)} className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDetailCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-emerald-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20"><Landmark size={24} /></div>
                <div>
                  <h3 className="text-xl font-black italic uppercase leading-none tracking-tight">{selectedDetailCredit.nc}</h3>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Extrato Individual</p>
                </div>
              </div>
              <button onClick={() => setDetailCreditId(null)} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Descrição Completa</p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{selectedDetailCredit.description}"</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-900 text-white rounded-2xl">
                  <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Valor Original</p>
                  <p className="text-xl font-black">{formatCurrency(selectedDetailCredit.valueReceived)}</p>
                </div>
                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Saldo Livre</p>
                  <p className="text-xl font-black text-emerald-800">{formatCurrency(getIndividualNCBalance(selectedDetailCredit))}</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setDetailCreditId(null)} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditList;
