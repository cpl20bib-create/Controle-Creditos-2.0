function getStatus(com, balance, liquidatedTotal) {
  const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
  let statusStr = '';
  let since = null;
  let responsible = '';
  let stage = '';

  if (isGlobal) {
    const arrivals = com.materialArrivals || [];
    const totalArrived = arrivals.reduce((sum, a) => sum + a.value, 0);
    const confDocArrivals = arrivals.filter(a => a.sentToConfDocDate && !a.sentToFinanceDate);
    const unforwardedArrivals = arrivals.filter(a => !a.sentToConfDocDate);
    // for finance, we can't easily know which arrival is liquidated. 
    // If total sent to finance > liquidatedTotal, something is pending in finance.
    const financeArrivals = arrivals.filter(a => a.sentToFinanceDate);
    const totalSentToFinance = financeArrivals.reduce((sum, a) => sum + a.value, 0);
    const totalSentToConfDoc = arrivals.filter(a => a.sentToConfDocDate).reduce((sum, a) => sum + a.value, 0);

    if (liquidatedTotal >= balance && balance > 0) {
      statusStr = 'Totalmente Liquidado';
      responsible = 'Financeiro';
      since = com.liquidationDate || null;
      stage = 'liquidado';
    } else if (totalSentToFinance > liquidatedTotal) {
      statusStr = 'Com o Setor Financeiro (Parcial)';
      responsible = 'Setor Financeiro';
      since = financeArrivals.map(a => a.sentToFinanceDate).sort()[0];
      stage = 'financeiro';
    } else if (confDocArrivals.length > 0) {
      statusStr = 'Com o Conf. Doc. (Parcial)';
      responsible = 'Conf. Doc.';
      since = confDocArrivals.map(a => a.sentToConfDocDate).sort()[0];
      stage = 'confdoc';
    } else if (unforwardedArrivals.length > 0) {
      statusStr = 'Recebimento Confirmado (Parcial)';
      responsible = 'Almoxarifado';
      since = unforwardedArrivals.map(a => a.date).sort()[0];
      stage = 'recebido';
    } else if (com.sentToCompanyDate) {
      statusStr = 'Enviado para Empresa (Aguardando Entrega)';
      responsible = 'Empresa';
      since = com.sentToCompanyDate;
      stage = 'empresa';
    } else {
      statusStr = 'Aguardando Envio / Entrega';
      responsible = 'Almoxarifado';
      since = com.date;
      stage = 'almoxarifado';
    }
  } else {
    if (com.liquidationNs) {
      statusStr = 'Liquidado';
      responsible = 'Financeiro';
      since = com.liquidationDate;
      stage = 'liquidado';
    } else if (com.sentToFinanceDate) {
      statusStr = 'Com o Setor Financeiro';
      responsible = 'Setor Financeiro';
      since = com.sentToFinanceDate;
      stage = 'financeiro';
    } else if (com.sentToConfDocDate) {
      statusStr = 'Com o Conf. Doc.';
      responsible = 'Conf. Doc.';
      since = com.sentToConfDocDate;
      stage = 'confdoc';
    } else if (com.materialArrivedDate) {
      statusStr = 'Recebimento Confirmado';
      responsible = 'Almoxarifado';
      since = com.materialArrivedDate;
      stage = 'recebido';
    } else if (com.sentToCompanyDate) {
      statusStr = 'Enviado para Empresa (Aguardando Entrega)';
      responsible = 'Empresa';
      since = com.sentToCompanyDate;
      stage = 'empresa';
    } else {
      statusStr = 'Aguardando Envio / Entrega';
      responsible = 'Almoxarifado';
      since = com.date;
      stage = 'almoxarifado';
    }
  }

  let days = 0;
  if (since && stage !== 'liquidado') {
    const d = new Date(since);
    d.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    days = Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
  }

  return { statusStr, responsible, since, days, stage };
}
console.log(getStatus({ type: 'Ordinário', date: '2026-07-01' }, 100, 0));
