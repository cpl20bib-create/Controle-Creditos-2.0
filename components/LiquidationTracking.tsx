import React, { useState, useMemo } from 'react';
import { Commitment, Cancellation, Credit } from '../types';
import { Search, Plus, Calendar, FileText, CheckSquare, Square, X, CheckCircle2, Tag, Filter, ArrowUp, ArrowDown, Building2, PackageSearch } from 'lucide-react';
import { formatDateBR } from '../utils/dateUtils';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface LiquidationTrackingProps {
  commitments: Commitment[];
  cancellations: Cancellation[];
  credits: Credit[];
  onUpdateCommitment: (updated: Commitment) => void;
  userRole?: string;
}

const NewLiquidationModal = ({ commitments, cancellations, credits, onClose, onSave }: any) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [liquidationDate, setLiquidationDate] = useState('');
  const [liquidationNs, setLiquidationNs] = useState('');
  const [partialValues, setPartialValues] = useState<Record<string, number>>({});

  const pendingCommitments = useMemo(() => {
    const processed = commitments.map((com: Commitment) => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const credit = credits.find((c: Credit) => c.id === com.creditId);
      
      const amountSentToFinance = isGlobal 
        ? (com.materialArrivals || []).filter((a: any) => !!a.sentToFinanceDate).reduce((acc: number, a: any) => acc + a.value, 0) 
        : (com.sentToFinanceDate ? (com.materialArrivals?.length ? com.materialArrivals[0].value : com.value) : 0);
        
      const totalLiquidated = (com.liquidations || []).reduce((sum: number, l: any) => sum + l.value, 0)
        + ((com.liquidationNs && !(com.liquidations?.length > 0)) ? amountSentToFinance : 0);
              
      return { 
        ...com, 
        activeValue: amountSentToFinance - totalLiquidated,
        pi: credit?.pi || '',
        nd: credit?.nd || '',
        ug: credit?.ug || '',
        section: credit?.section || ''
      };
    }).filter((com: any) => com.activeValue > 0.01);
    
    const grouped = new Map<string, any>();
    processed.forEach((com: any) => {
      const key = `${com.ne}_${com.ug}`;
      if (!grouped.has(key)) {
        grouped.set(key, { ...com, originalIds: [com.id] });
      } else {
        const existing = grouped.get(key);
        existing.value += com.value;
        existing.activeValue += com.activeValue;
        existing.originalIds.push(com.id);
      }
    });
    return Array.from(grouped.values()).sort((a, b) => a.ne.localeCompare(b.ne));
  }, [commitments, cancellations, credits]);

  const handleToggle = (id: string, activeValue: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
      const newVals = { ...partialValues };
      delete newVals[id];
      setPartialValues(newVals);
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePartialValueChange = (id: string, val: number, max: number) => {
    setPartialValues({ ...partialValues, [id]: Math.min(Math.max(0, val), max) });
  };

  const allowedPi = selectedIds.length > 0 ? pendingCommitments.find(c => c.id === selectedIds[0])?.pi : null;
  const allowedNd = selectedIds.length > 0 ? pendingCommitments.find(c => c.id === selectedIds[0])?.nd : null;

  const handleSave = () => {
    if (selectedIds.length === 0) return alert('Selecione pelo menos um empenho para liquidar.');
    if (!liquidationDate) return alert('Informe a data da liquidação.');
    
    const regex = new RegExp(`^\\d{4}NS\\d{6}$`);
    if (!regex.test(liquidationNs)) return alert('O número da NS é inválido. O formato esperado é YYYYNSXXXXXX (ex: 2026NS123456).');

    selectedIds.forEach(groupId => {
      const group = pendingCommitments.find((g: any) => g.id === groupId);
      if (!group) return;

      group.originalIds.forEach((id: string) => {
        const com = commitments.find((c: Commitment) => c.id === id);
        if (com) {
          const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
          const comActiveValue = pendingCommitments.find((c: any) => c.id === id)?.activeValue || 0; // Wait, this doesn't work, we grouped by ne_ug. 
          // Let's compute comActiveValue again:
          const amountSentToFinance = isGlobal 
            ? (com.materialArrivals || []).filter((a: any) => !!a.sentToFinanceDate).reduce((acc: number, a: any) => acc + a.value, 0) 
            : (com.sentToFinanceDate ? (com.materialArrivals?.length ? com.materialArrivals[0].value : com.value) : 0);
          const totalLiquidated = (com.liquidations || []).reduce((sum: number, l: any) => sum + l.value, 0)
            + ((com.liquidationNs && !(com.liquidations?.length > 0)) ? amountSentToFinance : 0);
          const comActive = amountSentToFinance - totalLiquidated;

          const totalVal = partialValues[groupId] !== undefined ? partialValues[groupId] : group.activeValue;
          const groupActive = group.activeValue;
          
          let valToApply = 0;
          if (groupActive > 0) {
            valToApply = totalVal * (comActive / groupActive);
          } else { 
            valToApply = totalVal / group.originalIds.length;
          }
          
          if (valToApply > 0.01) {
            onSave({
              ...com,
              liquidations: [...(com.liquidations || []), { id: Math.random().toString(36).substr(2, 9), ns: liquidationNs, date: liquidationDate, value: Number(valToApply.toFixed(2)) }],
              // Also populate legacy fields for compatibility
              liquidationNs: com.liquidationNs || liquidationNs,
              liquidationDate: com.liquidationDate || liquidationDate
            });
          }
        }
      });
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
                                value={partialValues[com.id] !== undefined ? partialValues[com.id] : com.activeValue}
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

const LiquidationTracking: React.FC<LiquidationTrackingProps> = ({ commitments, cancellations, credits, onUpdateCommitment, userRole }) => {
  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR' || userRole === 'FINANCEIRO';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sectionFilter, setSectionFilter] = useState('');
  const [piFilter, setPiFilter] = useState('');
  const [ugFilter, setUgFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [viewMode, setViewMode] = useState<'pending' | 'liquidated'>('pending');

  const sections = useMemo(() => Array.from(new Set(credits.map(c => c.section).filter(Boolean))), [credits]);
  const pis = useMemo(() => Array.from(new Set(credits.map(c => c.pi).filter(Boolean))), [credits]);
  const ugs = useMemo(() => Array.from(new Set(credits.map(c => c.ug).filter(Boolean))), [credits]);

  const processedCommitments = useMemo(() => {
    return commitments.map(com => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const credit = credits.find(c => c.id === com.creditId);
      
      const totalCancellations = cancellations
        .filter((c: Cancellation) => c.commitmentId === com.id)
        .reduce((sum: number, c: Cancellation) => sum + c.value, 0);

      const amountSentToFinance = isGlobal 
        ? (com.materialArrivals || []).filter(a => !!a.sentToFinanceDate).reduce((acc: number, a: any) => acc + a.value, 0) 
        : (com.sentToFinanceDate ? (com.materialArrivals?.length ? com.materialArrivals[0].value : com.value) : 0);
        
      const totalLiquidated = (com.liquidations || []).reduce((sum, l) => sum + l.value, 0)
        + ((com.liquidationNs && !(com.liquidations?.length > 0)) ? amountSentToFinance : 0);
              
      const activeValue = amountSentToFinance - totalLiquidated;
      
      return {
        ...com,
        activeValue: Math.max(0, activeValue),
        totalLiquidated,
        amountSentToFinance,
        totalCancellations,
        pi: credit?.pi || '',
        nd: credit?.nd || '',
        ug: credit?.ug || '',
        section: credit?.section || ''
      };
    });
  }, [commitments, credits, cancellations]);

  const filtered = useMemo(() => {
    return processedCommitments.filter(com => {
      if (viewMode === 'pending' && com.activeValue < 0.01) return false;
      if (viewMode === 'liquidated' && com.totalLiquidated < 0.01) return false;

      const matchesSearch = com.ne.toLowerCase().includes(searchTerm.toLowerCase()) || 
        com.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = sectionFilter ? com.section === sectionFilter : true;
      const matchesPi = piFilter ? com.pi === piFilter : true;
      const matchesUg = ugFilter ? com.ug === ugFilter : true;
      const matchesType = typeFilter ? com.type === typeFilter : true;

      return matchesSearch && matchesSection && matchesPi && matchesUg && matchesType;
    }).sort((a, b) => b.totalLiquidated - a.totalLiquidated);
  }, [processedCommitments, viewMode, searchTerm, sectionFilter, piFilter, ugFilter, typeFilter]);

  const totalValue = filtered.reduce((sum, c) => sum + (viewMode === 'pending' ? c.activeValue : c.totalLiquidated), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex-1 w-full xl:w-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por NE, descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700 outline-none"
          />
        </div>
        {canEdit && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 shrink-0 w-full xl:w-auto"
        >
          <Plus size={18} /> Nova Liquidação
        </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 text-sm font-black text-slate-500 uppercase tracking-widest mr-2 shrink-0">
            <Filter size={16} /> Filtros:
          </div>
          <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas as Seções</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={piFilter} onChange={(e) => setPiFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos os PIs</option>
            {pis.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={ugFilter} onChange={(e) => setUgFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas as UGs</option>
            {ugs.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos os Tipos</option>
            <option value="Ordinário">Ordinário</option>
            <option value="Global">Global</option>
            <option value="Estimativo">Estimativo</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-0">
          <div className="flex">
            <button 
              onClick={() => setViewMode('pending')}
              className={`flex-1 sm:flex-none px-6 py-4 text-sm font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border-b-2 ${viewMode === 'pending' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Pendentes
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${viewMode === 'pending' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                {processedCommitments.filter(c => c.activeValue >= 0.01).length}
              </span>
            </button>
            <button 
              onClick={() => setViewMode('liquidated')}
              className={`flex-1 sm:flex-none px-6 py-4 text-sm font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border-b-2 ${viewMode === 'liquidated' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Liquidados
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${viewMode === 'liquidated' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {processedCommitments.filter(c => c.totalLiquidated >= 0.01).length}
              </span>
            </button>
          </div>
          <div className="px-6 py-3 sm:py-0 mt-4 sm:mt-0 text-right bg-slate-50 sm:bg-transparent rounded-xl sm:rounded-none">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {viewMode === 'pending' ? 'Total Pendente' : 'Total Liquidado'}
            </p>
            <p className={`text-lg font-black ${viewMode === 'pending' ? 'text-indigo-600' : 'text-emerald-600'}`}>
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>

        <div className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <PackageSearch size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">Nenhum resultado</h3>
              <p className="text-slate-500 font-medium mt-2">Nenhum empenho encontrado com os filtros atuais.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(com => (
                <div key={com.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black text-slate-800">{com.ne}</h3>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                          com.type === 'Global' ? 'bg-purple-100 text-purple-700' :
                          com.type === 'Estimativo' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {com.type}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                          {com.ug}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed mb-4">{com.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                          <Building2 size={14} className="text-slate-400" />
                          {com.pi} / {com.nd}
                        </div>
                        {com.section && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            <Tag size={14} className="text-slate-400" />
                            {com.section}
                          </div>
                        )}
                        {com.processNumber && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            <FileText size={14} className="text-slate-400" />
                            {com.processNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:w-72 shrink-0 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor do Empenho</span>
                        <span className="text-sm font-black text-slate-700">{formatCurrency(com.value)}</span>
                      </div>
                      
                      {viewMode === 'pending' ? (
                        <>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enviado p/ Financeiro</span>
                            <span className="text-sm font-black text-indigo-400">{formatCurrency(com.amountSentToFinance)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Pendente Liq.</span>
                            <span className="text-lg font-black text-indigo-600">{formatCurrency(com.activeValue)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Total Liquidado</span>
                            <span className="text-lg font-black text-emerald-600">{formatCurrency(com.totalLiquidated)}</span>
                          </div>
                          {com.liquidations && com.liquidations.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 border-dashed space-y-2 mt-2">
                              {com.liquidations.map((l: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-medium">{formatDateBR(l.date)} - {l.ns}</span>
                                  <span className="font-bold text-emerald-600">{formatCurrency(l.value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {com.liquidationNs && !(com.liquidations?.length > 0) && (
                            <div className="pt-2 border-t border-slate-100 border-dashed space-y-2 mt-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">{formatDateBR(com.liquidationDate || '')} - {com.liquidationNs}</span>
                                <span className="font-bold text-emerald-600">{formatCurrency(com.totalLiquidated)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <NewLiquidationModal
          commitments={commitments}
          cancellations={cancellations}
          credits={credits}
          onClose={() => setIsModalOpen(false)}
          onSave={onUpdateCommitment}
        />
      )}
    </div>
  );
};

export default LiquidationTracking;
