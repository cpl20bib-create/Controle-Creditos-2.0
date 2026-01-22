
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Credit, Commitment, Refund, Cancellation, Filters } from '../types';
import { Landmark, AlertTriangle, Clock, ChevronRight, X, Search, ChevronDown, Info, PieChart, Activity, FilterX, BarChart3, Receipt, Zap } from 'lucide-react';
import FilterBar from './FilterBar';

interface DashboardProps {
  credits: Credit[];
  commitments: Commitment[];
  refunds: Refund[];
  cancellations: Cancellation[];
  filters: Filters;
  setFilters: (f: Filters) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ credits, commitments, refunds, cancellations, filters, setFilters }) => {
  const [detailCreditId, setDetailCreditId] = useState<string | null>(null);
  const [explorerSearch, setExplorerSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [activeSectionFilter, setActiveSectionFilter] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(val) || 0);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const dashboardData = useMemo(() => {
    const safeCredits = credits || [];
    const safeCommitments = commitments || [];
    const safeCancellations = cancellations || [];
    const safeRefunds = refunds || [];

    const allProcessedCredits = safeCredits.map(credit => {
      const cComms = safeCommitments.filter(com => com.creditId === credit.id);
      const cCommsBruto = cComms.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      const cCans = safeCancellations.filter(can => cComms.some(com => com.id === can.commitmentId));
      const cCansTotal = cCans.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      const cRefs = safeRefunds.filter(ref => ref.creditId === credit.id);
      const cRefsTotal = cRefs.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

      const balanceValue = (Number(credit.valueReceived) || 0) - (cCommsBruto - cCansTotal) - cRefsTotal;
      const usedValue = cCommsBruto - cCansTotal;
      const daysToDeadline = Math.ceil((new Date(credit.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      return { 
        ...credit, 
        balanceValue, 
        usedValue, 
        daysToDeadline,
        rawRefunds: cRefsTotal,
        rawCommitted: cCommsBruto,
        rawCancellations: cCansTotal
      };
    });

    const topFiltered = allProcessedCredits.filter(c => {
      if (filters.ug && c.ug !== filters.ug) return false;
      if (filters.pi && c.pi !== filters.pi) return false;
      if (filters.nd && c.nd !== filters.nd) return false;
      if (filters.section && c.section !== filters.section) return false; // CORREÇÃO: Adicionado filtro de seção
      return true;
    });

    const localFiltered = topFiltered.filter(c => {
      if (activeSectionFilter && c.section !== activeSectionFilter) return false;
      return true;
    });

    let sumReceivedBruto = 0;
    let sumRefunds = 0;
    let sumCommittedBruto = 0;
    let sumCancellations = 0;
    let sumAvailableUseful = 0;

    localFiltered.forEach(c => {
      sumReceivedBruto += (Number(c.valueReceived) || 0);
      sumRefunds += c.rawRefunds;
      sumCommittedBruto += c.rawCommitted;
      sumCancellations += c.rawCancellations;
      if (c.balanceValue > 0) {
        sumAvailableUseful += c.balanceValue;
      }
    });

    const summaryReceived = sumReceivedBruto - sumRefunds;
    const summaryCommitted = sumCommittedBruto - sumCancellations;
    const summaryAvailable = sumAvailableUseful;
    const executionPercentage = summaryReceived > 0 ? (summaryCommitted / summaryReceived) * 100 : 0;

    const attentionNCs = localFiltered.filter(c => 
      c.balanceValue > 0 && c.daysToDeadline <= 20
    );

    const sectionMap: Record<string, { totalAvailable: number, pis: Record<string, number> }> = {};
    topFiltered.forEach(c => {
      if (c.balanceValue > 0) {
        if (!sectionMap[c.section]) sectionMap[c.section] = { totalAvailable: 0, pis: {} };
        sectionMap[c.section].totalAvailable += c.balanceValue;
        sectionMap[c.section].pis[c.pi] = (sectionMap[c.section].pis[c.pi] || 0) + c.balanceValue;
      }
    });

    const barChartData = Object.entries(sectionMap)
      .map(([name, data]) => ({ 
        name, 
        value: data.totalAvailable,
        piDetails: Object.entries(data.pis).map(([pi, val]) => ({ pi, val })).sort((a, b) => b.val - a.val)
      }))
      .sort((a, b) => b.value - a.value);

    return {
      summaryReceived,
      summaryCommitted,
      summaryAvailable,
      executionPercentage,
      attentionCount: attentionNCs.length,
      criticalAlerts: attentionNCs.slice(0, 10),
      barChartData,
      allProcessedCredits
    };
  }, [credits, commitments, refunds, cancellations, filters, activeSectionFilter]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 font-sans max-w-[240px]">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
            <PieChart size={12} /> Detalhe PI: {data.name}
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {data.piDetails.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-4 border-b border-slate-800 pb-1">
                <span className="text-[9px] font-bold text-slate-300 uppercase">PI {item.pi}</span>
                <span className="text-[10px] font-black text-white">{formatCurrency(item.val)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 flex justify-between items-center border-t border-slate-700">
             <span className="text-[9px] font-black text-emerald-500 uppercase">Total Seção</span>
             <span className="text-xs font-black">{formatCurrency(data.value)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const explorerHierarchy = useMemo(() => {
    const filtered = dashboardData.allProcessedCredits.filter(c => {
      const hasBalance = c.balanceValue > 0;
      const matchesSearch = c.nc.toLowerCase().includes(explorerSearch.toLowerCase()) || 
                            (c.description || '').toLowerCase().includes(explorerSearch.toLowerCase());
      const matchesBarFilter = !activeSectionFilter || c.section === activeSectionFilter;
      const matchesGlobal = (!filters.ug || c.ug === filters.ug) && 
                            (!filters.pi || c.pi === filters.pi) &&
                            (!filters.nd || c.nd === filters.nd) &&
                            (!filters.section || c.section === filters.section); // CORREÇÃO: Adicionado filtro de seção
      return hasBalance && matchesSearch && matchesBarFilter && matchesGlobal;
    });

    const tree: any = {};
    filtered.forEach(c => {
      if (!tree[c.ug]) tree[c.ug] = {};
      if (!tree[c.ug][c.section]) tree[c.ug][c.section] = {};
      if (!tree[c.ug][c.section][c.pi]) tree[c.ug][c.section][c.pi] = [];
      tree[c.ug][c.section][c.pi].push(c);
    });
    return tree;
  }, [dashboardData.allProcessedCredits, explorerSearch, activeSectionFilter, filters]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-black font-sans pb-24">
      <FilterBar filters={filters} setFilters={setFilters} credits={credits} showExtendedFilters={false} />

      {/* Cartões de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido (Líq)</p>
          <h3 className="text-xl font-black text-slate-900">{formatCurrency(dashboardData.summaryReceived)}</h3>
          <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase italic">Dotação - Recolhimentos</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empenhado (Líq)</p>
          <h3 className="text-xl font-black text-red-600">{formatCurrency(dashboardData.summaryCommitted)}</h3>
          <div className="mt-2 space-y-1.5">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${Math.min(100, dashboardData.executionPercentage)}%` }}></div>
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex justify-between">
              <span>Execução</span>
              <span>{dashboardData.executionPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Em Tela</p>
          <h3 className="text-xl font-black text-emerald-600">{formatCurrency(dashboardData.summaryAvailable)}</h3>
          <div className="mt-2 text-[9px] font-bold text-emerald-500 uppercase italic">Disponibilidade Real</div>
        </div>

        {/* CARD DE ATENÇÃO ULTRA-MODERNO (SÍMBOLO DE ATENÇÃO) */}
        <div className="bg-slate-950 p-6 rounded-2xl shadow-2xl shadow-emerald-950/20 border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Status de Atenção</p>
            <AlertTriangle size={22} className={`text-emerald-400 ${dashboardData.attentionCount > 0 ? 'animate-pulse' : 'opacity-20'}`} />
          </div>
          
          <div className="relative z-10 mt-4">
            <h3 className="text-3xl font-black text-white italic tracking-tighter">
              {dashboardData.attentionCount} <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest not-italic ml-2">NCs Ativas</span>
            </h3>
            <p className="text-[8px] font-bold text-emerald-700 uppercase tracking-[0.2em] mt-1 italic">
              Vencimento crítico (&lt; 20 dias)
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={14} className="text-emerald-600" /> Disponível por Seção Interessada
            </h4>
            {activeSectionFilter && (
              <button 
                onClick={() => setActiveSectionFilter(null)}
                className="flex items-center gap-2 text-[9px] font-black bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full uppercase hover:bg-emerald-200 transition-all shadow-sm"
              >
                Limpar Filtro: {activeSectionFilter} <FilterX size={12} />
              </button>
            )}
          </div>
          <div className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={dashboardData.barChartData} 
                layout="vertical" 
                margin={{ left: 20, right: 120, top: 0, bottom: 0 }}
                onClick={(state) => {
                  if (state && state.activeLabel) {
                    setActiveSectionFilter(prev => prev === state.activeLabel ? null : state.activeLabel as string);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip cursor={{ fill: '#f8fafc', radius: 10 }} content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 8, 8, 0]} 
                  barSize={24}
                  className="cursor-pointer"
                >
                  {dashboardData.barChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={activeSectionFilter === entry.name ? '#064e3b' : '#10b981'} 
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    formatter={(val: number) => formatCurrency(val)} 
                    style={{ fontSize: 10, fontWeight: 900, fill: '#0f172a' }}
                    offset={10}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col max-h-[460px]">
          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
            <AlertTriangle size={14} className="text-amber-500" /> Situação Crítica
          </h4>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {dashboardData.criticalAlerts.length > 0 ? dashboardData.criticalAlerts.map(alert => (
              <button 
                key={alert.id} 
                onClick={() => setDetailCreditId(alert.id)}
                className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200 transition-all group shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-emerald-800 italic uppercase">{alert.nc}</span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${alert.daysToDeadline <= 5 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-amber-100 text-amber-700'}`}>
                    {alert.daysToDeadline} d
                  </span>
                </div>
                <div className="flex items-end justify-between">
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saldo Livre</p>
                      <p className="text-sm font-black text-slate-900 leading-none">{formatCurrency(alert.balanceValue)}</p>
                   </div>
                   <div className="p-1 bg-white rounded-lg border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <ChevronRight size={14} />
                   </div>
                </div>
              </button>
            )) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Activity size={40} className="mb-2" />
                <p className="text-[9px] font-black uppercase text-center tracking-widest">Tudo sob controle</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EXPLORADOR DE SALDOS ULTRA-MODERNO (DARK RAIO STYLE) */}
      <div className="pt-12 mt-12 border-t border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
           <div className="flex items-center gap-5">
              <div className="p-5 bg-slate-950 text-emerald-500 rounded-[2rem] shadow-2xl border border-slate-800"><Zap size={32} className="fill-emerald-500/20" /></div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic leading-none">Explorador de Saldos Estruturados</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div> Painel Executivo de Disponibilidade (FIFO)
                </p>
              </div>
           </div>
           <div className="relative w-full md:w-[450px] group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Filtrar por Nota de Crédito, PI ou Natureza..." 
                className="w-full pl-14 pr-6 py-4 bg-slate-100 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white rounded-[1.5rem] text-sm font-bold outline-none transition-all shadow-inner"
                value={explorerSearch}
                onChange={e => setExplorerSearch(e.target.value)}
              />
           </div>
        </div>

        <div className="bg-slate-950 rounded-[3rem] p-8 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-slate-800 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
           
           <div className="space-y-6 relative z-10">
              {Object.keys(explorerHierarchy).length > 0 ? Object.entries(explorerHierarchy).map(([ug, sections]: [string, any]) => (
                <div key={ug} className="border border-slate-800/50 rounded-[2.5rem] overflow-hidden bg-slate-900/10 backdrop-blur-sm">
                   <button 
                     onClick={() => toggleExpand(`ug-${ug}`)}
                     className="w-full px-10 py-7 flex items-center justify-between hover:bg-slate-900/30 transition-colors"
                   >
                     <div className="flex items-center gap-6">
                       <span className="bg-emerald-600/10 text-emerald-500 text-[11px] font-black px-6 py-2 rounded-2xl uppercase tracking-[0.3em] border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">UG {ug}</span>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{Object.keys(sections).length} Seções com Dotação</span>
                     </div>
                     <ChevronDown className={`transition-transform duration-500 text-slate-600 ${expandedItems[`ug-${ug}`] ? 'rotate-180 text-emerald-500' : ''}`} size={24} />
                   </button>

                   {expandedItems[`ug-${ug}`] && (
                     <div className="px-10 pb-8 space-y-6">
                       {Object.entries(sections).map(([section, pis]: [string, any]) => (
                         <div key={section} className="border border-slate-800/50 rounded-[2rem] overflow-hidden bg-slate-950/40">
                           <button 
                             onClick={() => toggleExpand(`sec-${ug}-${section}`)}
                             className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-900/30 transition-colors"
                           >
                             <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">{section}</span>
                             </div>
                             <ChevronDown className={`transition-transform duration-500 text-slate-700 ${expandedItems[`sec-${ug}-${section}`] ? 'rotate-180 text-emerald-500' : ''}`} size={20} />
                           </button>

                           {expandedItems[`sec-${ug}-${section}`] && (
                             <div className="px-8 pb-8 pt-4 space-y-10 border-t border-slate-800/30">
                               {Object.entries(pis).map(([pi, ncs]: [string, any]) => (
                                 <div key={pi} className="space-y-6">
                                   <div className="flex items-center gap-4">
                                     <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] bg-emerald-500/5 px-5 py-1.5 rounded-full border border-emerald-500/10">PI {pi}</span>
                                     <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent"></div>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     {ncs.map((nc: any) => {
                                       const perc = Number(nc.valueReceived) > 0 ? (nc.usedValue / Number(nc.valueReceived)) * 100 : 0;
                                       const isExpanded = expandedItems[`nc-det-${nc.id}`];
                                       return (
                                         <div 
                                           key={nc.id}
                                           className={`flex flex-col rounded-[2rem] border transition-all duration-500 ${isExpanded ? 'border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.1)] bg-slate-900' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 shadow-sm'}`}
                                         >
                                           <button 
                                             onClick={() => toggleExpand(`nc-det-${nc.id}`)}
                                             className="p-7 text-left w-full"
                                           >
                                             <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-3">
                                                   <Zap size={14} className={nc.balanceValue > 0 ? 'text-emerald-400' : 'text-slate-800'} />
                                                   <span className="text-[12px] font-black text-white uppercase italic tracking-tight">{nc.nc}</span>
                                                </div>
                                                <div className="text-right">
                                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Saldo Livre</p>
                                                   <p className="text-lg font-black text-emerald-400 tracking-tight">{formatCurrency(nc.balanceValue)}</p>
                                                </div>
                                             </div>
                                             
                                             <div className="space-y-2">
                                                <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">
                                                  <span>Consumo: {perc.toFixed(1)}%</span>
                                                  <span className="text-slate-600">Aporte: {formatCurrency(nc.valueReceived)}</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                                                   <div 
                                                     className={`h-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.4)] ${perc > 90 ? 'bg-red-500' : perc > 65 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                                     style={{ width: `${Math.min(100, perc)}%` }}
                                                   ></div>
                                                </div>
                                             </div>
                                           </button>
                                           
                                           {isExpanded && (
                                             <div className="px-7 pb-8 animate-in fade-in slide-in-from-top-1">
                                                <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-inner space-y-6">
                                                   <div className="flex items-center gap-3 text-emerald-500 border-b border-slate-800 pb-3">
                                                     <Receipt size={16} />
                                                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Especificação Técnica</span>
                                                   </div>
                                                   <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic border-l-2 border-emerald-500/30 pl-4">
                                                     {nc.description || "Sem descrição informada no cadastro."}
                                                   </p>
                                                   <div className="grid grid-cols-3 gap-4">
                                                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-md">
                                                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1">Lançamento</p>
                                                         <p className="text-[10px] font-black text-slate-300">{new Date(nc.created_at).toLocaleDateString('pt-BR')}</p>
                                                      </div>
                                                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-md">
                                                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1">Natureza</p>
                                                         <p className="text-[10px] font-black text-slate-300">ND {nc.nd}</p>
                                                      </div>
                                                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-md">
                                                         <p className="text-[8px] font-black text-red-500 uppercase tracking-tighter mb-1">Empenhado</p>
                                                         <p className="text-[10px] font-black text-red-400">{formatCurrency(nc.usedValue)}</p>
                                                      </div>
                                                   </div>
                                                </div>
                                             </div>
                                           )}
                                         </div>
                                       );
                                     })}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              )) : (
                <div className="py-24 text-center opacity-30">
                   <Search size={56} className="mx-auto mb-6 text-slate-800" />
                   <p className="text-sm font-black uppercase tracking-[0.5em] text-slate-600 italic">Nenhum registro encontrado</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Modal de Detalhes de NC */}
      {detailCreditId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] w-full max-w-xl overflow-hidden border border-slate-200">
            {(() => {
              const nc = dashboardData.allProcessedCredits.find(c => c.id === detailCreditId);
              if (!nc) return null;
              return (
                <>
                  <div className="bg-slate-950 p-8 text-white flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20"><Zap size={24} className="fill-white" /></div>
                      <div>
                        <h3 className="text-2xl font-black uppercase italic leading-none tracking-tight">{nc.nc}</h3>
                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em] mt-3 italic">Módulo de Auditoria Individual</p>
                      </div>
                    </div>
                    <button onClick={() => setDetailCreditId(null)} className="p-3 hover:bg-slate-900 rounded-full transition-colors"><X size={28} /></button>
                  </div>
                  <div className="p-10 space-y-8 font-sans">
                     <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Objeto da Dotação</p>
                        <p className="text-[11px] font-medium text-slate-700 leading-relaxed italic border-l-2 border-emerald-500/30 pl-5">"{nc.description}"</p>
                     </div>
                     <div className="grid grid-cols-3 gap-5">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase mb-2 leading-none tracking-widest">Original</p>
                           <p className="text-xs font-black text-slate-900">{formatCurrency(nc.valueReceived)}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                           <p className="text-[8px] font-black text-red-500 uppercase mb-2 leading-none tracking-widest">Empenhado</p>
                           <p className="text-xs font-black text-red-600">{formatCurrency(nc.usedValue)}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-md">
                           <p className="text-[8px] font-black text-emerald-600 uppercase mb-2 leading-none tracking-widest">Livre</p>
                           <p className="text-xs font-black text-emerald-600">{formatCurrency(nc.balanceValue)}</p>
                        </div>
                     </div>
                     <div className="flex justify-between items-center bg-slate-950 p-5 rounded-[1.5rem] border border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <span className="text-slate-400">PI: {nc.pi} | ND: {nc.nd} | UG: {nc.ug}</span>
                        <span className={`flex items-center gap-2 ${nc.daysToDeadline <= 5 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                          <Clock size={12} /> Prazo: {new Date(nc.deadline).toLocaleDateString('pt-BR')}
                        </span>
                     </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
