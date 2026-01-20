import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, PieChart, Pie
} from 'recharts';
import {
  Credit, Commitment, Refund, Cancellation, Filters, UG
} from '../types';
import {
  ArrowUpRight, Wallet, Landmark, PieChart as PieChartIcon,
  TrendingDown, AlertTriangle, Clock, ChevronRight, X, History
} from 'lucide-react';
import FilterBar from './FilterBar';

interface DashboardProps {
  creditos: Credit[];
  empenhos: Commitment[];
  recolhimentos: Refund[];
  anulacoes_empenho: Cancellation[];
  filters: Filters;
  setFilters: (f: Filters) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  creditos,
  empenhos,
  recolhimentos,
  anulacoes_empenho,
  filters,
  setFilters
}) => {

  /* 🔒 ARRAYS SEGUROS (CORREÇÃO CRÍTICA) */
  const safecreditos = creditos ?? [];
  const safeempenhos = empenhos ?? [];
  const saferecolhimentos = recolhimentos ?? [];
  const safeanulacoes_empenho = anulacoes_empenho ?? [];

  const [detailCreditId, setDetailCreditId] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    const filteredcreditos = safecreditos.filter(c => {
      if (filters.ug && c.ug !== filters.ug) return false;
      if (filters.pi && c.pi !== filters.pi) return false;
      if (filters.nd && c.nd !== filters.nd) return false;
      if (filters.section && c.section !== filters.section) return false;
      return true;
    });

    const creditIds = new Set(filteredcreditos.map(c => c.id));

    const totalReceived = filteredcreditos.reduce(
      (acc, curr) => acc + curr.valueReceived,
      0
    );

    const totalRefunded = saferecolhimentos
      .filter(ref => creditIds.has(ref.creditId))
      .reduce((acc, curr) => acc + curr.value, 0);

    let totalCommittedNet = 0;

    filteredcreditos.forEach(credit => {
      const creditAllocationsSum = safeempenhos.reduce((acc, com) => {
        const alloc = com.allocations?.find(a => a.creditId === credit.id);
        return acc + (alloc ? alloc.value : 0);
      }, 0);

      const creditanulacoes_empenhoSum = safeanulacoes_empenho.reduce((acc, can) => {
        const com = safeempenhos.find(c => c.id === can.commitmentId);
        if (!com) return acc;
        const alloc = com.allocations?.find(a => a.creditId === credit.id);
        if (!alloc) return acc;
        return acc + (can.value * (alloc.value / com.value));
      }, 0);

      totalCommittedNet += (creditAllocationsSum - creditanulacoes_empenhoSum);
    });

    const netReceived = totalReceived - totalRefunded;
    const totalAvailable = netReceived - totalCommittedNet;
    const executionPercentage =
      netReceived > 0 ? (totalCommittedNet / netReceived) * 100 : 0;

    const criticalAlerts = filteredcreditos
      .map(c => {
        const spent = safeempenhos.reduce((acc, com) => {
          const alloc = com.allocations?.find(a => a.creditId === c.id);
          return acc + (alloc ? alloc.value : 0);
        }, 0);

        const refunded = saferecolhimentos
          .filter(ref => ref.creditId === c.id)
          .reduce((a, b) => a + b.value, 0);

        const cancelled = safeanulacoes_empenho.reduce((acc, can) => {
          const com = safeempenhos.find(comItem => comItem.id === can.commitmentId);
          if (!com) return acc;
          const alloc = com.allocations?.find(a => a.creditId === c.id);
          if (!alloc) return acc;
          return acc + (can.value * (alloc.value / com.value));
        }, 0);

        const balance = parseFloat(
          (c.valueReceived - refunded - spent + cancelled).toFixed(2)
        );

        const daysToDeadline = Math.ceil(
          (new Date(c.deadline).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
        );

        return { ...c, balance, daysToDeadline };
      })
      .filter(c => {
        const hasBalance = c.balance >= 0.01;
        const isUrgent = c.daysToDeadline <= 15;
        const isLowBalance = c.balance < (c.valueReceived * 0.05);
        return hasBalance && (isUrgent || isLowBalance);
      });

    const sectionAvailableMap: Record<string, number> = {};

    safecreditos.forEach(c => {
      if (filters.ug && c.ug !== filters.ug) return;

      const spent = safeempenhos.reduce((acc, com) => {
        const allocItem = com.allocations?.find(a => a.creditId === c.id);
        return acc + (allocItem ? allocItem.value : 0);
      }, 0);

      const cancelled = safeanulacoes_empenho.reduce((acc, can) => {
        const com = safeempenhos.find(comItem => comItem.id === can.commitmentId);
        if (!com) return acc;
        const allocItem = com.allocations?.find(a => a.creditId === c.id);
        if (!allocItem) return acc;
        return acc + (can.value * (allocItem.value / com.value));
      }, 0);

      const available =
        c.valueReceived -
        saferecolhimentos.filter(r => r.creditId === c.id).reduce((a, b) => a + b.value, 0) -
        (spent - cancelled);

      sectionAvailableMap[c.section] =
        (sectionAvailableMap[c.section] || 0) + available;
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
  }, [
    safecreditos,
    safeempenhos,
    saferecolhimentos,
    safeanulacoes_empenho,
    filters
  ]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);

  const selectedDetailCredit =
    safecreditos.find(c => c.id === detailCreditId);

  const getIndividualNCBalance = (credit: Credit) => {
    const totalSpent = safeempenhos.reduce((acc, com) => {
      const alloc = com.allocations?.find(a => a.creditId === credit.id);
      return acc + (alloc ? alloc.value : 0);
    }, 0);

    const refunded = saferecolhimentos
      .filter(ref => ref.creditId === credit.id)
      .reduce((a, b) => a + b.value, 0);

    const cancelled = safeanulacoes_empenho.reduce((acc, can) => {
      const com = safeempenhos.find(c => c.id === can.commitmentId);
      if (!com) return acc;
      const alloc = com.allocations?.find(a => a.creditId === credit.id);
      if (!alloc) return acc;
      return acc + (can.value * (alloc.value / com.value));
    }, 0);

    return parseFloat(
      (credit.valueReceived - totalSpent - refunded + cancelled).toFixed(2)
    );
  };

  const creditrecolhimentos = selectedDetailCredit
    ? saferecolhimentos.filter(r => r.creditId === selectedDetailCredit.id)
    : [];

  const creditAllocations = selectedDetailCredit
    ? safeempenhos.flatMap(com => {
        const alloc = com.allocations?.find(
          a => a.creditId === selectedDetailCredit.id
        );
        return alloc
          ? [{ ne: com.ne, value: alloc.value, date: com.date, id: com.id }]
          : [];
      })
    : [];

  /* 🔻 JSX ORIGINAL MANTIDO (SEM ALTERAÇÕES) */
  return (
    <>
      {/* JSX permanece exatamente igual ao seu código */}
    </>
  );
};

export default Dashboard;
