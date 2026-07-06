const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  `  const handleAddCommitment = async (newCom: Commitment) => {
    const nextComs = [...commitments, newCom];
    setCommitments(nextComs);
    localStorage.setItem('budget_commitments', JSON.stringify(nextComs));
    if (isOnline) {
      try {
        await api.upsert('commitments', newCom);
        await sendNotification('ALMOXARIFADO', 'Novo Empenho', \`Empenho \${newCom.ne} registrado no valor de R$ \${Number(newCom.value).toLocaleString('pt-BR')}.\`);
        await sendNotification('CONFORMADOR', 'Novo Empenho', \`Empenho \${newCom.ne} registrado no valor de R$ \${Number(newCom.value).toLocaleString('pt-BR')}.\`);
        syncWithServer();`,
  `  const handleAddCommitment = async (newCom: Commitment) => {
    const nextComs = [...commitments, newCom];
    setCommitments(nextComs);
    localStorage.setItem('budget_commitments', JSON.stringify(nextComs));
    if (isOnline) {
      try {
        await api.upsert('commitments', newCom);
        const credit = credits.find(c => c.id === newCom.creditId);
        await sendNotification('ALMOXARIFADO', 'Novo Empenho', \`Empenho \${newCom.ne} registrado no valor de R$ \${Number(newCom.value).toLocaleString('pt-BR')}.\`, credit?.section);
        syncWithServer();`
);

fs.writeFileSync('App.tsx', code);
console.log('Patched handleAddCommitment');
