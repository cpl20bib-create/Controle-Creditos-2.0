const fs = require('fs');
let code = fs.readFileSync('components/LiquidationTracking.tsx', 'utf8');

code = code.replace(
  "  onUpdateCommitment: (updated: Commitment) => void;\n}",
  "  onUpdateCommitment: (updated: Commitment) => void;\n  userRole?: string;\n}"
);

code = code.replace(
  "const LiquidationTracking: React.FC<LiquidationTrackingProps> = ({ commitments, cancellations, credits, onUpdateCommitment }) => {",
  "const LiquidationTracking: React.FC<LiquidationTrackingProps> = ({ commitments, cancellations, credits, onUpdateCommitment, userRole }) => {\n  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR' || userRole === 'FINANCEIRO';"
);

// We need to hide the buttons for Liquidation action if !canEdit
code = code.replace(
  `                      <button
                        onClick={() => handleLiquidation(group.ne, group.type)}
                        className="w-full mt-4 py-2 bg-emerald-50 text-emerald-700 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                      >`,
  `                      {canEdit && (
                      <button
                        onClick={() => handleLiquidation(group.ne, group.type)}
                        className="w-full mt-4 py-2 bg-emerald-50 text-emerald-700 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                      >`
);
code = code.replace(
  `                        Liquidar
                      </button>`,
  `                        Liquidar
                      </button>
                      )}`
);

code = code.replace(
  `                      <button
                        onClick={() => handleDeleteLiquidation(group.ne, liq.id, group.type)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >`,
  `                      {canEdit && (
                      <button
                        onClick={() => handleDeleteLiquidation(group.ne, liq.id, group.type)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >`
);
code = code.replace(
  `                        <Trash2 size={14} />
                      </button>`,
  `                        <Trash2 size={14} />
                      </button>
                      )}`
);

fs.writeFileSync('components/LiquidationTracking.tsx', code);

// App.tsx patch
let appCode = fs.readFileSync('App.tsx', 'utf8');
appCode = appCode.replace(
  "<LiquidationTracking commitments={commitments} cancellations={cancellations} credits={credits} onUpdateCommitment={handleUpdateCommitment} />",
  "<LiquidationTracking commitments={commitments} cancellations={cancellations} credits={credits} onUpdateCommitment={handleUpdateCommitment} userRole={currentUser.role} />"
);
fs.writeFileSync('App.tsx', appCode);

console.log('Patched liquidations');
