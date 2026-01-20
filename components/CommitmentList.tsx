
import React, { useState, useMemo } from 'react';
import { Credit, Commitment, Refund, Cancellation, Filters, UserRole } from '../types';
import FilterBar from './FilterBar';
import CommitmentForm from './CommitmentForm';
import CancellationForm from './CancellationForm';
import { Search, Calendar, PlusCircle, Edit3, Trash2, FileText, TrendingDown, RefreshCcw, Info } from 'lucide-react';

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
}

const CommitmentList: React.FC<CommitmentListProps> = ({ 
  credits, commitments, refunds, cancellations, 
  onAdd, onUpdate, onDelete, onAddCancellation, userRole 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'add' | 'cancel'>('list');
  const [editingItem, setEditingItem] = useState<Commitment | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filteredItems = useMemo(() => {
    return commitments.filter(item => {
      // Para busca, verificamos se a busca bate em qualquer NC vinculada
      const linkedNCs = item.allocations?.map(a => credits.find(c => c.id === a.creditId)?.nc || '') || [];
      
      const matchSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.ne.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          linkedNCs.some(nc => nc.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Para filtros de UG/PI/ND, verificamos a primeira alocação (que define o grupo)
      const firstCredit = item.allocations?.length > 0 ? credits.find(c => c.id === item.allocations[0].creditId) : null;
      if (!firstCredit && filters.ug) return false;

      const matchUg = !filters.ug || firstCredit?.ug === filters.ug;
      const matchPi = !filters.pi || firstCredit?.pi === filters.pi;
      const matchNd = !filters.nd || firstCredit?.nd === filters.nd;
      const matchSection = !filters.section || firstCredit?.section === filters.section;

      return matchSearch && matchUg && matchPi && matchNd && matchSection;
    });
  }, [commitments, credits, searchTerm, filters]);

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
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-black">
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
            {filteredItems.length > 0 ? filteredItems.map((item) => {
              const cancelledValue = cancellations.filter(can => can.commitmentId === item.id).reduce((acc, curr) => acc + curr.value, 0);
              const currentBalance = item.value - cancelledValue;
              
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">{new Date(item.date).toLocaleDateString('pt-BR')}</div>
                    <div className="font-black text-red-900 text-xs italic">{item.ne}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.allocations?.map(a => {
                        const nc = credits.find(c => c.id === a.creditId);
                        return (
                          <div key={a.creditId} className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                            <span className="text-[9px] font-black text-emerald-800 italic block leading-none">{nc?.nc || 'Desconhecida'}</span>
                            <span className="text-[8px] font-bold text-slate-500">{formatCurrency(a.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-400 text-xs">{formatCurrency(item.value)}</td>
                  <td className="px-6 py-4 text-right font-black text-red-700 text-xs">{formatCurrency(currentBalance)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 transition-all">
                      {canEdit && (
                        <>
                          <button onClick={() => { setEditingItem(item); setActiveView('add'); }} className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700 rounded-lg transition-all"><Edit3 size={14} /></button>
                          <button onClick={() => onDelete(item.id)} className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700 rounded-lg transition-all"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest">Nenhum empenho registrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommitmentList;
