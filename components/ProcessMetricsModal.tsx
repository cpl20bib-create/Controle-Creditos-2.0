import React, { useMemo } from 'react';
import { Commitment } from '../types';
import { X, Clock, ArrowRight } from 'lucide-react';
import { parseLocalDate } from '../utils/dateUtils';

interface ProcessMetricsModalProps {
  commitments: Commitment[];
  onClose: () => void;
}

export const ProcessMetricsModal: React.FC<ProcessMetricsModalProps> = ({ commitments, onClose }) => {
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
      timeToCompany?: number | null; // NE (date) -> sentToCompanyDate
      timeToReceive?: number | null; // sentToCompanyDate -> receivedFromCompanyDate (Wait, the user said "tempo do recebido da empresa até o recebimento". sentToCompany -> receivedFromCompany, but they said "tempo do empenho até o envio, recebido da empresa até o recebimento")
      // Let's re-read: "tempo do empenho até o envio para a empresa, tempo do recebido da empresa até o recebimento, tempo desde o recebimento até o envio para a Conformidade Documental, tempo da Conformidade Documental até o envio para o Setor Financeiro e tempo do envio para o Setor Financeiro até a Liquidação"
      timeEmpenhoToCompany?: number | null; // date -> sentToCompanyDate
      timeReceivedToArrival?: number | null; // receivedFromCompanyDate -> materialArrivedDate (recebimento)
      timeArrivalToConfDoc?: number | null; // materialArrivedDate -> sentToConfDocDate
      timeConfDocToFinance?: number | null; // sentToConfDocDate -> sentToFinanceDate
      timeFinanceToLiquidation?: number | null; // sentToFinanceDate -> liquidationDate
    }> = [];

    commitments.forEach(com => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const timeEmpenhoToCompany = getDaysDiff(com.date, com.sentToCompanyDate);

      if (isGlobal) {
        (com.materialArrivals || []).forEach(arr => {
          // If the arrival has a liquidation, we need to map it. Wait, liquidation might be global for the array or mapped 1:1. 
          // For now, let's just use the first liquidation we find or match by invoice.
          // In global, the liquidation date might be in com.liquidations.
          // Since it's complex, we'll try to find a liquidation with the same date or later.
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
            timeFinanceToLiquidation: getDaysDiff(arr.sentToFinanceDate, liq?.date)
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
          timeFinanceToLiquidation: getDaysDiff(com.sentToFinanceDate, com.liquidationDate)
        });
      }
    });

    return items;
  }, [commitments]);

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

        <div className="flex-1 overflow-x-auto overflow-y-auto p-6 bg-slate-50/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Nota de Empenho</th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">NF</th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Empenho <ArrowRight size={10} className="inline mx-1"/> Envio (Empresa)</th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Aceite (Empresa) <ArrowRight size={10} className="inline mx-1"/> Recebimento</th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Recebimento <ArrowRight size={10} className="inline mx-1"/> Conf. Doc</th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Conf. Doc <ArrowRight size={10} className="inline mx-1"/> Setor Financeiro</th>
                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Setor Financeiro <ArrowRight size={10} className="inline mx-1"/> Liquidação</th>
              </tr>
            </thead>
            <tbody>
              {processItems.map((item, index) => (
                <tr key={item.id || index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4">
                    <p className="text-sm font-black text-slate-800">{item.ne}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type}</p>
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
              {processItems.length === 0 && (
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
