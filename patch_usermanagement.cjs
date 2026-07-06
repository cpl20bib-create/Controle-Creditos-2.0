const fs = require('fs');
let code = fs.readFileSync('components/UserManagement.tsx', 'utf8');

code = code.replace(
  /assignedSection:\s*''/g,
  "assignedSections: []"
);

code = code.replace(
  /assignedSection:\s*user\.assignedSection\s*\|\|\s*''/g,
  "assignedSections: user.assignedSections || []"
);

code = code.replace(
  /assignedSection:\s*formData\.assignedSection\s*\|\|\s*undefined/g,
  "assignedSections: formData.assignedSections?.length ? formData.assignedSections : undefined"
);

code = code.replace(
  /Seção:\s*\{user\.assignedSection\s*\|\|\s*'Todas'\}/g,
  "Seções: {user.assignedSections?.length ? user.assignedSections.join(', ') : 'Todas'}"
);

code = code.replace(
  `                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500 text-black"
                    value={formData.assignedSection || ''}
                    onChange={e => setFormData({...formData, assignedSection: e.target.value})}
                  >
                    <option value="">Todas as Seções (Liberado)</option>
                    {SECTION_OPTIONS.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>`,
  `                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={!formData.assignedSections || formData.assignedSections.length === 0}
                        onChange={() => setFormData({...formData, assignedSections: []})}
                        className="rounded text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold uppercase">Todas as Seções (Liberado)</span>
                    </label>
                    <div className="h-px bg-slate-200 my-1"></div>
                    {SECTION_OPTIONS.map(sec => (
                      <label key={sec} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.assignedSections?.includes(sec) || false}
                          onChange={(e) => {
                            let curr = formData.assignedSections || [];
                            if (e.target.checked) {
                              curr = [...curr, sec];
                            } else {
                              curr = curr.filter(s => s !== sec);
                            }
                            setFormData({...formData, assignedSections: curr});
                          }}
                          className="rounded text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold uppercase text-slate-700">{sec}</span>
                      </label>
                    ))}
                  </div>`
);

fs.writeFileSync('components/UserManagement.tsx', code);
console.log('Patched UserManagement.tsx');
