
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Credit, Commitment, Refund, Cancellation, Filters } from '../types';
import { Landmark, TrendingDown, AlertTriangle, Clock, ChevronRight, X, Search, ChevronDown, Info, PieChart, Activity, FilterX, BarChart3, Receipt } from 'lucide-react';
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

    // Cálculo real de saldos seguindo a regra: Recebido - Empenhos + Anulações
    const allProcessedCredits = safeCredits.map(credit => {
      const comms = safeCommitments.filter(com => com.creditId === credit.id);
      const commTotal = comms.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      
      const cans = safeCancellations.filter(can => comms.some(com => com.id === can.commitmentId));
      const cansTotal = cans.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      
      const refs = safeRefunds.filter(ref => ref.creditId === credit.id);
      const refsTotal = refs.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

      // Saldo Disponível: Recebido - (Empenhos - Anulações) - Recolhimentos
      const balanceValue = (Number(credit.valueReceived) || 0) - (commTotal - cansTotal) - refsTotal;
      const usedValue = commTotal - cansTotal;
      const daysToDeadline = Math.ceil((new Date(credit.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      return { ...credit, balanceValue, usedValue, daysToDeadline };
    });

    // Filtros de topo (UG, PI, ND)
    const topFiltered = allProcessedCredits.filter(c => {
      if (filters.ug && c.ug !== filters.ug) return false;
      if (filters.pi && c.pi !== filters.pi) return false;
      if (filters.nd && c.nd !== filters.nd) return false;
      return true;
    });

    // Dados para o Gráfico de Barras por Seção (baseado nos filtros globais)
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

    // Filtro de Seção Interativo (Local)
    const localFiltered = topFiltered.filter(c => {
      if (activeSectionFilter && c.section !== activeSectionFilter) return false;
      return true;
    });

    let summaryReceived = 0;
    let summaryCommitted = 0;
    localFiltered.forEach(c => {
      summaryReceived += Number(c.valueReceived) || 0;
      summaryCommitted += c.usedValue;
    });

    const summaryAvailable = summaryReceived - summaryCommitted;
    const executionPercentage = summaryReceived > 0 ? (summaryCommitted / summaryReceived) * 100 : 0;

    // Notas em Atenção: saldo > 0 e (vencimento em 15 dias ou saldo < 5%)
    const attentionNCs = localFiltered.filter(c => 
      c.balanceValue > 0 && (c.daysToDeadline <= 15 || c.balanceValue < (Number(c.valueReceived) * 0.05))
    );

    return {
      summaryReceived,
      summaryCommitted,
      summaryAvailable,
      executionPercentage,
      attentionCount: attentionNCs.length,
      criticalAlerts: attentionNCs.slice(0, 10),
      barChartData,
      allProcessedCredits: allProcessedCredits
    };
  }, [credits, commitments, refunds, cancellations, filters, activeSectionFilter]);

  const handleBarClick = (data: any) => {
    if (!data || !data.name) return;
    setActiveSectionFilter(prev => prev === data.name ? null : data.name);
  };

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
      // Regra 1: valueReceived > 0 (mostrar todos com dotação)
      const matchesBase = (Number(c.valueReceived) || 0) > 0;
      // Regra 2: Filtro de busca por NC ou Descrição
      const matchesSearch = c.nc.toLowerCase().includes(explorerSearch.toLowerCase()) || 
                            (c.description || '').toLowerCase().includes(explorerSearch.toLowerCase());
      // Regra 3: Integração com Filtro de Seção da Barra
      const matchesBarFilter = !activeSectionFilter || c.section === activeSectionFilter;
      // Regra 4: Filtros globais
      const matchesGlobal = (!filters.ug || c.ug === filters.ug) && 
                            (!filters.pi || c.pi === filters.pi) &&
                            (!filters.nd || c.nd === filters.nd);

      return matchesBase && matchesSearch && matchesBarFilter && matchesGlobal;
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

      {/* Cartões de Resumo Atualizados conforme solicitação */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
          <h3 className="text-xl font-black text-slate-900">{formatCurrency(dashboardData.summaryReceived)}</h3>
          <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase">Dotação Acumulada</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empenhado</p>
          <h3 className="text-xl font-black text-red-600">{formatCurrency(dashboardData.summaryCommitted)}</h3>
          <div className="mt-2 space-y-1.5">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${Math.min(100, dashboardData.executionPercentage)}%` }}></div>
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex justify-between">
              <span>Utilização</span>
              <span>{dashboardData.executionPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Em Tela</p>
          <h3 className="text-xl font-black text-emerald-600">{formatCurrency(dashboardData.summaryAvailable)}</h3>
          <div className="mt-2 text-[9px] font-bold text-emerald-500 uppercase italic">Saldo Real Disponível</div>
        </div>

        <div className="bg-amber-50 p-6 rounded-2xl shadow-sm border border-amber-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Notas em Atenção</p>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-amber-900">{dashboardData.attentionCount} <span className="text-xs">NCs</span></h3>
          <p className="text-[8px] font-bold text-amber-700 uppercase tracking-tighter">Vencimento Próximo / Saldo Baixo</p>
        </div>
      </div>

      {/* Gráfico de Barras e Notas de Atenção */}
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
                <p className="text-[9px] font-black uppercase text-center tracking-widest">Nenhuma nota em situação de alerta</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explorador de Saldos Detalhados */}
      <div className="pt-8 border-t border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Activity size={24} /></div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Explorador de Saldos Detalhados</h2>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">
                  {'Navegação estruturada por UG > Seção > PI > NC'}
                </p>
              </div>
           </div>
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Filtrar por Nota de Crédito ou Descrição..." 
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                value={explorerSearch}
                onChange={e => setExplorerSearch(e.target.value)}
              />
           </div>
        </div>

        <div className="space-y-4">
           {Object.keys(explorerHierarchy).length > 0 ? Object.entries(explorerHierarchy).map(([ug, sections]: [string, any]) => (
             <div key={ug} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleExpand(`ug-${ug}`)}
                  className="w-full px-8 py-5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="bg-slate-900 text-white text-[9px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest shadow-md">UG {ug}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{Object.keys(sections).length} Seções Interessadas</span>
                  </div>
                  <ChevronDown className={`transition-transform duration-300 text-slate-400 ${expandedItems[`ug-${ug}`] ? 'rotate-180' : ''}`} size={20} />
                </button>

                {expandedItems[`ug-${ug}`] && (
                  <div className="p-6 space-y-4 bg-white border-t border-slate-100">
                    {Object.entries(sections).map(([section, pis]: [string, any]) => (
                      <div key={section} className="border border-slate-100 rounded-[1.5rem] overflow-hidden">
                        <button 
                          onClick={() => toggleExpand(`sec-${ug}-${section}`)}
                          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/40 hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">{section}</span>
                          <ChevronDown className={`transition-transform duration-300 text-slate-400 ${expandedItems[`sec-${ug}-${section}`] ? 'rotate-180' : ''}`} size={16} />
                        </button>

                        {expandedItems[`sec-${ug}-${section}`] && (
                          <div className="p-6 space-y-6 bg-white border-t border-slate-50">
                            {Object.entries(pis).map(([pi, ncs]: [string, any]) => (
                              <div key={pi} className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-sm">PI {pi}</span>
                                  <div className="h-px flex-1 bg-slate-100"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {ncs.map((nc: any) => {
                                    const perc = Number(nc.valueReceived) > 0 ? (nc.usedValue / Number(nc.valueReceived)) * 100 : 0;
                                    const isExpanded = expandedItems[`nc-det-${nc.id}`];
                                    return (
                                      <div 
                                        key={nc.id}
                                        className={`flex flex-col rounded-[1.5rem] border transition-all duration-300 ${isExpanded ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/10' : 'border-slate-100 bg-white hover:border-emerald-200 shadow-sm'}`}
                                      >
                                        <button 
                                          onClick={() => toggleExpand(`nc-det-${nc.id}`)}
                                          className="p-5 text-left w-full"
                                        >
                                          <div className="flex justify-between items-center mb-4">
                                             <span className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">{nc.nc}</span>
                                             <div className="text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Saldo Disponível</p>
                                                <p className="text-sm font-black text-emerald-700 mt-1">{formatCurrency(nc.balanceValue)}</p>
                                             </div>
                                          </div>
                                          
                                          {/* Barra de Progresso do Crédito Individual */}
                                          <div className="space-y-1.5">
                                             <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                                               <span>Empenhado: {perc.toFixed(1)}%</span>
                                               <span>Dotação: {formatCurrency(nc.valueReceived)}</span>
                                             </div>
                                             <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div 
                                                  className={`h-full transition-all duration-1000 ${perc > 90 ? 'bg-red-500' : perc > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                                  style={{ width: `${Math.min(100, perc)}%` }}
                                                ></div>
                                             </div>
                                          </div>
                                        </button>
                                        
                                        {isExpanded && (
                                          <div className="px-5 pb-6 animate-in fade-in slide-in-from-top-1">
                                             <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-inner space-y-4">
                                                <div className="flex items-center gap-2 text-emerald-600">
                                                  <Receipt size={14} />
                                                  <span className="text-[9px] font-black uppercase tracking-widest">Detalhes do Crédito</span>
                                                </div>
                                                <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">
                                                  {nc.description || "Nenhuma descrição detalhada informada."}
                                                </p>
                                                <div className="grid grid-cols-3 gap-3">
                                                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Dotação</p>
                                                      <p className="text-xs font-black text-slate-900">{formatCurrency(nc.valueReceived)}</p>
                                                   </div>
                                                   <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                                      <p className="text-[8px] font-black text-red-600 uppercase tracking-tighter mb-1">Empenhado</p>
                                                      <p className="text-xs font-black text-red-700">{formatCurrency(nc.usedValue)}</p>
                                                   </div>
                                                   <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter mb-1">Saldo</p>
                                                      <p className="text-xs font-black text-emerald-700">{formatCurrency(nc.balanceValue)}</p>
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
             <div className="bg-slate-50 p-20 rounded-[3rem] border-2 border-dashed border-slate-200 text-center opacity-40">
                <Search size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Nenhum registro encontrado para os filtros atuais</p>
             </div>
           )}
        </div>
      </div>

      {/* Modal de Detalhes de NC (Modo sob Atenção ou Explorador) */}
      {detailCreditId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
            {(() => {
              const nc = dashboardData.allProcessedCredits.find(c => c.id === detailCreditId);
              if (!nc) return null;
              return (
                <>
                  <div className="bg-emerald-900 p-8 text-white flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg"><Info size={24} /></div>
                      <div>
                        <h3 className="text-xl font-black uppercase italic leading-none tracking-tight">{nc.nc}</h3>
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-2 italic">Dotação Orçamentária BIB 20</p>
                      </div>
                    </div>
                    <button onClick={() => setDetailCreditId(null)} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><X size={28} /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Histórico / Descrição</p>
                        <p className="text-[11px] font-medium text-slate-700 leading-relaxed italic">"{nc.description}"</p>
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase mb-1 leading-none">Dotação</p>
                           <p className="text-xs font-black text-slate-900">{formatCurrency(nc.valueReceived)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase mb-1 leading-none">Empenhado</p>
                           <p className="text-xs font-black text-red-600">{formatCurrency(nc.usedValue)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                           <p className="text-[8px] font-black text-emerald-600 uppercase mb-1 leading-none">Saldo</p>
                           <p className="text-xs font-black text-emerald-600">{formatCurrency(nc.balanceValue)}</p>
                        </div>
                     </div>
                     <div className="flex justify-between items-center bg-slate-50 px-5 py-3 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        <span>PI: {nc.pi} | ND: {nc.nd} | UG: {nc.ug}</span>
                        <span className={`font-black ${nc.daysToDeadline <= 5 ? 'text-red-600 animate-pulse' : ''}`}>
                          Vencimento: {new Date(nc.deadline).toLocaleDateString('pt-BR')} ({nc.daysToDeadline} d)
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
