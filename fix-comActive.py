import re

with open('components/LiquidationTracking.tsx', 'r') as f:
    content = f.read()

content = content.replace("          const comActiveValue = pendingCommitments.find((c: any) => c.id === id)?.activeValue || 0; // Wait, this doesn't work, we grouped by ne_ug. \n          // Let's compute comActiveValue again:\n", "")

with open('components/LiquidationTracking.tsx', 'w') as f:
    f.write(content)
