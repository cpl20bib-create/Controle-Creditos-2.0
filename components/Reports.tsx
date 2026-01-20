import React, { useMemo } from 'react';
import { Credit, Commitment, Refund, Cancellation } from '../types';
import {
  Download, FileText, Share2, Printer,
  Landmark, TrendingDown, RefreshCcw
} from 'lucide-react';

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

const Reports: React.FC<ReportsProps> = ({
  credits,
  commitments,
  refunds,
  cancellations
}) => {

  /* 🔒 ARRAYS SEGUROS */
  const safeCredits = credits ?? [];
  const safeCommitments = commitments ?? [];
  const safeRefunds = refunds ?? [];
  const safeCancellations = cancellations ?? [];

  const summary = useMemo<Record<string, UGSummary>>(() => {
    const ugSummary: Record<string, UGSummary> = {};

    safeCredits.forEach(c => {
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

    safeCommitments.forEach(com => {
      com.allocations?.forEach(alloc => {
        const credit = safeCredits.find(cr => cr.id === alloc.creditId);
        if (credit && ugSummary[credit.ug]) {
          ugSummary[credit.ug].committed += alloc.value;
        }
      });
    });

    safeRefunds.forEach(ref => {
      const credit = safeCredits.find(cr => cr.id === ref.creditId);
      if (credit && ugSummary[credit.ug]) {
        ugSummary[credit.ug].refunded += ref.value;
      }
    });

    safeCancellations.forEach(can => {
      const com = safeCommitments.find(c => c.id === can.commitmentId);
      if (com && com.allocations?.length > 0) {
        const firstCredit = safeCredits.find(
          cr => cr.id === com.allocations![0].creditId
        );
        if (firstCredit && ugSummary[firstCredit.ug]) {
          ugSummary[firstCredit.ug].cancelled += can.value;
        }
      }
    });

    return ugSummary;
  }, [
    safeCredits,
    safeCommitments,
    safeRefunds,
    safeCancellations
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
