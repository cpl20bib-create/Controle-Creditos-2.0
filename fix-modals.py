import re

with open('components/ProcessTrackingModals.tsx', 'r') as f:
    content = f.read()

# Replace the modalType === 'ConfDoc' logic
old_confdoc = """      if (modalType === 'ConfDoc') {
        // Needs to have arrived but not sent to ConfDoc
        if (isGlobal) {
          (com.materialArrivals || []).forEach((arr: any) => {
            if (!arr.sentToConfDocDate) {
              addGroupItem('Parcial', arr.invoice || 'S/N', arr.value, arr.id, arr.date);
            }
          });
        } else {
          if (com.materialArrivedDate && !com.sentToConfDocDate) {
            const arr = com.materialArrivals?.[0];
            const invoice = arr?.invoice || com.invoice || 'S/N';
            const value = arr?.value || com.activeValue || com.value;
            addGroupItem('Ordinário', invoice, value, arr?.id, com.materialArrivedDate);
          }
        }
      } else {
        // Finance: Needs to be in ConfDoc but not sent to Finance
        if (isGlobal) {
          (com.materialArrivals || []).forEach((arr: any) => {
            if (arr.sentToConfDocDate && !arr.sentToFinanceDate) {
              addGroupItem('Parcial', arr.invoice || 'S/N', arr.value, arr.id, arr.sentToConfDocDate);
            }
          });
        } else {
          if (com.sentToConfDocDate && !com.sentToFinanceDate) {
            const arr = com.materialArrivals?.[0];
            const invoice = arr?.invoice || com.invoice || 'S/N';
            const value = arr?.value || com.activeValue || com.value;
            addGroupItem('Ordinário', invoice, value, arr?.id, com.sentToConfDocDate);
          }
        }
      }"""

new_confdoc = """      const typeLabel = isGlobal ? 'Parcial' : 'Ordinário';

      if (modalType === 'ConfDoc') {
        // Needs to have arrived but not sent to ConfDoc
        if (com.materialArrivals && com.materialArrivals.length > 0) {
          com.materialArrivals.forEach((arr: any) => {
            if (!arr.sentToConfDocDate) {
              addGroupItem(typeLabel, arr.invoice || 'S/N', arr.value, arr.id, arr.date);
            }
          });
        } else if (com.materialArrivedDate && !com.sentToConfDocDate) {
          addGroupItem(typeLabel, com.invoice || 'S/N', com.activeValue || com.value, undefined, com.materialArrivedDate);
        }
      } else {
        // Finance: Needs to be in ConfDoc but not sent to Finance
        if (com.materialArrivals && com.materialArrivals.length > 0) {
          com.materialArrivals.forEach((arr: any) => {
            if (arr.sentToConfDocDate && !arr.sentToFinanceDate) {
              addGroupItem(typeLabel, arr.invoice || 'S/N', arr.value, arr.id, arr.sentToConfDocDate);
            }
          });
        } else if (com.sentToConfDocDate && !com.sentToFinanceDate) {
          addGroupItem(typeLabel, com.invoice || 'S/N', com.activeValue || com.value, undefined, com.sentToConfDocDate);
        }
      }"""

content = content.replace(old_confdoc, new_confdoc)

with open('components/ProcessTrackingModals.tsx', 'w') as f:
    f.write(content)
