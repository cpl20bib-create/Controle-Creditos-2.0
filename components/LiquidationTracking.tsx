import React, { useState, useMemo } from 'react';
import { Commitment, Cancellation } from '../types';
import { Search, Plus, Calendar, FileText, CheckSquare, Square, X, CheckCircle2, Tag, Filter, ArrowUp, ArrowDown, Building2 } from 'lucide-react';
import { formatDateBR } from '../utils/dateUtils';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface LiquidationTrackingProps {
  commitments: Commitment[];
  cancellations: Cancellation[];
  onUpdateCommitment: (updated: Commitment) => void;
}

const LiquidationTracking: React.FC<LiquidationTrackingProps> = ({ commitments, cancellations, onUpdateCommitment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sectionFilter, setSectionFilter] = useState('');
  const [piFilter, setPiFilter] = useState('');
  const [ugFilter, setUgFilter] = useState('');
  const [showOnlyPendingNs, setShowOnlyPendingNs] = useState(false);
  const [sortBy, setSortBy] = useState<'ne' | 'value' | 'days'>('ne');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const eligibleCommitments = useMemo(() => {
    return commitments
      .filter(com => {
        const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
        const isArrived = isGlobal ? (com.materialArrivals?.length || 0) > 0 : !!com.materialArrivedDate;
        if (!isArrived) return false;
        
        const totalCancellations = cancellations
          .filter(c => c.commitmentId === com.id)
          .reduce((sum, c) => sum + c.value, 0);
        
        const totalLiquidated = isGlobal 
          ? (com.liquidations || []).reduce((sum, l) => sum + l.value, 0)
          : (com.liquidationNs ? com.value - totalCancellations : 0);

        const activeValue = com.value - totalCancellations - totalLiquidated;
        
        return activeValue > 0 || totalLiquidated > 0;
      })
      .map(com => {
        const totalCancellations = cancellations
          .filter(c => c.commitmentId === com.id)
          .reduce((sum, c) => sum + c.value, 0);
          
        const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
        const totalLiquidated = isGlobal 
          ? (com.liquidations || []).reduce((sum, l) => sum + l.value, 0)
          : (com.liquidationNs ? com.value - totalCancellations : 0);
        
        const daysSinceIssue = Math.floor((new Date().getTime() - new Date(com.date).getTime()) / (1000 * 3600 * 24));
        
        return { ...com, activeValue: com.value - totalCancellations - totalLiquidated, daysSinceIssue };
      });
  }, [commitments, cancellations]);

  const sections = useMemo(() => Array.from(new Set(eligibleCommitments.map(c => c.section).filter(Boolean))).sort(), [eligibleCommitments]);
  const pis = useMemo(() => Array.from(new Set(eligibleCommitments.map(c => c.pi).filter(Boolean))).sort(), [eligibleCommitments]);
  const ugs = useMemo(() => Array.from(new Set(eligibleCommitments.map(c => c.ug).filter(Boolean))).sort(), [eligibleCommitments]);

  const filteredAndSortedCommitments = useMemo(() => {
    let result = eligibleCommitments.filter(com => {
      const matchesSearch = 
        com.ne.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (com.liquidationNs && com.liquidationNs.toLowerCase().includes(searchTerm.toLowerCase())) ||
        com.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSection = !sectionFilter || com.section === sectionFilter;
      const matchesPi = !piFilter || com.pi === piFilter;
      const matchesUg = !ugFilter || com.ug === ugFilter;
      const matchesPendingNs = !showOnlyPendingNs || !com.liquidationNs;

      return matchesSearch && matchesSection && matchesPi && matchesUg && matchesPendingNs;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'ne') {
        comparison = a.ne.localeCompare(b.ne);
      } else if (sortBy === 'value') {
        comparison = a.activeValue - b.activeValue;
      } else if (sortBy === 'days') {
        comparison = a.daysSinceIssue - b.daysSinceIssue;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [eligibleCommitments, searchTerm, sectionFilter, piFilter, ugFilter, showOnlyPendingNs, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por NE, NS ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700 outline-none"
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={18} /> Nova Liquidação
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 text-sm font-black text-slate-500 uppercase tracking-widest mr-2 shrink-0">
            <Filter size={16} /> Filtros:
          </div>
          
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as Seções</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={piFilter}
            onChange={(e) => setPiFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os PIs</option>
            {pis.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={ugFilter}
            onChange={(e) => setUgFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as UGs</option>
            {ugs.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
            <input 
              type="checkbox" 
              checked={showOnlyPendingNs}
              onChange={(e) => setShowOnlyPendingNs(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Sem NS</span>
          </label>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto pt-4 xl:pt-0 border-t xl:border-t-0 border-slate-100">
          <span className="text-sm font-black text-slate-500 uppercase tracking-widest shrink-0">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-[140px]"
          >
            <option value="ne">Número NE</option>
            <option value="value">Valor</option>
            <option value="days">Dias Emitido</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
          >
            {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAndSortedCommitments.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
            <FileText className="mx-auto text-slate-300 mb-4" size={56} />
            <h3 className="text-xl font-black text-slate-700 uppercase tracking-widest mb-2">Nenhum Empenho</h3>
            <p className="text-slate-500 font-medium max-w-sm mx-auto">Nenhum empenho recebido corresponde aos filtros selecionados.</p>
          </div>
        ) : (
          filteredAndSortedCommitments.map(com => (
            <div key={com.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch">
              <div className={`w-2 md:w-3 shrink-0 ${com.liquidationNs ? 'bg-indigo-500' : 'bg-amber-400'}`} />
              <div className="p-5 flex-1 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg font-black text-slate-800">{com.ne}</h3>
                    {com.type === 'Global' || com.type === 'Estimativo' ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(com.liquidations || []).map((liq: any) => (
                           <span key={liq.id} className="text-[10px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 flex items-center gap-1">
                             <CheckCircle2 size={12} /> {liq.ns} ({formatCurrency(liq.value)})
                           </span>
                        ))}
                        {(!com.liquidations || com.liquidations.length === 0) && (
                           <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1">
                             <Calendar size={12} /> Aguardando NS
                           </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {com.liquidationNs ? (
                          <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 flex items-center gap-1">
                            <CheckCircle2 size={12} /> {com.liquidationNs}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1">
                            <Calendar size={12} /> Aguardando NS
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md mt-2">
                      UG {com.ug}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-500 line-clamp-2">{com.description}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Building2 size={14} /> {com.section || 'Sem Seção'}</span>
                    <span className="flex items-center gap-1"><Tag size={14} /> PI: {com.pi || '-'} / ND: {com.nd || '-'}</span>
                    <span className="flex items-center gap-1"><Calendar size={14} /> Emitido há {com.daysSinceIssue} dias</span>
                    {com.materialArrivedDate && (
                      <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={14} /> Recebido em: {formatDateBR(com.materialArrivedDate)}</span>
                    )}
                  </div>
                </div>
                <div className="text-left md:text-right shrink-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Saldo Disponível</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(com.activeValue)}</p>
                  {com.liquidationDate && (
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                      Liq: {formatDateBR(com.liquidationDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <NewLiquidationModal 
          commitments={commitments} 
          cancellations={cancellations}
          onClose={() => setIsModalOpen(false)} 
          onSave={onUpdateCommitment} 
        />
      )}
    </div>
  );
};

const NewLiquidationModal = ({ commitments, cancellations, onClose, onSave }: any) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [liquidationDate, setLiquidationDate] = useState('');
  const [liquidationNs, setLiquidationNs] = useState('');
  const [partialValues, setPartialValues] = useState<Record<string, number>>({});

  const pendingCommitments = useMemo(() => {
    return commitments.filter((com: Commitment) => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const isArrived = isGlobal ? (com.materialArrivals?.length || 0) > 0 : !!com.materialArrivedDate;
      if (!isArrived) return false;
      
      const totalCancellations = cancellations
        .filter((c: Cancellation) => c.commitmentId === com.id)
        .reduce((sum: number, c: Cancellation) => sum + c.value, 0);
        
      const totalLiquidated = isGlobal 
        ? (com.liquidations || []).reduce((sum, l) => sum + l.value, 0)
        : (com.liquidationNs ? com.value - totalCancellations : 0);

      const activeValue = com.value - totalCancellations - totalLiquidated;
      return activeValue > 0;
    }).map((com: Commitment) => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const totalCancellations = cancellations
        .filter((c: Cancellation) => c.commitmentId === com.id)
        .reduce((sum: number, c: Cancellation) => sum + c.value, 0);
      const totalLiquidated = isGlobal 
        ? (com.liquidations || []).reduce((sum, l) => sum + l.value, 0)
        : (com.liquidationNs ? com.value - totalCancellations : 0);
      return { ...com, activeValue: com.value - totalCancellations - totalLiquidated };
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [commitments, cancellations]);

  const allowedPi = selectedIds.length > 0 ? pendingCommitments.find((c: any) => c.id === selectedIds[0])?.pi : null;
  const allowedNd = selectedIds.length > 0 ? pendingCommitments.find((c: any) => c.id === selectedIds[0])?.nd : null;

  const handleToggle = (id: string, activeValue: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
      const newVals = { ...partialValues };
      delete newVals[id];
      setPartialValues(newVals);
    } else {
      setSelectedIds([...selectedIds, id]);
      setPartialValues(prev => ({ ...prev, [id]: activeValue }));
    }
  };

  const handlePartialValueChange = (id: string, val: number, max: number) => {
    setPartialValues(prev => ({ ...prev, [id]: Math.min(val, max) }));
  };

  const handleSave = () => {
    if (selectedIds.length === 0) return alert('Selecione pelo menos um empenho para liquidar.');
    if (!liquidationDate) return alert('Informe a data da liquidação.');
    
    // Validar NS no formato YYYYNSXXXXXX
    const regex = new RegExp(`^\\d{4}NS\\d{6}$`);
    if (!regex.test(liquidationNs)) return alert('O número da NS é inválido. O formato esperado é YYYYNSXXXXXX (ex: 2026NS123456).');

    selectedIds.forEach(id => {
      const com = commitments.find((c: Commitment) => c.id === id);
      if (com) {
        const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
        if (isGlobal) {
          const val = partialValues[id] || 0;
          if (val > 0) {
            onSave({
              ...com,
              liquidations: [...(com.liquidations || []), { id: Math.random().toString(36).substr(2, 9), ns: liquidationNs, date: liquidationDate, value: val }]
            });
          }
        } else {
          onSave({ ...com, liquidationNs, liquidationDate });
        }
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Nova Liquidação</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Selecione os empenhos e informe os dados</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Data da Liquidação</label>
              <input 
                type="date" 
                value={liquidationDate} 
                onChange={e => setLiquidationDate(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Número da NS</label>
              <input 
                type="text" 
                placeholder="Ex: 2026NS123456"
                value={liquidationNs} 
                onChange={e => setLiquidationNs(e.target.value.toUpperCase())} 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-slate-700 outline-none uppercase placeholder:normal-case placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Empenhos Disponíveis (Recebidos)</label>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md">
                {selectedIds.length} selecionado(s)
              </span>
            </div>
            
            {pendingCommitments.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <CheckCircle2 className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-slate-500 font-medium">Não há empenhos recebidos pendentes para liquidação.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingCommitments.map((com: any) => {
                  const isSelected = selectedIds.includes(com.id);
                  const isDisabled = selectedIds.length > 0 && !isSelected && (com.pi !== allowedPi || com.nd !== allowedNd);
                  
                  return (
                    <div 
                      key={com.id}
                      onClick={() => !isDisabled && handleToggle(com.id, com.activeValue)}
                      className={`p-4 rounded-xl border transition-all flex items-center gap-4 
                        ${isDisabled ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100' 
                        : isSelected ? 'bg-indigo-50 border-indigo-200 cursor-pointer shadow-sm shadow-indigo-100/50' 
                        : 'bg-white border-slate-200 hover:border-indigo-300 cursor-pointer hover:shadow-sm'}`}
                    >
                      <button type="button" className={`flex-shrink-0 transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`}>
                        {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                      </button>
                      <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-700 flex items-center gap-2">
                            {com.ne}
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-widest">{com.ug}</span>
                          </p>
                          <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1">{com.description}</p>
                        </div>
                        <div className="text-left md:text-right shrink-0 flex items-center gap-4">
                          <div className="flex flex-col">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{com.pi} / {com.nd}</p>
                            <p className={`font-black ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{formatCurrency(com.activeValue)}</p>
                          </div>
                          {(com.type === 'Global' || com.type === 'Estimativo') && isSelected && (
                            <div className="ml-4 flex flex-col items-end" onClick={e => e.stopPropagation()}>
                              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Valor a Liquidar (R$)</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                max={com.activeValue}
                                value={partialValues[com.id] || ''}
                                onChange={(e) => handlePartialValueChange(com.id, parseFloat(e.target.value) || 0, com.activeValue)}
                                className="w-28 px-2 py-1 rounded border border-indigo-200 focus:border-indigo-500 outline-none text-xs font-black text-indigo-700"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-200 transition-colors w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={selectedIds.length === 0}
            className="px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <CheckCircle2 size={16} /> Confirmar Liquidação
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiquidationTracking;
