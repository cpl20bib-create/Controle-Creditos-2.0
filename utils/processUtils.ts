export function getProcessStatus(com: any, balance: number, liquidatedTotal: number) {
  const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
  let statusStr = '';
  let since = null;
  let responsible = '';
  let stage = '';

  if (isGlobal) {
    const arrivals = com.materialArrivals || [];
    const totalArrived = arrivals.reduce((sum: number, a: any) => sum + Number(a.value), 0);
    const confDocArrivals = arrivals.filter((a: any) => a.sentToConfDocDate && !a.sentToFinanceDate);
    const unforwardedArrivals = arrivals.filter((a: any) => !a.sentToConfDocDate);
    const financeArrivals = arrivals.filter((a: any) => a.sentToFinanceDate);
    const totalSentToFinance = financeArrivals.reduce((sum: number, a: any) => sum + Number(a.value), 0);
    const totalSentToConfDoc = arrivals.filter((a: any) => a.sentToConfDocDate).reduce((sum: number, a: any) => sum + Number(a.value), 0);

    if (liquidatedTotal >= balance && balance > 0) {
      statusStr = 'Totalmente Liquidado';
      responsible = 'Financeiro';
      since = com.liquidationDate || null;
      stage = 'liquidado';
    } else if (totalSentToFinance > liquidatedTotal) {
      statusStr = 'Com o Setor Financeiro (Parcial)';
      responsible = 'Setor Financeiro';
      since = financeArrivals.map((a: any) => a.sentToFinanceDate).sort()[0];
      stage = 'financeiro';
    } else if (confDocArrivals.length > 0) {
      statusStr = 'Com o Conf. Doc. (Parcial)';
      responsible = 'Conf. Doc.';
      since = confDocArrivals.map((a: any) => a.sentToConfDocDate).sort()[0];
      stage = 'confdoc';
    } else if (unforwardedArrivals.length > 0) {
      statusStr = 'Recebimento Confirmado (Parcial)';
      responsible = 'Almoxarifado';
      since = unforwardedArrivals.map((a: any) => a.date).sort()[0];
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
    const fromDate = new Date(since).getTime();
    const now = new Date().getTime();
    days = Math.floor((now - fromDate) / (1000 * 3600 * 24));
  }

  return { statusStr, responsible, since, stage, days };
}
