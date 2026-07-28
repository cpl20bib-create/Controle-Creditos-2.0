import re

with open('components/DeliveryTracking.tsx', 'r') as f:
    content = f.read()

# Map all commitments first for modals, independent of current tab
all_mapped_str = """
  const allMappedCommitments = useMemo(() => {
    return commitments.map((com: any) => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const comCancellations = cancellations.filter((c: any) => c.commitmentId === com.id).reduce((acc: number, c: any) => acc + (Number(c.value) || 0), 0);
      const baseValue = com.value - comCancellations;
      const totalLiquidated = isGlobal 
        ? (com.liquidations || []).reduce((acc: number, l: any) => acc + l.value, 0)
        : (com.liquidationNs ? baseValue : 0);
      return { ...com, activeValue: baseValue - totalLiquidated };
    });
  }, [commitments, cancellations]);
"""

content = content.replace("const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({ credits, commitments, cancellations, onUpdateCommitment, onNotify, userRole, userSections }) => {", 
"const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({ credits, commitments, cancellations, onUpdateCommitment, onNotify, userRole, userSections }) => {\n" + all_mapped_str)

# Update modal calls
content = content.replace("commitments={mappedCommitments.filter(c => canEditItem(c.section))}", "commitments={allMappedCommitments.filter((c: any) => canEditItem(c.section))}")

with open('components/DeliveryTracking.tsx', 'w') as f:
    f.write(content)
