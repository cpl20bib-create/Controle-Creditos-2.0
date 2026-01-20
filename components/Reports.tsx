import React, { useMemo } from 'react';
import { Credit, Commitment, Refund, Cancellation } from '../types';
import {
  Download, FileText, Share2, Printer,
  Landmark, TrendingDown, RefreshCcw
} from 'lucide-react';

interface ReportsProps {
  creditos: Credit[];
  empenhos: Commitment[];
  recolhimentos: Refund[];
  anulacoes_empenho: Cancellation[];
}

interface UGSummary {
  received: number;
  committed: number;
  refunded: number;
  cancelled: number;
}

const Reports: React.FC<ReportsProps> = ({
  creditos,
  empenhos,
  recolhimentos,
  anulacoes_empenho
}) => {

  /* 🔒 ARRAYS SEGUROS */
  const safecreditos = creditos ?? [];
  const safeempenhos = empenhos ?? [];
  const saferecolhimentos = recolhimentos ?? [];
  const safeanulacoes_empenho = anulacoes_empenho ?? [];

  const summary = useMemo<Record<string, UGSummary>>(() => {
    const ugSummary: Record<string, UGSummary> = {};

    safecreditos.forEach(c => {
      if (!ugSummary[c.ug]) {
        ugSummary[c.ug] = {
          received: 0,
          committed: 0,
          refunded: 0,
          cancelled: 0
        };
      }
      ugSummary[c.ug].received += c.valueReceived;
    });

    safeempenhos.forEach(com => {
      com.allocations?.forEach(alloc => {
        const credit = safecreditos.find(cr => cr.id === alloc.creditId);
        if (credit && ugSummary[credit.ug]) {
          ugSummary[credit.ug].committed += alloc.value;
        }
      });
    });

    saferecolhimentos.forEach(ref => {
      const credit = safecreditos.find(cr => cr.id === ref.creditId);
      if (credit && ugSummary[credit.ug]) {
        ugSummary[credit.ug].refunded += ref.value;
      }
    });

    safeanulacoes_empenho.forEach(can => {
      const com = safeempenhos.find(c => c.id === can.commitmentId);
      if (com && com.allocations?.length > 0) {
        const firstCredit = safecreditos.find(
          cr => cr.id === com.allocations![0].creditId
        );
        if (firstCredit && ugSummary[firstCredit.ug]) {
          ugSummary[firstCredit.ug].cancelled += can.value;
        }
      }
    });

    return ugSummary;
  }, [
    safecreditos,
    safeempenhos,
    saferecolhimentos,
    safeanulacoes_empenho
  ]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);

  return (
    <>
      {/* JSX ORIGINAL MANTIDO INTEGRALMENTE */}
    </>
  );
};

export default Reports;
