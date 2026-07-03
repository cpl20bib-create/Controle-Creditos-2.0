import React, { useState, useMemo } from 'react';
import { Commitment, Credit } from '../types';
import { X, Clock, ArrowRight, ArrowUp, ArrowDown, Building2, Tag, Search, Filter } from 'lucide-react';
import { parseLocalDate } from '../utils/dateUtils';

interface ProcessMetricsModalProps {
  commitments: Commitment[];
  credits: Credit[];
  onClose: () => void;
}

export const ProcessMetricsModal: React.FC<ProcessMetricsModalProps> = ({ commitments, credits, onClose }) => {
  const [sortBy, setSortBy] = useState<string>('ne');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [sectionFilter, setSectionFilter] = useState('');
  const [ugFilter, setUgFilter] = useState('');
  const [piFilter, setPiFilter] = useState('');
  const [ndFilter, setNdFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const getDaysDiff = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const d1 = parseLocalDate(start);
    const d2 = parseLocalDate(end);
    if (!d1 || !d2) return null;
    // Difference in days, absolute or negative if dates are inverted
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
  };

  const processItems = useMemo(() => {
    const items: Array<{
      id: string;
      ne: string;
      invoice: string;
      type: string;
      timeEmpenhoToCompany?: number | null;
      timeReceivedToArrival?: number | null;
      timeArrivalToConfDoc?: number | null;
      timeConfDocToFinance?: number | null;
      timeFinanceToLiquidation?: number | null;
      section: string;
      ug: string;
      pi: string;
      nd: string;
    }> = [];

    commitments.forEach(com => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const timeEmpenhoToCompany = getDaysDiff(com.date, com.sentToCompanyDate);
      const credit = credits.find(c => c.id === com.creditId);
      const section = credit?.section || '';
      const ug = credit?.ug || '';
      const pi = credit?.pi || '';
      const nd = credit?.nd || '';

      if (isGlobal) {
        (com.materialArrivals || []).forEach(arr => {
          const liq = com.liquidations?.find(l => l.date >= (arr.sentToFinanceDate || ''));
          
          items.push({
            id: `${com.id}_${arr.id}`,
            ne: com.ne,
            invoice: arr.invoice || 'S/N',
            type: 'Parcial',
            timeEmpenhoToCompany,
            timeReceivedToArrival: getDaysDiff(com.receivedFromCompanyDate, arr.date),
            timeArrivalToConfDoc: getDaysDiff(arr.date, arr.sentToConfDocDate),
            timeConfDocToFinance: getDaysDiff(arr.sentToConfDocDate, arr.sentToFinanceDate),
            timeFinanceToLiquidation: getDaysDiff(arr.sentToFinanceDate, liq?.date),
            section, ug, pi, nd
          });
        });
      } else {
        items.push({
          id: com.id,
          ne: com.ne,
          invoice: com.invoice || 'S/N',
          type: 'Ordinário',
          timeEmpenhoToCompany,
          timeReceivedToArrival: getDaysDiff(com.receivedFromCompanyDate, com.materialArrivedDate),
          timeArrivalToConfDoc: getDaysDiff(com.materialArrivedDate, com.sentToConfDocDate),
          timeConfDocToFinance: getDaysDiff(com.sentToConfDocDate, com.sentToFinanceDate),
          timeFinanceToLiquidation: getDaysDiff(com.sentToFinanceDate, com.liquidationDate),
          section, ug, pi, nd
        });
      }
    });

    return items;
  }, [commitments, credits]);

  const sections = useMemo(() => Array.from(new Set(processItems.map(i => i.section).filter(Boolean))).sort(), [processItems]);
  const ugs = useMemo(() => Array.from(new Set(processItems.map(i => i.ug).filter(Boolean))).sort(), [processItems]);
  const pis = useMemo(() => Array.from(new Set(processItems.map(i => i.pi).filter(Boolean))).sort(), [processItems]);
  const nds = useMemo(() => Array.from(new Set(processItems.map(i => i.nd).filter(Boolean))).sort(), [processItems]);

  const filteredAndSortedItems = useMemo(() => {
    let result = processItems.filter(item => {
      const matchesSearch = item.ne.toLowerCase().includes(searchTerm.toLowerCase()) || item.invoice.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = !sectionFilter || item.section === sectionFilter;
      const matchesUg = !ugFilter || item.ug === ugFilter;
      const matchesPi = !piFilter || item.pi === piFilter;
      const matchesNd = !ndFilter || item.nd === ndFilter;
      return matchesSearch && matchesSection && matchesUg && matchesPi && matchesNd;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'ne':
          comparison = a.ne.localeCompare(b.ne);
          break;
        case 'timeEmpenhoToCompany':
          comparison = (a.timeEmpenhoToCompany ?? -1) - (b.timeEmpenhoToCompany ?? -1);
          break;
        case 'timeReceivedToArrival':
          comparison = (a.timeReceivedToArrival ?? -1) - (b.timeReceivedToArrival ?? -1);
          break;
        case 'timeArrivalToConfDoc':
          comparison = (a.timeArrivalToConfDoc ?? -1) - (b.timeArrivalToConfDoc ?? -1);
          break;
        case 'timeConfDocToFinance':
          comparison = (a.timeConfDocToFinance ?? -1) - (b.timeConfDocToFinance ?? -1);
          break;
        case 'timeFinanceToLiquidation':
          comparison = (a.timeFinanceToLiquidation ?? -1) - (b.timeFinanceToLiquidation ?? -1);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [processItems, searchTerm, sectionFilter, ugFilter, piFilter, ndFilter, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-full">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Métricas de Tempo do Processo
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Tempo em dias corridos entre cada fase do processo.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por NE ou NF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              <select 
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
              >
                <option value="">Todas as Seções</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              
              <select 
                value={ugFilter}
                onChange={(e) => setUgFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
              >
                <option value="">Todas as UGs</option>
                {ugs.map(u => <option key={u} value={u}>{u}</option>)}
              </select>

              <select 
                value={piFilter}
                onChange={(e) => setPiFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
              >
                <option value="">Todos os PIs</option>
                {pis.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <select 
                value={ndFilter}
                onChange={(e) => setNdFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
              >
                <option value="">Todas as NDs</option>
                {nds.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto p-6 bg-slate-50/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('ne')}>
                  Nota de Empenho {renderSortIcon('ne')}
                </th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  NF
                </th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('timeEmpenhoToCompany')}>
                  Empenho <ArrowRight size={10} className="inline mx-1"/> Envio {renderSortIcon('timeEmpenhoToCompany')}
                </th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('timeReceivedToArrival')}>
                  Aceite <ArrowRight size={10} className="inline mx-1"/> Recebimento {renderSortIcon('timeReceivedToArrival')}
                </th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('timeArrivalToConfDoc')}>
                  Recebimento <ArrowRight size={10} className="inline mx-1"/> Conf. Doc {renderSortIcon('timeArrivalToConfDoc')}
                </th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('timeConfDocToFinance')}>
                  Conf. Doc <ArrowRight size={10} className="inline mx-1"/> Setor Fin. {renderSortIcon('timeConfDocToFinance')}
                </th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('timeFinanceToLiquidation')}>
                  Setor Fin. <ArrowRight size={10} className="inline mx-1"/> Liquidação {renderSortIcon('timeFinanceToLiquidation')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedItems.map((item, index) => (
                <tr key={item.id || index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4">
                    <p className="text-sm font-black text-slate-800">{item.ne}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type}</p>
                    {item.ug && (
                      <p className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-widest inline-block mt-1">
                        UG {item.ug}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-bold border border-indigo-100">
                      {item.invoice}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {item.timeEmpenhoToCompany !== null ? (
                      <span className="text-sm font-bold text-slate-600">{item.timeEmpenhoToCompany} dias</span>
                    ) : (
                      <span className="text-sm font-medium text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {item.timeReceivedToArrival !== null ? (
                      <span className="text-sm font-bold text-slate-600">{item.timeReceivedToArrival} dias</span>
                    ) : (
                      <span className="text-sm font-medium text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {item.timeArrivalToConfDoc !== null ? (
                      <span className="text-sm font-bold text-slate-600">{item.timeArrivalToConfDoc} dias</span>
                    ) : (
                      <span className="text-sm font-medium text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {item.timeConfDocToFinance !== null ? (
                      <span className="text-sm font-bold text-slate-600">{item.timeConfDocToFinance} dias</span>
                    ) : (
                      <span className="text-sm font-medium text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {item.timeFinanceToLiquidation !== null ? (
                      <span className="text-sm font-bold text-slate-600">{item.timeFinanceToLiquidation} dias</span>
                    ) : (
                      <span className="text-sm font-medium text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAndSortedItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">Nenhum dado encontrado</h3>
                    <p className="text-slate-500 font-medium mt-2">Os processos começarão a aparecer aqui assim que houver movimentações.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
