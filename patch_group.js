const fs = require('fs');
let code = fs.readFileSync('components/LiquidationTracking.tsx', 'utf8');

// Patch eligibleCommitments
const eligibleOriginal = `      })
      .map(com => {
        const totalCancellations = cancellations
          .filter(c => c.commitmentId === com.id)
          .reduce((sum, c) => sum + c.value, 0);
          
        const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
        const totalLiquidated = isGlobal 
          ? (com.liquidations || []).reduce((sum, l) => sum + l.value, 0)
          : (com.liquidationNs ? com.value - totalCancellations : 0);
          
        const daysSinceIssue = Math.floor((new Date().getTime() - new Date(com.date).getTime()) / (1000 * 3600 * 24));
        
        const credit = credits.find(c => c.id === com.creditId);
        
        return { 
          ...com, 
          activeValue: com.value - totalCancellations - totalLiquidated,
          daysSinceIssue,
          section: credit?.section || '',
          pi: credit?.pi || '',
          nd: credit?.nd || '',
          ug: credit?.ug || ''
        };
      });
  }, [commitments, cancellations, credits]);`;

const eligiblePatched = `      })
      .map(com => {
        const totalCancellations = cancellations
          .filter(c => c.commitmentId === com.id)
          .reduce((sum, c) => sum + c.value, 0);
          
        const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
        const totalLiquidated = isGlobal 
          ? (com.liquidations || []).reduce((sum, l) => sum + l.value, 0)
          : (com.liquidationNs ? com.value - totalCancellations : 0);
          
        const daysSinceIssue = Math.floor((new Date().getTime() - new Date(com.date).getTime()) / (1000 * 3600 * 24));
        const credit = credits.find(c => c.id === com.creditId);
        
        return { 
          ...com, 
          activeValue: com.value - totalCancellations - totalLiquidated,
          totalCancellations,
          totalLiquidated,
          daysSinceIssue,
          section: credit?.section || '',
          pi: credit?.pi || '',
          nd: credit?.nd || '',
          ug: credit?.ug || '',
          hasAnyLiquidation: isGlobal ? (com.liquidations && com.liquidations.length > 0) : !!com.liquidationNs
        };
      });

    const grouped = new Map<string, any>();
    processed.forEach(com => {
      const key = \`\${com.ne}_\${com.ug}\`;
      if (!grouped.has(key)) {
        grouped.set(key, { ...com, originalIds: [com.id] });
      } else {
        const existing = grouped.get(key);
        existing.value += com.value;
        existing.activeValue += com.activeValue;
        existing.totalCancellations += com.totalCancellations;
        existing.totalLiquidated += com.totalLiquidated;
        existing.originalIds.push(com.id);
        
        if (com.materialArrivals && com.materialArrivals.length > 0) {
          existing.materialArrivals = [...(existing.materialArrivals || []), ...com.materialArrivals];
        }
        if (com.liquidations && com.liquidations.length > 0) {
          existing.liquidations = [...(existing.liquidations || []), ...com.liquidations];
        }
        if (com.liquidationNs) {
          existing.liquidationNs = existing.liquidationNs ? Array.from(new Set([...existing.liquidationNs.split(', '), com.liquidationNs])).join(', ') : com.liquidationNs;
        }
        if (com.hasAnyLiquidation) existing.hasAnyLiquidation = true;
      }
    });

    return Array.from(grouped.values());
  }, [commitments, cancellations, credits]);`;

code = code.replace(
  "      const isLiquidated = isGlobal ? com.activeValue <= 0 : !!com.liquidationNs;",
  "      const isLiquidated = com.hasAnyLiquidation;"
);

// We need to replace the mapped part properly
code = code.replace(
  "const daysSinceIssue = Math.floor((new Date().getTime() - new Date(com.date).getTime()) / (1000 * 3600 * 24));",
  "const daysSinceIssue = Math.floor((new Date().getTime() - new Date(com.date).getTime()) / (1000 * 3600 * 24));\n        const hasAnyLiquidation = isGlobal ? (com.liquidations && com.liquidations.length > 0) : !!com.liquidationNs;"
);

// We need to write a clean patch script. Let's do it differently.
