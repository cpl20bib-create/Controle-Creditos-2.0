import re

with open('components/ProcessMetricsModal.tsx', 'r') as f:
    content = f.read()

old_process = """  const processItems = useMemo(() => {
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
  }, [commitments, credits]);"""


new_process = """  const processItems = useMemo(() => {
    const itemsMap = new Map<string, {
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
    }>();

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
          const key = `${com.ne}_${ug}_${arr.id}`;
          if (!itemsMap.has(key)) {
            itemsMap.set(key, {
              id: key,
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
          }
        });
      } else {
        const key = `${com.ne}_${ug}`;
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            id: key,
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
      }
    });

    return Array.from(itemsMap.values());
  }, [commitments, credits]);"""

content = content.replace(old_process, new_process)

with open('components/ProcessMetricsModal.tsx', 'w') as f:
    f.write(content)
