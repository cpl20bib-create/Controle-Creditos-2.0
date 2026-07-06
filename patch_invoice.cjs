const fs = require('fs');
let code = fs.readFileSync('components/DeliveryTracking.tsx', 'utf8');

code = code.replace(
  `const inv = (document.getElementById(\`invoice-ord-\${com.id}\`) as HTMLInputElement)?.value;
                              handleToggleMaterialArrived(com, inv);`,
  `const inv = (document.getElementById(\`invoice-ord-\${com.id}\`) as HTMLInputElement)?.value;
                              if (!inv || !inv.trim()) {
                                alert('A Nota Fiscal é obrigatória para confirmar o recebimento.');
                                return;
                              }
                              handleToggleMaterialArrived(com, inv);`
);

code = code.replace(
  `const inv = (document.getElementById(\`invoice-global-\${com.id}\`) as HTMLInputElement).value;
                              handleAddMaterialArrival(com, dt, vl, inv);`,
  `const inv = (document.getElementById(\`invoice-global-\${com.id}\`) as HTMLInputElement).value;
                              if (!inv || !inv.trim()) {
                                alert('A Nota Fiscal é obrigatória para o recebimento.');
                                return;
                              }
                              handleAddMaterialArrival(com, dt, vl, inv);`
);

fs.writeFileSync('components/DeliveryTracking.tsx', code);
console.log('Patched invoice required');
