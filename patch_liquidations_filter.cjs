const fs = require('fs');
let code = fs.readFileSync('components/LiquidationTracking.tsx', 'utf8');

code = code.replace(
  `        const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
        const isArrived = isGlobal ? (com.materialArrivals?.length || 0) > 0 : !!com.materialArrivedDate;
        if (!isArrived) return false;`,
  `        const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
        let hasSentToFinance = false;
        if (isGlobal) {
          hasSentToFinance = (com.materialArrivals || []).some(arr => !!arr.sentToFinanceDate);
        } else {
          hasSentToFinance = !!com.sentToFinanceDate;
        }
        if (!hasSentToFinance) return false;`
);

fs.writeFileSync('components/LiquidationTracking.tsx', code);
console.log('Patched liquidation filter');
