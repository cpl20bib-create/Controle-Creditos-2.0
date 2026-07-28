import re

with open('components/LiquidationTracking.tsx', 'r') as f:
    content = f.read()

# Fix handleSave
content = content.replace(
    "if (arrivalsSent === 0 && com.sentToFinanceDate) {",
    "if (!isGlobal && arrivalsSent === 0 && com.sentToFinanceDate) {"
)

# Fix allGroupedCommitments
content = content.replace(
    "legacySentToFinanceDate: com.sentToFinanceDate,",
    "legacySentToFinanceDate: com.sentToFinanceDate,\n          isGlobal: com.type === 'Global' || com.type === 'Estimativo',"
)

# Also fix the fallback in allGroupedCommitments
content = content.replace(
    "if (arrivalsSent === 0 && g.legacySentToFinanceDate) {",
    "if (!g.isGlobal && arrivalsSent === 0 && g.legacySentToFinanceDate) {"
)

with open('components/LiquidationTracking.tsx', 'w') as f:
    f.write(content)
