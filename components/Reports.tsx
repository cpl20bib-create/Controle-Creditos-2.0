
import React, { useMemo } from 'react';
import { Credit, Commitment, Refund, Cancellation } from '../types';
import { Landmark, TrendingDown, RefreshCcw } from 'lucide-react';

interface ReportsProps {
  credits: Credit[];
  commitments: Commitment[];
  refunds: Refund[];
  cancellations: Cancellation[];
}

interface UGSummary {
  received: number;
  committed: number;
  refunded: number;
  cancelled: number;
}

const Reports: React.FC<ReportsProps> = ({ credits, commitments, refunds, cancellations }) => {
  const summary = useMemo<Record<string, UGSummary>>(() => {
    const ugSummary: Record<string, UGSummary> = {};
    
    credits.forEach(c => {
      if (!ugSummary[c.ug]) ugSummary[c.ug] = { received: 0, committed: 0, refunded: 0, cancelled: 0 };
      ugSummary[c.ug].received += (Number(c.valueReceived) || 0);
    });

    // Fixed: Commitment uses creditId directly, not allocations
    commitments.forEach(com => {
      const credit = credits.find(cr => cr.id === com.creditId);
      if (credit && ugSummary[credit.ug]) {
        ugSummary[credit.ug].committed += (Number(com.value) || 0);
      }
    });

    refunds.forEach(ref => {
      const credit = credits.find(cr => cr.id === ref.creditId);
      if (credit && ugSummary[credit.ug]) {
        ugSummary[credit.ug].refunded += (Number(ref.value) || 0);
      }
    });

    // Fixed: Commitment uses creditId directly, not allocations
    cancellations.forEach(can => {
      const com = commitments.find(c => c.id === can.commitmentId);
      if (com) {
        const credit = credits.find(cr => cr.id === com.creditId);
        if (credit && ugSummary[credit.ug]) {
          ugSummary[credit.ug].cancelled += (Number(can.value) || 0);
        }
      }
    });

    return ugSummary;
  }, [credits, commitments, refunds, cancellations]);

  const formatCurrency = (val: number) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-black">
      <div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Consolidado Financeiro</h2>
        <p className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-widest italic">Visão Geral por Unidade Gestora (UG)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {(Object.entries(summary) as [string, UGSummary][]).map(([ug, data]) => (
          <div key={ug} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200"><Landmark size={24} /></div>
               <div>
                  <h3 className="text-xl font-black text-slate-800 italic uppercase leading-none">UG {ug}</h3>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Saldos Consolidados</p>
               </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <TrendingDown size={14} className="text-emerald-500" /> Dotação Líquida
                </div>
                <span className="text-sm font-black text-slate-900">{formatCurrency(data.received - data.refunded)}</span>
              </div>
              
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <RefreshCcw size={14} className="text-red-500" /> Empenhado Líquido
                </div>
                <span className="text-sm font-black text-red-700">{formatCurrency(data.committed - data.cancelled)}</span>
              </div>

              <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                <span className="text-emerald-700 font-black uppercase text-[10px] tracking-widest italic">Disponibilidade Real</span>
                <span className="text-2xl font-black text-emerald-600">
                  {formatCurrency(data.received - data.committed - data.refunded + data.cancelled)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
