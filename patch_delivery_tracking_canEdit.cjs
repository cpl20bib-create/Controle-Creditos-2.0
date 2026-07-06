const fs = require('fs');
let code = fs.readFileSync('components/DeliveryTracking.tsx', 'utf8');

code = code.replace(
  "  const [showMetricsModal, setShowMetricsModal] = useState(false);",
  `  const [showMetricsModal, setShowMetricsModal] = useState(false);

  const canEditItem = (itemSection: string) => {
    if (userRole === 'ADMIN' || userRole === 'EDITOR') return true;
    if (userRole === 'ALMOXARIFADO') {
      if (!userSections || userSections.length === 0) return true;
      return userSections.includes(itemSection);
    }
    return false;
  };`
);

code = code.replace(
  "(!com.materialArrivedDate || userRole === 'ADMIN') && (",
  "(!com.materialArrivedDate || userRole === 'ADMIN') && canEditItem(com.section) && ("
);

code = code.replace(
  `<button onClick={() => setEditingContactId(contact.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => handleDeleteContact(com, contact.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={14} />
                                </button>`,
  `{canEditItem(com.section) && (
                                  <>
                                    <button onClick={() => setEditingContactId(contact.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                      <Edit3 size={14} />
                                    </button>
                                    <button onClick={() => handleDeleteContact(com, contact.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}`
);

// Toggle material arrived button
code = code.replace(
  `<div className="flex gap-2">
                        <button 
                          onClick={() => handleToggleMaterialArrived(com, prompt('Nº da Nota Fiscal (opcional):') || undefined)}
                          className={\`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all \${com.materialArrivedDate ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95'}\`}
                        >`,
  `<div className="flex gap-2">
                        {canEditItem(com.section) && (
                          <button 
                            onClick={() => handleToggleMaterialArrived(com, prompt('Nº da Nota Fiscal (opcional):') || undefined)}
                            className={\`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all \${com.materialArrivedDate ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95'}\`}
                          >
                            {com.materialArrivedDate ? 'Desfazer Recebimento (Total)' : 'Receber Material (Total)'}
                          </button>
                        )}`
);
code = code.replace(
  `{com.materialArrivedDate ? 'Desfazer Recebimento (Total)' : 'Receber Material (Total)'}
                        </button>`,
  ``
);

code = code.replace(
  `                        {!com.materialArrivedDate && (
                          <button 
                            onClick={() => setAddingPartial(addingPartial === com.id ? null : com.id)}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                          >
                            Entrada Parcial
                          </button>
                        )}`,
  `                        {!com.materialArrivedDate && canEditItem(com.section) && (
                          <button 
                            onClick={() => setAddingPartial(addingPartial === com.id ? null : com.id)}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                          >
                            Entrada Parcial
                          </button>
                        )}`
);

code = code.replace(
  `                            <button onClick={() => handleRemoveMaterialArrival(com, arr.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                              <Trash2 size={14} />
                            </button>`,
  `                            {canEditItem(com.section) && (
                              <button onClick={() => handleRemoveMaterialArrival(com, arr.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                <Trash2 size={14} />
                              </button>
                            )}`
);


// ProcessTrackingModals edit:
// Wait, ProcessTrackingModals edit is for ALMOXARIFADO as a whole (DIEx remessa).
// Are they restricted by section there too?
// Yes, they should only be able to send DIEx for things in their sections!
// But ProcessTrackingModals shows ALL pending items. We need to pass userSections to ProcessTrackingModals so it only shows items they can edit!

fs.writeFileSync('components/DeliveryTracking.tsx', code);
console.log('Patched DeliveryTracking part 2');
