const fs = require('fs');
let code = fs.readFileSync('components/DeliveryTracking.tsx', 'utf8');

code = code.replace(
  `                          <input 
                            type="date"
                            value={com.sentToCompanyDate || ''}
                            onChange={(e) => handleUpdateSentDate(com, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                          />`,
  `                          <input 
                            type="date"
                            value={com.sentToCompanyDate || ''}
                            onChange={(e) => handleUpdateSentDate(com, e.target.value)}
                            disabled={!canEditItem(com.section)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                          />`
);

code = code.replace(
  `                          <input 
                            type="date"
                            value={com.receivedFromCompanyDate || ''}
                            onChange={(e) => handleUpdateReceivedDate(com, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                          />`,
  `                          <input 
                            type="date"
                            value={com.receivedFromCompanyDate || ''}
                            onChange={(e) => handleUpdateReceivedDate(com, e.target.value)}
                            disabled={!canEditItem(com.section)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                          />`
);

fs.writeFileSync('components/DeliveryTracking.tsx', code);
console.log('Patched dates');
