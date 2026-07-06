const fs = require('fs');
let code = fs.readFileSync('components/DeliveryTracking.tsx', 'utf8');

code = code.replace(
  "        <ProcessTrackingModals \n          commitments={commitments} \n          onUpdateCommitment={onUpdateCommitment}\n          onNotify={onNotify}\n          onClose={() => setShowConfDocModal(false)}\n          modalType=\"ConfDoc\"\n        />",
  "        <ProcessTrackingModals \n          commitments={mappedCommitments.filter(c => canEditItem(c.section))} \n          onUpdateCommitment={onUpdateCommitment}\n          onNotify={onNotify}\n          onClose={() => setShowConfDocModal(false)}\n          modalType=\"ConfDoc\"\n        />"
);

code = code.replace(
  "        <ProcessTrackingModals \n          commitments={commitments} \n          onUpdateCommitment={onUpdateCommitment}\n          onNotify={onNotify}\n          onClose={() => setShowFinanceModal(false)}\n          modalType=\"Finance\"\n        />",
  "        <ProcessTrackingModals \n          commitments={mappedCommitments.filter(c => canEditItem(c.section))} \n          onUpdateCommitment={onUpdateCommitment}\n          onNotify={onNotify}\n          onClose={() => setShowFinanceModal(false)}\n          modalType=\"Finance\"\n        />"
);

fs.writeFileSync('components/DeliveryTracking.tsx', code);
console.log('Patched ProcessTrackingModals passing');
