
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Credit, Commitment, Refund, Cancellation, Filters } from '../types';
import { Landmark, TrendingDown, AlertTriangle, Clock, ChevronRight, X, Search, ChevronDown, Info, PieChart, Activity } from 'lucide-react';
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const dashboardData = useMemo(() => {
    const safeCredits = credits || [];
    const safeCommitments = commitments || [];
    const safeCancellations = cancellations || [];
    const safeRefunds = refunds || [];

    const filteredCredits = safeCredits.filter(c => {
      if (filters.ug && c.ug !== filters.ug) return false;
      if (filters.pi && c.pi !== filters.pi) return false;
      if (filters.nd && c.nd !== filters.nd) return false;
      if (filters.section && c.section !== filters.section) return false;
      return true;
    });

    let totalReceived = 0;
    let totalCommittedNet = 0;

    const creditDetails = filteredCredits.map(credit => {
      const comms = safeCommitments.filter(com => com.creditId === credit.id);
      const commTotal = comms.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      
      const cans = safeCancellations.filter(can => comms.some(com => com.id === can.commitmentId));
      const cansTotal = cans.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      
      const refs = safeRefunds.filter(ref => ref.creditId === credit.id);
      const refsTotal = refs.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

      // Fórmulas solicitadas
      const balance = (Number(credit.valueReceived) || 0) - commTotal + cansTotal - refsTotal;
      const used = commTotal - cansTotal;
      
      totalReceived += (Number(credit.valueReceived) || 0);
      totalCommittedNet += used;

      const daysToDeadline = Math.ceil((new Date(credit.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      return { ...credit, balance, used, daysToDeadline };
    });

    const executionPercentage = totalReceived > 0 ? (totalCommittedNet / totalReceived) * 100 : 0;
    const totalAvailable = totalReceived - totalCommittedNet;

    // Agrupamento para o Gráfico de Barras por Seção
    const sectionMap: Record<string, { total: number, pis: Record<string, number> }> = {};
    creditDetails.forEach(c => {
      if (c.balance > 0.01) {
        if (!sectionMap[c.section]) {
          sectionMap[c.section] = { total: 0, pis: {} };
        }
        sectionMap[c.section].total += c.balance;
        sectionMap[c.section].pis[c.pi] = (sectionMap[c.section].pis[c.pi] || 0) + c.balance;
      }
    });

    const barChartData = Object.entries(sectionMap)
      .map(([name, data]) => ({ 
        name, 
        value: data.total,
        piDetails: Object.entries(data.pis)
          .map(([pi, val]) => ({ pi, val }))
          .sort((a, b) => b.val - a.val)
      }))
      .sort((a, b) => b.value - a.value);

    const alerts = creditDetails.filter(c => c.balance > 0.01 && (c.daysToDeadline <= 15 || c.balance < (c.valueReceived * 0.05)));

    return {
      totalReceived,
      totalCommitted: totalCommittedNet,
      totalAvailable,
      executionPercentage,
      criticalAlerts: alerts.slice(0, 10),
      barChartData,
      allCreditDetails: creditDetails
    };
  }, [credits, commitments, refunds, cancellations, filters]);

  // Hierarquia para o Explorador de Saldos
  const explorerHierarchy = useMemo(() => {
    const active = dashboardData.allCreditDetails.filter(c => 
      c.balance > 0.01 && 
      (c.nc.toLowerCase().includes(explorerSearch.toLowerCase()) || 
       c.description.toLowerCase().includes(explorerSearch.toLowerCase()))
    );

    const tree: any = {};
    active.forEach(c => {
      if (!tree[c.ug]) tree[c.ug] = {};
      if (!tree[c.ug][c.section]) tree[c.ug][c.section] = {};
      if (!tree[c.ug][c.section][c.pi]) tree[c.ug][c.section][c.pi] = [];
      tree[c.ug][c.section][c.pi].push(c);
    });

    return tree;
  }, [dashboardData.allCreditDetails, explorerSearch]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 font-sans max-w-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
            <PieChart size={12} /> {data.name}
          </p>
          <div className="space-y-2">
            {data.piDetails.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-4 border-b border-slate-800 pb-1">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">PI {item.pi}</span>
                <span className="text-[10px] font-black text-white">{formatCurrency(item.val)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 flex justify-between items-center">
             <span className="text-[9px] font-black text-emerald-500 uppercase">Total Seção</span>
             <span className="text-xs font-black">{formatCurrency(data.value)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-black font-sans pb-20">
      <FilterBar filters={filters} setFilters={setFilters} credits={credits} showExtendedFilters={false} />

      {/* Cartões de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
          <h3 className="text-xl font-black text-slate-900">{formatCurrency(dashboardData.totalReceived)}</h3>
          <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase">Soma Bruta de Créditos</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empenhado</p>
          <h3 className="text-xl font-black text-red-600">{formatCurrency(dashboardData.totalCommitted)}</h3>
          <div className="mt-2 space-y-1">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${Math.min(100, dashboardData.executionPercentage)}%` }}></div>
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex justify-between">
              <span>Utilização</span>
              <span>{dashboardData.executionPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Em Tela</p>
          <h3 className="text-xl font-black text-emerald-600">{formatCurrency(dashboardData.totalAvailable)}</h3>
          <div className="mt-2 text-[9px] font-bold text-emerald-500 uppercase italic">Saldo Real Disponível</div>
        </div>
      </div>

      {/* Gráfico e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-8">
            <Activity size={14} className="text-emerald-600" /> Saldo Disponível por Seção
          </h4>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.barChartData} layout="vertical" margin={{ left: 20, right: 60, top: 0, bottom: 0 }}>
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
                  barSize={20}
                  label={{ 
                    position: 'right', 
                    fontSize: 10, 
                    fontWeight: 900, 
                    fill: '#022c22',
                    formatter: (val: number) => formatCurrency(val) 
                  }}
                >
                  {dashboardData.barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#10b981" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col max-h-[480px]">
          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
            <AlertTriangle size={14} className="text-amber-500" /> Notas sob Atenção
          </h4>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {dashboardData.criticalAlerts.length > 0 ? dashboardData.criticalAlerts.map(alert => (
              <button 
                key={alert.id} 
                onClick={() => setDetailCreditId(alert.id)}
                className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-emerald-800 italic uppercase">{alert.nc}</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-red-50 text-red-600 uppercase">
                    {alert.daysToDeadline} d
                  </span>
                </div>
                <div className="flex items-end justify-between">
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saldo Atual</p>
                      <p className="text-xs font-black text-slate-900 leading-none">{formatCurrency(alert.balance)}</p>
                   </div>
                   <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500" />
                </div>
              </button>
            )) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Landmark size={40} className="mb-2" />
                <p className="text-[9px] font-black uppercase text-center tracking-widest">Nenhum Alerta Ativo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explorador de Saldos Detalhados */}
      <div className="pt-8 border-t border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
           <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Explorador de Saldos Detalhados</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">Navegação hierárquica por dotação ativa</p>
           </div>
           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por NC ou descrição..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                value={explorerSearch}
                onChange={e => setExplorerSearch(e.target.value)}
              />
           </div>
        </div>

        <div className="space-y-4">
           {Object.keys(explorerHierarchy).length > 0 ? Object.entries(explorerHierarchy).map(([ug, sections]: [string, any]) => (
             <div key={ug} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleExpand(`ug-${ug}`)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">UG {ug}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{Object.keys(sections).length} Seções Interessadas</span>
                  </div>
                  <ChevronDown className={`transition-transform duration-300 ${expandedItems[`ug-${ug}`] ? 'rotate-180' : ''}`} size={16} />
                </button>

                {expandedItems[`ug-${ug}`] && (
                  <div className="p-4 space-y-3 bg-white border-t border-slate-100">
                    {Object.entries(sections).map(([section, pis]: [string, any]) => (
                      <div key={section} className="border border-slate-100 rounded-xl overflow-hidden">
                        <button 
                          onClick={() => toggleExpand(`sec-${ug}-${section}`)}
                          className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{section}</span>
                          <ChevronDown className={`transition-transform duration-300 ${expandedItems[`sec-${ug}-${section}`] ? 'rotate-180' : ''}`} size={14} />
                        </button>

                        {expandedItems[`sec-${ug}-${section}`] && (
                          <div className="p-4 space-y-4 bg-white border-t border-slate-50">
                            {Object.entries(pis).map(([pi, ncs]: [string, any]) => (
                              <div key={pi} className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-2 py-0.5 rounded-md uppercase">PI {pi}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {ncs.map((nc: any) => (
                                    <button 
                                      key={nc.id}
                                      onClick={() => toggleExpand(`nc-det-${nc.id}`)}
                                      className={`text-left p-4 rounded-xl border transition-all ${expandedItems[`nc-det-${nc.id}`] ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-emerald-200 bg-white'}`}
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                         <span className="text-[10px] font-black text-emerald-900 uppercase italic">{nc.nc}</span>
                                         <span className="text-[10px] font-black text-emerald-600">{formatCurrency(nc.balance)}</span>
                                      </div>
                                      
                                      {expandedItems[`nc-det-${nc.id}`] && (
                                        <div className="mt-4 pt-4 border-t border-emerald-100 animate-in fade-in slide-in-from-top-1">
                                           <div className="space-y-4">
                                              <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Descrição Detalhada</p>
                                                <p className="text-[11px] font-medium text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-inner italic">
                                                  {nc.description || 'Sem descrição detalhada disponível.'}
                                                </p>
                                              </div>
                                              <div className="grid grid-cols-2 gap-4">
                                                 <div className="bg-slate-900 p-3 rounded-xl text-white">
                                                    <p className="text-[8px] font-black text-emerald-400 uppercase leading-none">Original</p>
                                                    <p className="text-xs font-black mt-1">{formatCurrency(nc.valueReceived)}</p>
                                                 </div>
                                                 <div className="bg-emerald-600 p-3 rounded-xl text-white">
                                                    <p className="text-[8px] font-black text-emerald-100 uppercase leading-none">Saldo Atual</p>
                                                    <p className="text-xs font-black mt-1">{formatCurrency(nc.balance)}</p>
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
                                      )}
                                    </button>
                                  ))}
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
             <div className="bg-slate-50 p-16 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center opacity-40">
                <Search size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhum crédito ativo com saldo para os filtros atuais</p>
             </div>
           )}
        </div>
      </div>

      {/* Modal de Detalhes de NC sob Atenção */}
      {detailCreditId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            {(() => {
              const nc = dashboardData.allCreditDetails.find(c => c.id === detailCreditId);
              if (!nc) return null;
              return (
                <>
                  <div className="bg-emerald-900 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Info size={24} className="text-emerald-400" />
                      <div>
                        <h3 className="text-lg font-black uppercase italic leading-none">{nc.nc}</h3>
                        <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mt-1">Detalhes da Dotação Orçamentária</p>
                      </div>
                    </div>
                    <button onClick={() => setDetailCreditId(null)} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  <div className="p-8 space-y-6 font-sans">
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Finalidade / Descrição</p>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{nc.description}"</p>
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Valor Original</p>
                           <p className="text-sm font-black text-slate-900">{formatCurrency(nc.valueReceived)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Gasto Líquido</p>
                           <p className="text-sm font-black text-red-600">{formatCurrency(nc.used)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                           <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Saldo Livre</p>
                           <p className="text-sm font-black text-emerald-600">{formatCurrency(nc.balance)}</p>
                        </div>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                        <span>PI: {nc.pi} | ND: {nc.nd} | UG: {nc.ug}</span>
                        <span className={nc.daysToDeadline <= 5 ? 'text-red-600 animate-pulse' : ''}>Vence em: {new Date(nc.deadline).toLocaleDateString('pt-BR')} ({nc.daysToDeadline} d)</span>
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
