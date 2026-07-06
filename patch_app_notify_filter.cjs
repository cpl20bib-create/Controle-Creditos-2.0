const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  "  const userNotifications = auditLogs.filter(log => log.action === 'NOTIFICATION' && (log.entityType === currentUser.role || log.entityType === 'ALL'));",
  `  const userNotifications = auditLogs.filter(log => {
    if (log.action !== 'NOTIFICATION') return false;
    if (log.entityType === 'ALL') return true;
    if (log.entityType !== currentUser.role) return false;
    
    try {
      const parsed = JSON.parse(log.description);
      if (parsed.section && currentUser.role === 'ALMOXARIFADO') {
        if (!currentUser.assignedSections || currentUser.assignedSections.length === 0) return true;
        return currentUser.assignedSections.includes(parsed.section);
      }
    } catch (e) {}
    return true;
  });`
);

fs.writeFileSync('App.tsx', code);
console.log('Patched userNotifications filter');
