
import React, { useState, useMemo } from 'react';
import { Credit, Commitment, Refund, Cancellation, Filters, UserRole, AuditLog } from '../types';
import FilterBar from './FilterBar';
import CommitmentForm from './CommitmentForm';
import CancellationForm from './CancellationForm';
import { Search, Calendar, PlusCircle, Edit3, Trash2, FileText, TrendingDown, RefreshCcw, Info, X, Landmark, Receipt, UserCircle, History, Clock, Tag, ClipboardList } from 'lucide-react';

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
  const [detailCreditId, setDetailCreditId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

  // Agrupamento por NE para suportar visualização de múltiplas NCs por empenho
  const groupedCommitments = useMemo(() => {
    const safeCommitments = Array.isArray(commitments) ? commitments : [];
    const groups: Record<string, any> = {};

    safeCommitments.forEach(item => {
      if (!groups[item.ne]) {
        groups[item.ne] = {
          ne: item.ne,
          date: item.date,
          description: item.description,
          totalValue: 0,
          ids: [],
          allocations: []
        };
      }
      groups[item.ne].totalValue += (Number(item.value) || 0);
      groups[item.ne].ids.push(item.id);
      
      const credit = (credits || []).find(c => c.id === item.creditId);
      groups[item.ne].allocations.push({
        id: item.id,
        creditId: item.creditId,
        nc: credit?.nc || '---',
        value: Number(item.value) || 0,
        pi: credit?.pi || '---'
      });
    });

    return Object.values(groups);
  }, [commitments, credits]);

  const filteredAndSortedItems = useMemo(() => {
    const safeCredits = Array.isArray(credits) ? credits : [];
    const safeCancellations = Array.isArray(cancellations) ? cancellations : [];

    let result = groupedCommitments.map(group => {
      // Cálculo de anulação total para a NE
      const cancelledValue = safeCancellations
        .filter(can => group.ids.includes(can.commitmentId))
        .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      
      const currentBalance = group.totalValue - cancelledValue;
      
      // Pegamos o primeiro crédito para filtros básicos
      const firstAllocation = group.allocations[0];
      const firstCredit = safeCredits.find(c => c.id === firstAllocation?.creditId) || null;
      
      return { ...group, currentBalance, firstCredit };
    }).filter(group => {
      const matchSearch = (group.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          group.ne.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          group.allocations.some((a: any) => a.nc.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!group.firstCredit && filters.ug) return false;

      const matchUg = !filters.ug || group.firstCredit?.ug === filters.ug;
      const matchPi = !filters.pi || group.firstCredit?.pi === filters.pi;
      const matchNd = !filters.nd || group.firstCredit?.nd === filters.nd;
      const matchSection = !filters.section || group.firstCredit?.section === filters.section;
      
      const isNotZero = group.currentBalance >= 0.01;
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
        return (a.totalValue - b.totalValue) * order;
      }
      if (sortBy === 'date' || (sortBy as string) === 'created_at') {
        return (new Date(a.date).getTime() - new Date(b.date).getTime()) * order;
      }
      return 0;
    });

    return result;
  }, [groupedCommitments, credits, searchTerm, filters, cancellations]);

  const selectedDetailItem = useMemo(() => {
    // Para o detalhe, buscamos pelo primeiro ID do grupo se o ID clicado for um NE
    const group = groupedCommitments.find(g => g.ids.includes(detailItemId) || g.ne === detailItemId);
    if (!group) return null;
    
    const firstId = group.ids[0];
    const item = commitments.find(c => c.id === firstId);
    if (!item) return null;

    const credit = (credits || []).find(cr => cr.id === item.creditId);
    const relatedLogs = (auditLogs || []).filter(log => group.ids.includes(log.entityId));
    
    const cancelledValue = (cancellations || []).filter(can => group.ids.includes(can.commitmentId)).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const currentBalance = group.totalValue - cancelledValue;

    return { ...item, ...group, credit, logs: relatedLogs, currentBalance };
  }, [detailItemId, groupedCommitments, commitments, credits, auditLogs, cancellations]);

  // Modal de Detalhes da NC (Reutilizado)
  const selectedDetailCredit = useMemo(() => {
    const credit = (credits || []).find(c => c.id === detailCreditId);
    if (!credit) return null;

    const totalSpent = (commitments || []).reduce((acc, com) => acc + (com.creditId === credit.id ? Number(com.value) || 0 : 0), 0);
    const totalRefunded = (refunds || []).filter(ref => ref.creditId === credit.id).reduce((a, b) => a + (Number(b.value) || 0), 0);
    const totalCancelled = (cancellations || []).reduce((acc, can) => {
      const com = (commitments || []).find(c => c.id === can.commitmentId);
      return (com && com.creditId === credit.id) ? acc + (Number(can.value) || 0) : acc;
    }, 0);

    const balanceValue = (Number(credit.valueReceived) || 0) - totalSpent - totalRefunded + totalCancelled;
    
    const relatedRefunds = (refunds || []).filter(r => r.creditId === credit.id);
    const relatedCommitments = (commitments || []).filter(com => com.creditId === credit.id);

    return { ...credit, balanceValue, relatedRefunds, relatedCommitments };
  }, [detailCreditId, credits, commitments, refunds, cancellations]);

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
            {filteredAndSortedItems.length > 0 ? filteredAndSortedItems.map((group) => {
              const isZero = group.currentBalance < 0.01;
              return (
                <tr key={group.ne} className={`transition-colors group ${isZero ? 'bg-slate-50/50 opacity-60 italic' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-4">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">{new Date(group.date).toLocaleDateString('pt-BR')}</div>
                    <div className="font-black text-red-900 text-xs italic flex items-center gap-2">
                      {group.ne}
                      {isZero && <span className="text-[7px] bg-slate-200 text-slate-500 px-1 rounded not-italic tracking-widest font-black uppercase">Liquidado/Anulado</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {group.allocations.map((alloc: any) => (
                        <button 
                          key={alloc.id}
                          onClick={() => setDetailCreditId(alloc.creditId)}
                          className="bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-100 flex flex-col items-start transition-all hover:scale-105 active:scale-95 group/nc"
                        >
                          <span className="text-[9px] font-black text-emerald-800 italic flex items-center gap-1 group-hover/nc:text-emerald-600">
                             <Tag size={10} /> {alloc.nc}
                          </span>
                          <span className="text-[8px] font-bold text-slate-500">{formatCurrency(alloc.value)}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-400 text-xs">{formatCurrency(group.totalValue)}</td>
                  <td className={`px-6 py-4 text-right font-black text-xs ${isZero ? 'text-slate-400' : 'text-red-700'}`}>{formatCurrency(group.currentBalance)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 transition-all">
                      <button onClick={() => setDetailItemId(group.ne)} className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 rounded-lg transition-all" title="Ver Detalhes"><Info size={14} /></button>
                      {canEdit && (
                        <>
                          <button onClick={() => { 
                            const item = commitments.find(c => c.id === group.ids[0]);
                            if (item) { setEditingItem(item); setActiveView('add'); }
                          }} className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700 rounded-lg transition-all" title="Editar"><Edit3 size={14} /></button>
                          <button onClick={() => group.ids.forEach((id: string) => onDelete(id))} className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700 rounded-lg transition-all" title="Excluir Grupo"><Trash2 size={14} /></button>
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

      {/* Modal de Detalhes da NC (Aberto via cliques na listagem de empenhos) */}
      {selectedDetailCredit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300 text-black">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-emerald-950 p-8 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20"><Landmark size={28} /></div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase leading-none tracking-tight">{selectedDetailCredit.nc}</h3>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-2 italic">Dossiê de Crédito (Consulta Rápida)</p>
                </div>
              </div>
              <button onClick={() => setDetailCreditId(null)} className="p-3 hover:bg-emerald-900 rounded-full transition-colors"><X size={28} /></button>
            </div>

            <div className="p-10 overflow-y-auto space-y-10 font-sans flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Órgão / Seção</p>
                    <p className="text-xs font-black text-slate-900 uppercase truncate">{selectedDetailCredit.organ}</p>
                    <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase italic">{selectedDetailCredit.section}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">PI</p>
                       <p className="text-xs font-black text-slate-900 uppercase">{selectedDetailCredit.pi}</p>
                    </div>
                    <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">ND</p>
                       <p className="text-xs font-black text-slate-900 uppercase">{selectedDetailCredit.nd}</p>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-6">
                 <div className="flex justify-between items-center">
                    <div>
                       <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Valor Recebido</p>
                       <p className="text-xl font-black italic">{formatCurrency(selectedDetailCredit.valueReceived)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Saldo Livre</p>
                       <p className="text-2xl font-black text-emerald-500 italic leading-none">{formatCurrency(selectedDetailCredit.balanceValue)}</p>
                    </div>
                 </div>
                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, (1 - selectedDetailCredit.balanceValue / (selectedDetailCredit.valueReceived || 1)) * 100)}%` }}></div>
                 </div>
              </div>

              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                    <ClipboardList size={14} className="text-emerald-600" /> Descrição Técnica
                 </h4>
                 <p className="text-[11px] font-medium text-slate-600 italic leading-relaxed bg-slate-50 p-6 rounded-2xl">
                    {selectedDetailCredit.description || "Sem descrição informada."}
                 </p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
               <button onClick={() => setDetailCreditId(null)} className="px-10 py-4 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}

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
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Empenhado Bruto</p>
                    <p className="text-2xl font-black italic">{formatCurrency(selectedDetailItem.totalValue)}</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Emissão</p>
                    <p className="text-xl font-black text-slate-900">{new Date(selectedDetailItem.date).toLocaleDateString('pt-BR')}</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 md:col-span-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Líquido Remanescente</p>
                    <p className={`text-xl font-black ${selectedDetailItem.currentBalance < 0.01 ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>{formatCurrency(selectedDetailItem.currentBalance)}</p>
                 </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 shadow-inner">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
                   <Landmark size={18} className="text-red-600" />
                   <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Distribuição por Dotação</h4>
                </div>
                <div className="space-y-4">
                   {selectedDetailItem.allocations.map((alloc: any) => (
                     <div key={alloc.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 hover:border-emerald-500 transition-all cursor-pointer group/item" onClick={() => setDetailCreditId(alloc.creditId)}>
                        <div>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nota de Crédito</p>
                           <p className="text-[11px] font-black text-emerald-900 uppercase italic group-hover/item:text-emerald-600 transition-colors flex items-center gap-2">
                              <Tag size={12} /> {alloc.nc}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Alocado</p>
                           <p className="text-[11px] font-black text-slate-900">{formatCurrency(alloc.value)}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                   <FileText size={14} className="text-red-600" /> Descrição do Objeto
                </h4>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm italic text-slate-700 text-[11px] leading-relaxed">
                   {selectedDetailItem.description || "Sem descrição informada."}
                </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                    <History size={14} className="text-red-600" /> Registro de Alterações
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
                      <p className="p-6 text-center text-[9px] font-black text-slate-400 uppercase">Sem alterações registradas no log.</p>
                    )}
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
               <button onClick={() => setDetailItemId(null)} className="px-10 py-4 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg active:scale-95">Fechar Dossiê</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommitmentList;
