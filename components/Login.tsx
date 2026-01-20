
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Landmark, Lock, User as UserIcon, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  setUsers: (users: User[]) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, setUsers }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Criar administrador inicial caso não exista nenhum usuário
  useEffect(() => {
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: 'admin-1',
        username: 'admin',
        password: '123', // Em produção, mude isso imediatamente
        role: 'ADMIN',
        name: 'Administrador Mestre'
      };
      setUsers([defaultAdmin]);
    }
  }, [users, setUsers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = users.find(u => u.username === username.toLowerCase() && u.password === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Usuário ou senha inválidos. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-900 rounded-full blur-[100px] opacity-20"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-800 rounded-full blur-[100px] opacity-20"></div>

      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-emerald-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-6">
            <Landmark size={48} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-2">
            20º Batalhão de Infantaria Blindado
          </h1>
          <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">
            SISTEMA DE CONTROLE ORÇAMENTÁRIO SALC
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-emerald-900/50">
          <div className="flex items-center gap-2 mb-8 border-b border-slate-100 pb-4">
            <ShieldCheck className="text-emerald-600" size={20} />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Identificação Militar</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-center gap-3 animate-shake">
                <AlertCircle size={18} />
                <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário / Login</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-12 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  placeholder="Seu login"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-12 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              Acessar Sistema
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Uso restrito e monitorado
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-emerald-100/30 font-bold uppercase tracking-widest">
            © 2026 - Logística BIB 20
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
