const fs = require('fs');
let code = fs.readFileSync('components/ProcessTrackingModals.tsx', 'utf8');

code = code.replace(
  "  onUpdateCommitment: (updated: Commitment) => void;\n  onClose: () => void;\n  modalType: 'ConfDoc' | 'Finance';\n}",
  "  onUpdateCommitment: (updated: Commitment) => void;\n  onNotify?: (role: string, title: string, msg: string) => void;\n  onClose: () => void;\n  modalType: 'ConfDoc' | 'Finance';\n}"
);

code = code.replace(
  "export const ProcessTrackingModals: React.FC<ProcessTrackingModalsProps> = ({ commitments, onUpdateCommitment, onClose, modalType }) => {",
  "export const ProcessTrackingModals: React.FC<ProcessTrackingModalsProps> = ({ commitments, onUpdateCommitment, onNotify, onClose, modalType }) => {"
);

code = code.replace(
  "    Object.values(updatesByCommitment).forEach(com => {\n      onUpdateCommitment(com);\n    });",
  "    Object.values(updatesByCommitment).forEach(com => {\n      onUpdateCommitment(com);\n      if (onNotify) {\n         if (modalType === 'ConfDoc') {\n            onNotify('CONFORMADOR', 'Processo Recebido', `Empenho ${com.ne} enviado para Conformidade Documental.`);\n         } else if (modalType === 'Finance') {\n            onNotify('FINANCEIRO', 'Processo Recebido', `Empenho ${com.ne} enviado para o Setor Financeiro.`);\n         }\n      }\n    });"
);

fs.writeFileSync('components/ProcessTrackingModals.tsx', code);
console.log('Patched ProcessTrackingModals');
