const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetToRemove = `  const [showNotifications, setShowNotifications] = useState(false);`;
code = code.replace(targetToRemove, ``);

const targetToInsert = `  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);`;
code = code.replace(targetToInsert, `  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);\n  const [showNotifications, setShowNotifications] = useState(false);`);

fs.writeFileSync('App.tsx', code);
console.log('Fixed hooks order');
