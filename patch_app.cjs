const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /userSection=\{currentUser\.assignedSection\}/g,
  "userSections={currentUser.assignedSections}"
);

fs.writeFileSync('App.tsx', code);
console.log('Patched App.tsx for assignedSections');
