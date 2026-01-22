
import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, ReceiptText, Landmark, FilePieChart, Menu, X, TrendingDown, Users, LogOut, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Credit, Commitment, Refund, Cancellation, Filters, User } from './types';
import Dashboard from './components/Dashboard';
import CreditList from './components/CreditList';
import CommitmentList from './components/CommitmentList';
import Reports from './components/Reports';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import { api } from './api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'credits' | 'commitments' | 'reports' | 'users'>('dashboard');
  
  const [credits, setCredits] = useState<Credit[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [filters, setFilters] = useState<Filters>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncWithServer = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    const connected = await api.checkConnection();
    setIsOnline(connected);

    if (connected) {
      const state = await api.getFullState();
      if (state) {
        setCredits(state.credits);
        setCommitments(state.commitments);
        setRefunds(state.refunds);
        setCancellations(state.cancellations);
        setUsers(state.users);
        
        localStorage.setItem('budget_credits', JSON.stringify(state.credits));
        localStorage.setItem('budget_commitments', JSON.stringify(state.commitments));
        localStorage.setItem('budget_users', JSON.stringify(state.users));
      }
    } else {
      const cachedCredits = localStorage.getItem('budget_credits');
      const cachedComs = localStorage.getItem('budget_commitments');
      const cachedUsers = localStorage.getItem('budget_users');
      if (cachedCredits) setCredits(JSON.parse(cachedCredits));
      if (cachedComs) setCommitments(JSON.parse(cachedComs));
      if (cachedUsers) setUsers(JSON.parse(cachedUsers));
    }
    
    setIsSyncing(false);
  }, [isSyncing]);

  useEffect(() => {
    syncWithServer();
    const unsubscribe = api.subscribeToChanges(() => {
      syncWithServer();
    });
    return () => {
      unsubscribe();
    };
  }, [syncWithServer]);

  useEffect(() => {
    const savedSession = localStorage.getItem('budget_session');
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('budget_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('budget_session');
  };

  const handleAddCredit = async (newCredit: Credit) => {
    try {
      await api.upsert('credits', newCredit);
      syncWithServer();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateCredit = async (updated: Credit) => {
    try {
      await api.upsert('credits', updated);
      syncWithServer();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteCredit = async (id: string) => {
    const credit = credits.find(c => c.id === id);
    if (credit && window.confirm('Excluir este crédito definitivamente?')) {
      try {
        await api.delete('credits', id);
        syncWithServer();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleAddCommitment = async (newCom: Commitment) => {
    try {
      await api.upsert('commitments', newCom);
      syncWithServer();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateCommitment = async (updated: Commitment) => {
    try {
      await api.upsert('commitments', updated);
      syncWithServer();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteCommitment = async (id: string) => {
    const com = commitments.find(c => c.id === id);
    if (com && window.confirm('Excluir este empenho definitivamente?')) {
      try {
        await api.delete('commitments', id);
        syncWithServer();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleAddRefund = async (newRefund: Refund) => {
    try {
      await api.upsert('refunds', newRefund);
      syncWithServer();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddCancellation = async (newCan: Cancellation) => {
    try {
      await api.upsert('cancellations', newCan);
      syncWithServer();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateUsers = async (nextUsers: User[]) => {
    setUsers(nextUsers);
    for (const user of nextUsers) {
      try {
        await api.upsert('users', user);
      } catch (e: any) {
        console.error('Falha ao sincronizar usuário:', user.username, e.message);
      }
    }
    syncWithServer();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'credits', label: 'Créditos', icon: ReceiptText, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'commitments', label: 'Empenhos', icon: TrendingDown, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'reports', label: 'Relatórios', icon: FilePieChart, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  ] as const;

  if (!currentUser) {
    return <Login users={users} setUsers={handleUpdateUsers} onLogin={handleLogin} />;
  }

  const filteredMenuItems = menuItems.filter(item => (item.roles as readonly string[]).includes(currentUser.role));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-black">
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-20'} bg-emerald-950 text-white transition-all duration-300 flex flex-col shrink-0 border-r border-emerald-900 shadow-2xl`}>
        <div className="p-6 flex items-center gap-4 border-b border-emerald-900/50">
          <div className="bg-emerald-500 p-2.5 rounded-xl shrink-0 shadow-lg shadow-emerald-500/20">
            <Landmark size={24} />
          </div>
          {isSidebarOpen && (
            <span className="font-black text-[10px] leading-tight tracking-tight uppercase">
              Controle Orçamentário<br/>
              <span className="text-emerald-400 text-xs">20º Batalhão de Infantaria Blindado</span>
            </span>
          )}
        </div>
        
        <nav className="flex-1 mt-6 px-3 space-y-1.5 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/50 scale-[1.02]' 
                  : 'text-emerald-100/40 hover:bg-emerald-900/50 hover:text-white'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-emerald-500'} />
              {isSidebarOpen && <span className="font-black text-[10px] uppercase tracking-widest">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-900/50 space-y-2">
          {isSidebarOpen && (
            <div className="bg-emerald-900/30 rounded-2xl p-4 mb-2 border border-emerald-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-black text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate">{currentUser.name}</p>
                  <p className="text-[8px] font-bold text-emerald-400 uppercase">{currentUser.role}</p>
                </div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full px-4 py-3 rounded-xl transition-colors">
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="flex items-center gap-4 text-emerald-100/30 hover:text-white w-full px-4 py-3 transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Menu</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h1>
            <button 
              onClick={() => syncWithServer()}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'}`}
            >
              {isSyncing ? <RefreshCw size={10} className="animate-spin" /> : isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isSyncing ? 'Conectando...' : isOnline ? 'Online' : 'Desconectado'}
            </button>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-900 uppercase">{currentUser.name}</p>
              <p className="text-[9px] text-emerald-600 font-bold uppercase italic tracking-widest">BIB 20 - Conexão Direta</p>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {isOnline && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between text-emerald-700 shadow-sm animate-in fade-in zoom-in-95 duration-700">
               <div className="flex items-center gap-3">
                 <CheckCircle size={20} className="text-emerald-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Sincronização com Supabase Real estabelecida com sucesso. Permissões ativas.</span>
               </div>
            </div>
          )}
          {!isOnline && !isSyncing && (
             <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Atenção: Falha na conexão com o banco de dados Supabase. Verifique a URL e a Chave Anon.</span>
                </div>
                <button onClick={() => syncWithServer()} className="text-[9px] font-black bg-red-600 text-white px-4 py-2 rounded-xl uppercase hover:bg-red-700 transition-all shadow-lg">Reconectar</button>
             </div>
          )}
          {activeTab === 'dashboard' && <Dashboard credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} filters={filters} setFilters={setFilters} />}
          {activeTab === 'credits' && <CreditList credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} filters={filters} setFilters={setFilters} onAddCredit={handleAddCredit} onUpdateCredit={handleUpdateCredit} onDeleteCredit={handleDeleteCredit} onAddRefund={handleAddRefund} userRole={currentUser.role} />}
          {activeTab === 'commitments' && <CommitmentList credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} onAdd={handleAddCommitment} onUpdate={handleUpdateCommitment} onDelete={handleDeleteCommitment} onAddCancellation={handleAddCancellation} userRole={currentUser.role} />}
          {activeTab === 'reports' && <Reports credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} />}
          {activeTab === 'users' && currentUser.role === 'ADMIN' && <UserManagement users={users} setUsers={handleUpdateUsers} />}
        </div>
      </main>
    </div>
  );
};

export default App;
