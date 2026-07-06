const fs = require('fs');
let code = fs.readFileSync('components/CommitmentForm.tsx', 'utf8');

const target1 = `  const isBalanceInsufficient = selectedCell && formData.totalValue > 0 && selectedNotesBalance < formData.totalValue;`;

const replacement1 = `  const originalTotalValue = useMemo(() => {
    return originalCommitments.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [originalCommitments]);

  const originalCellId = useMemo(() => {
    if (initialData && credits.length > 0) {
      const credit = credits.find(c => c.id === initialData.creditId);
      if (credit) {
        return \`\${credit.pi}-\${credit.nd}-\${credit.fonte}-\${credit.ptres}-\${credit.esfera}-\${credit.ugr}\`;
      }
    }
    return '';
  }, [initialData, credits]);

  const isValueUnchanged = originalCommitments.length > 0 
    && Math.abs(formData.totalValue - originalTotalValue) < 0.01 
    && formData.cellId === originalCellId;

  const isBalanceInsufficient = selectedCell && formData.totalValue > 0 && selectedNotesBalance < formData.totalValue && !isValueUnchanged;`;

code = code.replace(target1, replacement1);

const target2 = `      const realBalance = getNCBalance(credit, excludeIds);
      if (realBalance <= 0.01) return;`;

const replacement2 = `      const realBalance = getNCBalance(credit, excludeIds);
      const isOriginalCredit = originalCommitments.some(c => c.creditId === credit.id);
      if (realBalance <= 0.01 && !isOriginalCredit) return;`;

code = code.replace(target2, replacement2);

fs.writeFileSync('components/CommitmentForm.tsx', code);
console.log('Patched');
