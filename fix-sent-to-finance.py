import re

with open('components/LiquidationTracking.tsx', 'r') as f:
    content = f.read()

# Fix NewLiquidationModal pendingCommitments
old_pending = """      const amountSentToFinance = isGlobal 
        ? (com.materialArrivals || []).filter((a: any) => !!a.sentToFinanceDate).reduce((acc: number, a: any) => acc + a.value, 0) 
        : (com.sentToFinanceDate ? (com.materialArrivals?.length ? com.materialArrivals[0].value : com.value) : 0);
        
      const totalLiquidated = (com.liquidations || []).reduce((sum: number, l: any) => sum + l.value, 0)
        + ((com.liquidationNs && !(com.liquidations?.length > 0)) ? amountSentToFinance : 0);"""

new_pending = """      const totalCancellations = cancellations
        .filter((c: Cancellation) => c.commitmentId === com.id)
        .reduce((sum: number, c: Cancellation) => sum + c.value, 0);

      const calculatedAmountSentToFinance = isGlobal 
        ? (com.materialArrivals || []).filter((a: any) => !!a.sentToFinanceDate).reduce((acc: number, a: any) => acc + a.value, 0) 
        : (com.sentToFinanceDate ? (com.materialArrivals?.length ? com.materialArrivals[0].value : com.value) : 0);
      
      const amountSentToFinance = Math.min(calculatedAmountSentToFinance, com.value - totalCancellations);
        
      const totalLiquidated = (com.liquidations || []).reduce((sum: number, l: any) => sum + l.value, 0)
        + ((com.liquidationNs && !(com.liquidations?.length > 0)) ? amountSentToFinance : 0);"""

content = content.replace(old_pending, new_pending, 1) # Only first occurrence

# Fix handleSave
old_save = """          const amountSentToFinance = isGlobal 
            ? (com.materialArrivals || []).filter((a: any) => !!a.sentToFinanceDate).reduce((acc: number, a: any) => acc + a.value, 0) 
            : (com.sentToFinanceDate ? (com.materialArrivals?.length ? com.materialArrivals[0].value : com.value) : 0);
          const totalLiquidated = (com.liquidations || []).reduce((sum: number, l: any) => sum + l.value, 0)
            + ((com.liquidationNs && !(com.liquidations?.length > 0)) ? amountSentToFinance : 0);"""

new_save = """          const totalCancellations = cancellations
            .filter((c: Cancellation) => c.commitmentId === com.id)
            .reduce((sum: number, c: Cancellation) => sum + c.value, 0);
          
          const calculatedAmountSentToFinance = isGlobal 
            ? (com.materialArrivals || []).filter((a: any) => !!a.sentToFinanceDate).reduce((acc: number, a: any) => acc + a.value, 0) 
            : (com.sentToFinanceDate ? (com.materialArrivals?.length ? com.materialArrivals[0].value : com.value) : 0);
          
          const amountSentToFinance = Math.min(calculatedAmountSentToFinance, com.value - totalCancellations);

          const totalLiquidated = (com.liquidations || []).reduce((sum: number, l: any) => sum + l.value, 0)
            + ((com.liquidationNs && !(com.liquidations?.length > 0)) ? amountSentToFinance : 0);"""

content = content.replace(old_save, new_save, 1)

# Fix LiquidationTracking processedCommitments
old_processed = """      const amountSentToFinance = isGlobal 
        ? (com.materialArrivals || []).filter(a => !!a.sentToFinanceDate).reduce((acc: number, a: any) => acc + a.value, 0) 
        : (com.sentToFinanceDate ? (com.materialArrivals?.length ? com.materialArrivals[0].value : com.value) : 0);
        
      const totalLiquidated = (com.liquidations || []).reduce((sum, l) => sum + l.value, 0)
        + ((com.liquidationNs && !(com.liquidations?.length > 0)) ? amountSentToFinance : 0);"""

new_processed = """      const calculatedAmountSentToFinance = isGlobal 
        ? (com.materialArrivals || []).filter(a => !!a.sentToFinanceDate).reduce((acc: number, a: any) => acc + a.value, 0) 
        : (com.sentToFinanceDate ? (com.materialArrivals?.length ? com.materialArrivals[0].value : com.value) : 0);
        
      const amountSentToFinance = Math.min(calculatedAmountSentToFinance, com.value - totalCancellations);

      const totalLiquidated = (com.liquidations || []).reduce((sum, l) => sum + l.value, 0)
        + ((com.liquidationNs && !(com.liquidations?.length > 0)) ? amountSentToFinance : 0);"""

content = content.replace(old_processed, new_processed, 1)

with open('components/LiquidationTracking.tsx', 'w') as f:
    f.write(content)
