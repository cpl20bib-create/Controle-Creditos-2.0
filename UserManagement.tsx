
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Shield, Edit3, X, Save, ShieldAlert, ShieldCheck, User as UserIcon, Eye, EyeOff } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  setUsers: (users: User[]) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPasswordInForm, setShowPasswordInForm] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    name: '',
    role: 'VIEWER',
    password: ''
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ username: '', name: '', role: 'VIEWER', password: '' });
    setShowPasswordInForm(false);
    setShowForm(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      name: user.name,
      role: user.role,
      password: user.password
    });
    setShowPasswordInForm(false);
    setShowForm(true);
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.name) return;

    if (editingId) {
      setUsers(users.map(u => u.id === editingId ? {
        ...u,
        username: (formData.username || '').toLowerCase(),
        name: formData.name || '',
        role: (formData.role as UserRole) || 'VIEWER',
        password: formData.password || ''
      } : u));
    } else {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username: (formData.username || '').toLowerCase(),
        name: formData.name || '',
        role: (formData.role as UserRole) || 'VIEWER',
        password: formData.password || ''
      };
      setUsers([...users, newUser]);
    }
    
    setShowForm(false);
    setFormData({ username: '', name: '', role: 'VIEWER', password: '' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja realmente excluir este usuário?')) {
      if (id === 'admin-1') {
        alert('O administrador mestre não pode ser removido.');
        return;
      }
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return <ShieldAlert className="text-red-500" size={14} />;
      case 'EDITOR': return <ShieldCheck className="text-emerald-500" size={14} />;
      default: return <UserIcon className="text-slate-400" size={14} />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'EDITOR': return 'Editor';
      default: return 'Visualizador';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Gestão de Operadores</h2>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">Controle de acessos e permissões do sistema</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/10 transition-all flex items-center gap-2"
        >
          <UserPlus size={16} /> Cadastrar Operador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-8 -mt-8 -z-10 group-hover:bg-emerald-50 transition-colors"></div>
            
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-lg group-hover:bg-emerald-500 group-hover:text-white transition-all">
                {user.name.charAt(0)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${
                  user.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-100' : 
                  user.role === 'EDITOR' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                  'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                  {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{user.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Login: <span className="text-emerald-600 italic">@{user.username}</span>
              </p>
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl mt-2 border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Chave de Acesso</span>
                  <span className="text-[10px] font-black text-slate-700 font-mono tracking-widest">
                    {visiblePasswords[user.id] ? user.password : '••••••••'}
                  </span>
                </div>
                <button 
                  onClick={() => togglePasswordVisibility(user.id)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                  title={visiblePasswords[user.id] ? "Ocultar Senha" : "Mostrar Senha"}
                >
                  {visiblePasswords[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button 
                onClick={() => handleOpenEdit(user)}
                className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 text-[9px] font-black uppercase tracking-widest transition-all"
              >
                <Edit3 size={14} className="mx-auto" />
              </button>
              <button 
                onClick={() => handleDelete(user.id)}
                className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 text-[9px] font-black uppercase tracking-widest transition-all"
                disabled={user.id === 'admin-1'}
              >
                <Trash2 size={14} className="mx-auto" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="bg-emerald-900 p-8 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black italic uppercase leading-none tracking-tight">
                  {editingId ? 'Editar Operador' : 'Novo Operador'}
                </h3>
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-2 italic">Credenciamento Militar</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Guerra</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500 text-black"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500 text-black"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  >
                    <option value="VIEWER">Visualizador</option>
                    <option value="EDITOR">Editor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário / Login</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-black"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave / Senha</label>
                  <div className="relative">
                    <input 
                      type={showPasswordInForm ? "text" : "password"} 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-black"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {showPasswordInForm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 transition-all flex items-center justify-center gap-3"
              >
                <Save size={18} /> {editingId ? 'Confirmar Alterações' : 'Confirmar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
