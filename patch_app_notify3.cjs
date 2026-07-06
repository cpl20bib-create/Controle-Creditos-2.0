const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  `  const handleAddRefund = async (newRefund: Refund) => {
    const nextR = [...refunds, newRefund];
    setRefunds(nextR);
    if (isOnline) {
      try {
        await api.upsert('refunds', newRefund);
        syncWithServer();`,
  `  const handleAddRefund = async (newRefund: Refund) => {
    const nextR = [...refunds, newRefund];
    setRefunds(nextR);
    if (isOnline) {
      try {
        await api.upsert('refunds', newRefund);
        const credit = credits.find(c => c.id === newRefund.creditId);
        await sendNotification('ALMOXARIFADO', 'Novo Recolhimento', \`Recolhimento registrado no valor de R$ \${Number(newRefund.value).toLocaleString('pt-BR')}.\`, credit?.section);
        syncWithServer();`
);

code = code.replace(
  `  const handleAddCancellation = async (newCan: Cancellation) => {
    const nextC = [...cancellations, newCan];
    setCancellations(nextC);
    if (isOnline) {
      try {
        await api.upsert('cancellations', newCan);
        syncWithServer();`,
  `  const handleAddCancellation = async (newCan: Cancellation) => {
    const nextC = [...cancellations, newCan];
    setCancellations(nextC);
    if (isOnline) {
      try {
        await api.upsert('cancellations', newCan);
        const com = commitments.find(c => c.id === newCan.commitmentId);
        const credit = credits.find(c => c.id === com?.creditId);
        await sendNotification('ALMOXARIFADO', 'Nova Anulação', \`Anulação registrada no valor de R$ \${Number(newCan.value).toLocaleString('pt-BR')}.\`, credit?.section);
        syncWithServer();`
);

fs.writeFileSync('App.tsx', code);
console.log('Patched refund and cancellation');
