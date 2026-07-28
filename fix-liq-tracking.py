import re

with open('components/LiquidationTracking.tsx', 'r') as f:
    content = f.read()

# Add handleDeleteLiquidation
handle_delete_str = """  const handleDeleteLiquidation = (groupId: string, liquidationId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta liquidação?')) return;
    
    const group = allGroupedCommitments.find(g => g.id === groupId);
    if (!group) return;

    group.originalIds.forEach((id: string) => {
      const com = commitments.find(c => c.id === id);
      if (com && com.liquidations) {
        const hasLiq = com.liquidations.some((l: any) => l.id === liquidationId);
        if (hasLiq) {
           const updatedLiquidations = com.liquidations.filter((l: any) => l.id !== liquidationId);
           onUpdateCommitment({
             ...com,
             liquidations: updatedLiquidations
           });
        }
      }
    });
  };
"""

content = content.replace("const LiquidationTracking: React.FC<LiquidationTrackingProps> = ({ commitments, cancellations, credits, onUpdateCommitment, userRole }) => {", 
"const LiquidationTracking: React.FC<LiquidationTrackingProps> = ({ commitments, cancellations, credits, onUpdateCommitment, userRole }) => {\n" + handle_delete_str)

# Update "Valor do Empenho" to subtract cancellations
content = content.replace("""<span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor do Empenho</span>
                          <span className="text-sm font-black text-slate-700">{formatCurrency(com.value)}</span>""",
"""<span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Líquido do Empenho</span>
                          <span className="text-sm font-black text-slate-700">{formatCurrency(com.value - com.totalCancellations)}</span>""")

# Update liquidations map to include delete button
old_liq_map = """                              {com.liquidations.map((l: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-medium">{formatDateBR(l.date)} - {l.ns}</span>
                                  <span className="font-bold text-emerald-600">{formatCurrency(l.value)}</span>
                                </div>
                              ))}"""

new_liq_map = """                              {com.liquidations.map((l: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                  <span className="text-slate-500 font-medium">{formatDateBR(l.date)} - {l.ns}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-emerald-600">{formatCurrency(l.value)}</span>
                                    {(userRole === 'ADMIN' || userRole === 'FINANCEIRO') && (
                                      <button onClick={() => handleDeleteLiquidation(com.id, l.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}"""

content = content.replace(old_liq_map, new_liq_map)

# Add Trash2 import if missing
if "Trash2" not in content[:500]:
    content = content.replace("import { Search,", "import { Search, Trash2,")

with open('components/LiquidationTracking.tsx', 'w') as f:
    f.write(content)
