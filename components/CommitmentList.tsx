import React, { useState, useMemo } from 'react';
import { Credit, Commitment, Refund, Cancellation, Filters, UserRole, AuditLog } from '../types';
import FilterBar from './FilterBar';
import CommitmentForm from './CommitmentForm';
import CancellationForm from './CancellationForm';
import { Search, Calendar, PlusCircle, Edit3, Trash2, FileText, TrendingDown, RefreshCcw, Info, X, Landmark, Receipt, UserCircle, History, Clock } from 'lucide-react';

interface CommitmentListProps {
  credits: Credit[];
  commitments: Commitment[];
  refunds: Refund[];
  cancellations: Cancellation[];
  onAdd: (c: Commitment) => void;
  onUpdate: (c: Commitment) => void;
  onDelete: (id: string) => void;
  onAddCancellation: (can: Cancellation) => void;
  userRole: UserRole;
  auditLogs: AuditLog[];
}

const CommitmentList: React.FC<CommitmentListProps> = ({ 
  credits, commitments, refunds, cancellations, 
  onAdd, onUpdate, onDelete, onAddCancellation, userRole, auditLogs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'add' | 'cancel'>('list');
  const [editingItem, setEditingItem] = useState<Commitment | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

  const filteredAndSortedItems = useMemo(() => {
    const safeCommitments = Array.isArray(commitments) ? commitments : [];
    const safeCredits = Array.isArray(credits) ? credits : [];
    const safeCancellations = Array.isArray(cancellations) ? cancellations : [];

    let result = safeCommitments.map(item => {
      const cancelledValue = safeCancellations.filter(can => can.commitmentId === item.id).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      const currentBalance = (Number(item.value) || 0) - cancelledValue;
      const firstCredit = safeCredits.find(c => c.id === item.creditId) || null;
      
      return { ...item, currentBalance, firstCredit };
    }).filter(item => {
      const linkedNC = (credits || []).find(c => c.id === item.creditId)?.nc || '';
      
      const matchSearch = (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.ne.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          linkedNC.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!item.firstCredit && filters.ug) return false;

      const matchUg = !filters.ug || item.firstCredit?.ug === filters.ug;
      const matchPi = !filters.pi || item.firstCredit?.pi === filters.pi;
      const matchNd = !filters.nd || item.firstCredit?.nd === filters.nd;
      const matchSection = !filters.section || item.firstCredit?.section === filters.section;
      
      const isNotZero = item.currentBalance >= 0.01;
      const matchHideZero = !filters.hideZeroBalance || isNotZero;

      return matchSearch && matchUg && matchPi && matchNd && matchSection && matchHideZero;
    });

    result.sort((a, b) => {
      const aIsZero = a.currentBalance < 0.01;
      const bIsZero = b.currentBalance < 0.01;
      
      if (!aIsZero && bIsZero) return -1;
      if (aIsZero && !bIsZero) return 1;

      const sortBy = filters.sortBy || 'date';
      const order = filters.sortOrder === 'asc' ? 1 : -1;

      if (sortBy === 'value') {
        return (Number(a.value) - Number(b.value)) * order;
      }
      if (sortBy === 'date' || (sortBy as string) === 'created_at') {
        return (new Date(a.date).getTime() - new Date(b.date).getTime()) * order;
      }
      return 0;
    });

    return result;
  }, [commitments, credits, searchTerm, filters, cancellations]);

  const selectedDetailItem = useMemo(() => {
    const item = (commitments || []).find(c => c.id === detailItemId);
    if (!item) return null;
    const credit = (credits || []).find(cr => cr.id === item.creditId);
    const relatedLogs = (auditLogs || []).filter(log => log.entityId === item.id);
    
    // Fix: Calculate currentBalance for the detailed view item by subtracting cancellations
    const cancelledValue = (cancellations || []).filter(can => can.commitmentId === item.id).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const currentBalance = (Number(item.value) || 0) - cancelledValue;

    return { ...item, credit, logs: relatedLogs, currentBalance };
  }, [detailItemId, commitments, credits, auditLogs, cancellations]);

  if (activeView === 'add') {
    return (
      <CommitmentForm 
        credits={credits}
        commitments={commitments}
        refunds={refunds}
        cancellations={cancellations}
        onSave={(c) => {
          if (editingItem) onUpdate(c);
          else onAdd(c);
          setActiveView('list');
          setEditingItem(null);
        }}
        onCancel={() => {
          setActiveView('list');
          setEditingItem(null);
        }}
        initialData={editingItem || undefined}
      />
    );
  }

  if (activeView === 'cancel') {
    return (
      <CancellationForm 
        credits={credits}
        commitments={commitments}
        cancellations={cancellations}
        onSave={(can) => {
          onAddCancellation(can);
          setActiveView('list');
        }}
        onCancel={() => setActiveView('list')}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-black font-sans">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {canEdit ? (
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditingItem(null); setActiveView('add'); }} className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"><PlusCircle size={16} /> Novo Empenho</button>
            <button onClick={() => setActiveView('cancel')} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"><RefreshCcw size={16} /> Nova Anulação</button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Modo de Apenas Visualização</span>
          </div>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Pesquisar por NE, NC ou descrição..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-red-500 outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} credits={credits} />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data / NE</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Dotação (NCs Utilizadas)</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Total NE</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo Líquido</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredAndSortedItems.length > 0 ? filteredAndSortedItems.map((item) => {
              const isZero = item.currentBalance < 0.01;
              return (
                <tr key={item.id} className={`transition-colors group ${isZero ? 'bg-slate-50/50 opacity-60 italic' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-4">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">{new Date(item.date).toLocaleDateString('pt-BR')}</div>
                    <div className="font-black text-red-900 text-xs italic flex items-center gap-2">
                      {item.ne}
                      {isZero && <span className="text-[7px] bg-slate-200 text-slate-500 px-1 rounded not-italic tracking-widest font-black uppercase">Liquidado/Anulado</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <div className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        <span className="text-[9px] font-black text-emerald-800 italic block leading-none">{item.firstCredit?.nc || 'Desconhecida'}</span>
                        <span className="text-[8px] font-bold text-slate-500">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-400 text-xs">{formatCurrency(item.value)}</td>
                  <td className={`px-6 py-4 text-right font-black text-xs ${isZero ? 'text-slate-400' : 'text-red-700'}`}>{formatCurrency(item.currentBalance)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 transition-all">
                      <button onClick={() => setDetailItemId(item.id)} className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 rounded-lg transition-all" title="Ver Detalhes"><Info size={14} /></button>
                      {canEdit && (
                        <>
                          <button onClick={() => { setEditingItem(item); setActiveView('add'); }} className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700 rounded-lg transition-all" title="Editar"><Edit3 size={14} /></button>
                          <button onClick={() => onDelete(item.id)} className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700 rounded-lg transition-all" title="Excluir"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest">Nenhum empenho encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes do Empenho - Global Standard */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 text-black">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-red-950 p-8 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-red-600 rounded-2xl shadow-lg shadow-red-500/20"><Receipt size={28} /></div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase leading-none tracking-tight">{selectedDetailItem.ne}</h3>
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mt-2 italic">Dossiê de Execução Orçamentária</p>
                </div>
              </div>
              <button onClick={() => setDetailItemId(null)} className="p-3 hover:bg-red-900 rounded-full transition-colors"><X size={28} /></button>
            </div>

            <div className="p-10 overflow-y-auto space-y-10 font-sans flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-slate-900 p-6 rounded-xl text-white">
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Empenhado</p>
                    <p className="text-2xl font-black italic">{formatCurrency(selectedDetailItem.value)}</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Emissão</p>
                    <p className="text-xl font-black text-slate-900">{new Date(selectedDetailItem.date).toLocaleDateString('pt-BR')}</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 md:col-span-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Líquido</p>
                    <p className={`text-xl font-black ${selectedDetailItem.currentBalance < 0.01 ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>{formatCurrency(selectedDetailItem.currentBalance)}</p>
                 </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 shadow-inner">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
                   <Landmark size={18} className="text-red-600" />
                   <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Classificação</h4>
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nota de Crédito</p>
                      <p className="text-[11px] font-black text-red-900 uppercase italic truncate">{selectedDetailItem.credit?.nc || '-'}</p>
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">PI / ND</p>
                      <p className="text-[11px] font-black text-slate-900 uppercase">{selectedDetailItem.credit?.pi || '-'} / {selectedDetailItem.credit?.nd || '-'}</p>
                   </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                   <FileText size={14} className="text-red-600" /> Descrição
                </h4>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm italic text-slate-700 text-[11px] leading-relaxed">
                   {selectedDetailItem.description || "Sem descrição."}
                </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                    <History size={14} className="text-red-600" /> Auditoria
                 </h4>
                 <div className="space-y-3">
                    {selectedDetailItem.logs && selectedDetailItem.logs.length > 0 ? selectedDetailItem.logs.map(log => (
                      <div key={log.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                         <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400"><Clock size={14} /></div>
                         <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                               <span className="text-[9px] font-black text-slate-900 uppercase tracking-tighter">{log.userName}</span>
                               <span className="text-[8px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 font-medium italic">{log.description}</p>
                         </div>
                      </div>
                    )) : (
                      <p className="p-6 text-center text-[9px] font-black text-slate-400 uppercase">Sem alterações.</p>
                    )}
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
               <button onClick={() => setDetailItemId(null)} className="px-10 py-4 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommitmentList;
