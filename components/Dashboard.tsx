
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';
import { Credit, Commitment, Refund, Cancellation, Filters, UG } from '../types';
import { ArrowUpRight, Wallet, Landmark, PieChart as PieChartIcon, TrendingDown, AlertTriangle, Clock, ChevronRight, X, History } from 'lucide-react';
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

  const filteredData = useMemo(() => {
    const filteredCredits = credits.filter(c => {
      if (filters.ug && c.ug !== filters.ug) return false;
      if (filters.pi && c.pi !== filters.pi) return false;
      if (filters.nd && c.nd !== filters.nd) return false;
      if (filters.section && c.section !== filters.section) return false;
      return true;
    });

    const creditIds = new Set(filteredCredits.map(c => c.id));
    
    // Cálculo de Saldos considerando Alocações Individuais
    const totalReceived = filteredCredits.reduce((acc, curr) => acc + curr.valueReceived, 0);
    const totalRefunded = refunds.filter(ref => creditIds.has(ref.creditId)).reduce((acc, curr) => acc + curr.value, 0);

    // Empenhado líquido por crédito
    let totalCommittedNet = 0;
    filteredCredits.forEach(credit => {
      const creditAllocationsSum = commitments.reduce((acc, com) => {
        const alloc = com.allocations?.find(a => a.creditId === credit.id);
        return acc + (alloc ? alloc.value : 0);
      }, 0);

      const creditCancellationsSum = cancellations.reduce((acc, can) => {
        const com = commitments.find(c => c.id === can.commitmentId);
        if (!com) return acc;
        const alloc = com.allocations?.find(a => a.creditId === credit.id);
        if (!alloc) return acc;
        return acc + (can.value * (alloc.value / com.value));
      }, 0);

      totalCommittedNet += (creditAllocationsSum - creditCancellationsSum);
    });

    const netReceived = totalReceived - totalRefunded;
    const totalAvailable = netReceived - totalCommittedNet;
    const executionPercentage = netReceived > 0 ? (totalCommittedNet / netReceived) * 100 : 0;

    // Identificar Alertas Críticos - CONSIDERA SALDO >= 0.01
    const criticalAlerts = filteredCredits.map(c => {
      const spent = commitments.reduce((acc, com) => {
        const alloc = com.allocations?.find(a => a.creditId === c.id);
        return acc + (alloc ? alloc.value : 0);
      }, 0);
      
      const refunded = refunds.filter(ref => ref.creditId === c.id).reduce((a, b) => a + b.value, 0);
      
      const cancelled = cancellations.reduce((acc, can) => {
        const com = commitments.find(comItem => comItem.id === can.commitmentId);
        if (!com) return acc;
        const alloc = com.allocations?.find(a => a.creditId === c.id);
        if (!alloc) return acc;
        return acc + (can.value * (alloc.value / com.value));
      }, 0);

      const balance = parseFloat((c.valueReceived - refunded - spent + cancelled).toFixed(2));
      const daysToDeadline = Math.ceil((new Date(c.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      return { ...c, balance, daysToDeadline };
    }).filter(c => {
      const hasBalance = c.balance >= 0.01;
      const isUrgent = c.daysToDeadline <= 15;
      const isLowBalance = c.balance < (c.valueReceived * 0.05);
      
      return hasBalance && (isUrgent || isLowBalance);
    });

    // Gráfico por Seção (Respeita filtros de UG/PI/ND mas NÃO o de seção para mostrar o comparativo)
    const sectionAvailableMap: Record<string, number> = {};
    credits.forEach(c => {
      if (filters.ug && c.ug !== filters.ug) return;
      if (filters.pi && c.pi !== filters.pi) return;
      if (filters.nd && c.nd !== filters.nd) return;
      
      const spent = commitments.reduce((acc, com) => {
        const allocItem = com.allocations?.find(a => a.creditId === c.id);
        return acc + (allocItem ? allocItem.value : 0);
      }, 0);
      
      const cancelled = cancellations.reduce((acc, can) => {
        const com = commitments.find(comItem => comItem.id === can.commitmentId);
        if (!com) return acc;
        const allocItem = com.allocations?.find(a => a.creditId === c.id);
        if (!allocItem) return acc;
        return acc + (can.value * (allocItem.value / com.value));
      }, 0);

      const available = c.valueReceived - 
        refunds.filter(r => r.creditId === c.id).reduce((a, b) => a + b.value, 0) - 
        (spent - cancelled);
        
      sectionAvailableMap[c.section] = (sectionAvailableMap[c.section] || 0) + available;
    });

    const barChartData = Object.entries(sectionAvailableMap)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      totalReceived: netReceived,
      totalCommitted: totalCommittedNet,
      totalAvailable,
      executionPercentage,
      barChartData,
      criticalAlerts: criticalAlerts.slice(0, 10)
    };
  }, [credits, commitments, refunds, cancellations, filters]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleBarClick = (data: any) => {
    if (!data || !data.name) return;
    
    if (filters.section === data.name) {
      // Se clicar na mesma seção, limpa o filtro
      setFilters({ ...filters, section: undefined });
    } else {
      // Caso contrário, aplica o filtro da seção clicada
      setFilters({ ...filters, section: data.name });
    }
  };

  const selectedDetailCredit = credits.find(c => c.id === detailCreditId);
  
  const getIndividualNCBalance = (credit: Credit) => {
    const totalSpent = commitments.reduce((acc, com) => {
      const alloc = com.allocations?.find(a => a.creditId === credit.id);
      return acc + (alloc ? alloc.value : 0);
    }, 0);
    const refunded = refunds.filter(ref => ref.creditId === credit.id).reduce((a, b) => a + b.value, 0);
    const cancelled = cancellations.reduce((acc, can) => {
      const com = commitments.find(c => c.id === can.commitmentId);
      if (!com) return acc;
      const alloc = com.allocations?.find(a => a.creditId === credit.id);
      if (!alloc) return acc;
      return acc + (can.value * (alloc.value / com.value));
    }, 0);
    return parseFloat((credit.valueReceived - totalSpent - refunded + cancelled).toFixed(2));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-black">
      <FilterBar filters={filters} setFilters={setFilters} credits={credits} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dotação Líquida</p>
          <h3 className="text-xl font-black text-slate-900">{formatCurrency(filteredData.totalReceived)}</h3>
          <div className="mt-2 text-[9px] font-bold text-emerald-600 uppercase">Total Disponível</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Empenhado</p>
          <h3 className="text-xl font-black text-slate-900">{formatCurrency(filteredData.totalCommitted)}</h3>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${Math.min(100, filteredData.executionPercentage)}%` }}></div>
            </div>
            <span className="text-[9px] font-black text-red-600">{filteredData.executionPercentage.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Livre</p>
          <h3 className="text-xl font-black text-emerald-600">{formatCurrency(filteredData.totalAvailable)}</h3>
          <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase">Disponível p/ Empenho</div>
        </div>

        <div className="bg-emerald-900 p-6 rounded-2xl shadow-lg border border-emerald-800 text-white">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Alertas Ativos</p>
          <h3 className="text-xl font-black">{filteredData.criticalAlerts.length} NCs</h3>
          <div className="mt-2 text-[9px] font-bold text-emerald-300 uppercase italic">Exigindo Atenção</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-[450px] flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <TrendingDown size={14} className="text-emerald-600" /> Distribuição de Saldo por Seção
            </h4>
            {filters.section && (
              <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg uppercase animate-pulse">
                Filtrando: {filters.section}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData.barChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} 
                  formatter={(value: number) => formatCurrency(value)} 
                />
                <Bar 
                  dataKey="value" 
                  radius={[0, 8, 8, 0]} 
                  barSize={20}
                  onClick={handleBarClick}
                >
                  {filteredData.barChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      className="cursor-pointer transition-all duration-300"
                      fill={filters.section === entry.name ? '#064e3b' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-[8px] font-bold text-slate-400 uppercase italic text-center">
            Dica: Clique em uma barra para isolar os dados da seção no Dashboard.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
            <AlertTriangle size={14} className="text-amber-500" /> Situações de Atenção
          </h4>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {filteredData.criticalAlerts.length > 0 ? filteredData.criticalAlerts.map(alert => (
              <button 
                key={alert.id} 
                onClick={() => setDetailCreditId(alert.id)}
                className="w-full text-left p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200 transition-all group shadow-sm active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-emerald-800 italic uppercase">{alert.nc}</span>
                  {alert.daysToDeadline <= 5 ? (
                    <span className="bg-red-100 text-red-700 text-[7px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 animate-pulse"><Clock size={8}/> Urgente</span>
                  ) : alert.daysToDeadline <= 15 ? (
                    <span className="bg-amber-100 text-amber-700 text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Prazo</span>
                  ) : (
                    <span className="bg-blue-100 text-blue-700 text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Saldo Baixo</span>
                  )}
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase truncate mb-3">{alert.description}</p>
                <div className="flex items-center justify-between">
                   <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Saldo: <span className="text-slate-900">{formatCurrency(alert.balance)}</span></div>
                   <div className="p-1 bg-white rounded-lg text-emerald-600 border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                     <ChevronRight size={12}/>
                   </div>
                </div>
              </button>
            )) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                <Landmark size={32} className="mb-2" />
                <p className="text-[10px] font-black uppercase text-center">Nenhum alerta<br/>pendente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDetailCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 text-black">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-emerald-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20"><Landmark size={24} /></div>
                <div>
                  <h3 className="text-xl font-black italic uppercase leading-none tracking-tight">{selectedDetailCredit.nc}</h3>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Extrato de Movimentação Individual</p>
                </div>
              </div>
              <button onClick={() => setDetailCreditId(null)} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
                  <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Valor Original</p>
                  <p className="text-2xl font-black">{formatCurrency(selectedDetailCredit.valueReceived)}</p>
                </div>
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                  <p className="text-[9px] font-black text-red-600 uppercase mb-1">Consumido por Empenhos</p>
                  <p className="text-2xl font-black text-red-800">{formatCurrency(selectedDetailCredit.valueReceived - getIndividualNCBalance(selectedDetailCredit))}</p>
                </div>
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Saldo Livre Atual</p>
                  <p className="text-2xl font-black text-emerald-800">{formatCurrency(getIndividualNCBalance(selectedDetailCredit))}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2"><History size={14} className="text-emerald-600" /> Histórico de Alocações</h4>
                <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                   <div className="relative flex items-center gap-4">
                      <div className="absolute -left-8 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow-sm"></div>
                      <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase text-slate-500">Aporte de Crédito</span>
                         <span className="text-xs font-black text-emerald-700">+{formatCurrency(selectedDetailCredit.valueReceived)}</span>
                      </div>
                   </div>
                   
                   {credits.find(c => c.id === selectedDetailCredit.id) && commitments.flatMap(com => {
                      const alloc = com.allocations?.find(a => a.creditId === selectedDetailCredit.id);
                      return alloc ? [{ ne: com.ne, value: alloc.value, date: com.date, id: com.id }] : [];
                   }).map(alloc => (
                     <div key={alloc.id} className="relative flex items-center gap-4">
                        <div className="absolute -left-8 w-6 h-6 rounded-full bg-red-400 border-4 border-white shadow-sm"></div>
                        <div className="flex-1 bg-white p-3 rounded-xl border border-red-50 flex justify-between items-center">
                           <div>
                             <span className="text-[10px] font-black uppercase text-red-900 italic">NE {alloc.ne} (Fatia Alocada)</span>
                             <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">{new Date(alloc.date).toLocaleDateString('pt-BR')}</p>
                           </div>
                           <span className="text-xs font-black text-red-600">-{formatCurrency(alloc.value)}</span>
                        </div>
                     </div>
                   ))}

                   {refunds.filter(r => r.creditId === selectedDetailCredit.id).map(ref => (
                     <div key={ref.id} className="relative flex items-center gap-4">
                        <div className="absolute -left-8 w-6 h-6 rounded-full bg-amber-400 border-4 border-white shadow-sm"></div>
                        <div className="flex-1 bg-amber-50 p-3 rounded-xl border border-amber-100 flex justify-between items-center">
                           <div>
                             <span className="text-[10px] font-black uppercase text-amber-800 italic">Recolhimento efetuado</span>
                             <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">{new Date(ref.date).toLocaleDateString('pt-BR')}</p>
                           </div>
                           <span className="text-xs font-black text-amber-600">-{formatCurrency(ref.value)}</span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
               <button onClick={() => setDetailCreditId(null)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Fechar Extrato</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
