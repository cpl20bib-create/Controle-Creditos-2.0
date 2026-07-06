const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  `  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'tracking', label: 'Acompanhamento', icon: PackageSearch, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO'] },
    { id: 'liquidations', label: 'Liquidação', icon: CheckCircle, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'credits', label: 'Créditos', icon: ReceiptText, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'commitments', label: 'Empenhos', icon: TrendingDown, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'contracts', label: 'Contratos', icon: Briefcase, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'reports', label: 'Relatórios', icon: FilePieChart, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'audit', label: 'Auditoria', icon: History, roles: ['ADMIN'] },
    { id: 'users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  ] as const;`,
  `  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'tracking', label: 'Acompanhamento', icon: PackageSearch, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'liquidations', label: 'Liquidação', icon: CheckCircle, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'credits', label: 'Créditos', icon: ReceiptText, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'commitments', label: 'Empenhos', icon: TrendingDown, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'contracts', label: 'Contratos', icon: Briefcase, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'reports', label: 'Relatórios', icon: FilePieChart, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'audit', label: 'Auditoria', icon: History, roles: ['ADMIN'] },
    { id: 'users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  ] as const;`
);

fs.writeFileSync('App.tsx', code);
console.log('Patched App.tsx menuItems');
