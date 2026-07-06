const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  "  const sendNotification = async (targetRole: string, title: string, message: string) => {",
  "  const sendNotification = async (targetRole: string, title: string, message: string, section?: string) => {"
);

code = code.replace(
  "      description: JSON.stringify({ title, message, readBy: [] }),",
  "      description: JSON.stringify({ title, message, readBy: [], section }),"
);

code = code.replace(
  `        await sendNotification('ALMOXARIFADO', 'Novo Recurso', \`Recurso \${newCredit.nc} recebido com saldo R$ \${Number(newCredit.valueReceived).toLocaleString('pt-BR')}.\`);
        await sendNotification('CONFORMADOR', 'Novo Recurso', \`Recurso \${newCredit.nc} recebido com saldo R$ \${Number(newCredit.valueReceived).toLocaleString('pt-BR')}.\`);`,
  `        await sendNotification('ALMOXARIFADO', 'Novo Recurso', \`Recurso \${newCredit.nc} recebido com saldo R$ \${Number(newCredit.valueReceived).toLocaleString('pt-BR')}.\`, newCredit.section);`
);

// We need to also patch handleAddCommitment, handleAddRefund, handleAddCancellation

fs.writeFileSync('App.tsx', code);
console.log('Patched App.tsx notifications signature');
