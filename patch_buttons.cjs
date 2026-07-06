const fs = require('fs');
let code = fs.readFileSync('components/DeliveryTracking.tsx', 'utf8');

code = code.replace(
  `                                    <button
                                      onClick={() => handleDeleteContact(com, contact.id)}`,
  `                                    {canEditItem(com.section) && (
                                    <button
                                      onClick={() => handleDeleteContact(com, contact.id)}`
);

code = code.replace(
  `                                      <Trash2 size={14} />
                                    </button>
                                  </div>`,
  `                                      <Trash2 size={14} />
                                    </button>
                                    )}
                                  </div>`
);

code = code.replace(
  `                                    <button
                                      onClick={() => startEditingContact(contact)}`,
  `                                    {canEditItem(com.section) && (
                                    <button
                                      onClick={() => startEditingContact(contact)}`
);

code = code.replace(
  `                                      <Edit3 size={14} />
                                    </button>`,
  `                                      <Edit3 size={14} />
                                    </button>
                                    )}`
);

code = code.replace(
  `                              <button onClick={() => handleRemoveMaterialArrival(com, arrival.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>`,
  `                              {canEditItem(com.section) && (
                              <button onClick={() => handleRemoveMaterialArrival(com, arrival.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                              )}`
);

fs.writeFileSync('components/DeliveryTracking.tsx', code);
console.log('Patched buttons');
