const fs = require('fs');
let code = fs.readFileSync('components/UserManagement.tsx', 'utf8');

code = code.replace(
  `                    <option value="VIEWER">Visualizador</option>
                    <option value="EDITOR">Editor</option>
                    <option value="ALMOXARIFADO">Almoxarifado</option>
                    <option value="ADMIN">Administrador</option>`,
  `                    <option value="VIEWER">Visualizador</option>
                    <option value="EDITOR">Editor</option>
                    <option value="ALMOXARIFADO">Almoxarifado</option>
                    <option value="CONFORMADOR">Conformador</option>
                    <option value="FINANCEIRO">Financeiro</option>
                    <option value="ADMIN">Administrador</option>`
);

code = code.replace(
  `      case 'ALMOXARIFADO': return 'Almoxarifado';
      default: return 'Visualizador';`,
  `      case 'ALMOXARIFADO': return 'Almoxarifado';
      case 'CONFORMADOR': return 'Conformador';
      case 'FINANCEIRO': return 'Financeiro';
      default: return 'Visualizador';`
);

code = code.replace(
  `      case 'ALMOXARIFADO': return <UserIcon className="text-blue-500" size={14} />;
      default: return <UserIcon className="text-slate-400" size={14} />;`,
  `      case 'ALMOXARIFADO': return <UserIcon className="text-blue-500" size={14} />;
      case 'CONFORMADOR': return <UserIcon className="text-orange-500" size={14} />;
      case 'FINANCEIRO': return <UserIcon className="text-purple-500" size={14} />;
      default: return <UserIcon className="text-slate-400" size={14} />;`
);

fs.writeFileSync('components/UserManagement.tsx', code);
console.log('Patched UserManagement.tsx');
