import re

with open('components/ProcessTrackingModals.tsx', 'r') as f:
    content = f.read()

old_groups = """  const pendingItems = useMemo(() => {
    const groups: Record<string, {
      id: string; // ug_ne
      ne: string;
      ug: string;
      type: string;
      invoices: string[];
      value: number;
      date: string;
      items: Array<{ commitmentId: string; arrivalId?: string }>;
    }> = {};

    commitments.forEach((com: any) => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const groupKey = `${com.ug || 'N/A'}_${com.ne}`;

      const addGroupItem = (type: string, invoice: string, value: number, arrivalId: string | undefined, date: string) => {
        if (!groups[groupKey]) {
          groups[groupKey] = {
            id: groupKey,
            ne: com.ne,
            ug: com.ug || 'N/A',
            type: isGlobal ? 'Parcial' : 'Ordinário',
            invoices: [],
            value: 0,
            date: date,
            items: []
          };
        }
        
        if (invoice && invoice !== 'S/N' && !groups[groupKey].invoices.includes(invoice)) {
          groups[groupKey].invoices.push(invoice);
        }
        
        groups[groupKey].value += value;
        groups[groupKey].items.push({ commitmentId: com.id, arrivalId });
        
        // Update to earliest date
        if (new Date(date) < new Date(groups[groupKey].date)) {
          groups[groupKey].date = date;
        }
      };"""

new_groups = """  const pendingItems = useMemo(() => {
    const groups: Record<string, {
      id: string; // ug_ne
      ne: string;
      ug: string;
      type: string;
      invoices: string[];
      value: number;
      date: string;
      items: Array<{ commitmentId: string; arrivalId?: string }>;
      addedArrivals: Set<string>;
      addedCommitments: Set<string>;
    }> = {};

    commitments.forEach((com: any) => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const groupKey = `${com.ug || 'N/A'}_${com.ne}`;

      const addGroupItem = (type: string, invoice: string, value: number, arrivalId: string | undefined, date: string) => {
        if (!groups[groupKey]) {
          groups[groupKey] = {
            id: groupKey,
            ne: com.ne,
            ug: com.ug || 'N/A',
            type: isGlobal ? 'Parcial' : 'Ordinário',
            invoices: [],
            value: 0,
            date: date,
            items: [],
            addedArrivals: new Set(),
            addedCommitments: new Set()
          };
        }
        
        if (invoice && invoice !== 'S/N' && !groups[groupKey].invoices.includes(invoice)) {
          groups[groupKey].invoices.push(invoice);
        }
        
        if (arrivalId) {
          if (!groups[groupKey].addedArrivals.has(arrivalId)) {
            groups[groupKey].value += value;
            groups[groupKey].addedArrivals.has(arrivalId); // Wait, this should be .add(arrivalId)
          }
        } else {
          if (!groups[groupKey].addedCommitments.has(com.id)) {
            groups[groupKey].value += value;
            groups[groupKey].addedCommitments.has(com.id); // Wait, this should be .add(com.id)
          }
        }

        groups[groupKey].items.push({ commitmentId: com.id, arrivalId });
        
        // Update to earliest date
        if (new Date(date) < new Date(groups[groupKey].date)) {
          groups[groupKey].date = date;
        }
      };"""

# Fixing the typo in my thought above:
new_groups = new_groups.replace("groups[groupKey].addedArrivals.has(arrivalId); // Wait, this should be .add(arrivalId)", "groups[groupKey].addedArrivals.add(arrivalId);")
new_groups = new_groups.replace("groups[groupKey].addedCommitments.has(com.id); // Wait, this should be .add(com.id)", "groups[groupKey].addedCommitments.add(com.id);")

content = content.replace(old_groups, new_groups)

old_ord = """        } else {
          if (com.materialArrivedDate && !com.sentToConfDocDate) {
            const arr = com.materialArrivals?.[0];
            const invoice = arr?.invoice || com.invoice || 'S/N';
            const value = arr?.value || com.activeValue || com.value;
            addGroupItem('Ordinário', invoice, value, undefined, com.materialArrivedDate);
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
            addGroupItem('Ordinário', invoice, value, undefined, com.sentToConfDocDate);
          }
        }
      }"""

new_ord = """        } else {
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

content = content.replace(old_ord, new_ord)

with open('components/ProcessTrackingModals.tsx', 'w') as f:
    f.write(content)

