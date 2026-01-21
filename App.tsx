
import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, ReceiptText, Landmark, FilePieChart, Menu, X, TrendingDown, Users, LogOut, ShieldCheck, History, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Credit, Commitment, Refund, Cancellation, Filters, User, AuditLog, ActionType, EntityType, UserRole } from './types';
import { INITIAL_CREDITS, INITIAL_COMMITMENTS } from './constants';
import Dashboard from './components/Dashboard';
import CreditList from './components/CreditList';
import CommitmentList from './components/CommitmentList';
import Reports from './components/Reports';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import AuditHistory from './components/AuditHistory';
import { api } from './api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'credits' | 'commitments' | 'reports' | 'users' | 'history'>('dashboard');
  
  const [credits, setCredits] = useState<Credit[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [filters, setFilters] = useState<Filters>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sincronização de Estado - Redesenhada para ser a única fonte de verdade e forçar reconexão
  const syncWithServer = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    // Tenta um "ping" real primeiro para validar as credenciais
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
        setAuditLogs(state.auditLogs);
      }
    } else {
      console.warn('Conexão falhou: SUPABASE_URL/KEY podem estar incorretas ou rede indisponível.');
    }
    
    setIsSyncing(false);
  }, [isSyncing]);

  useEffect(() => {
    syncWithServer();
    const unsubscribe = api.subscribeToChanges(() => {
      syncWithServer();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem('budget_session');
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
  }, []);

  const addLog = useCallback(async (action: ActionType, entityType: EntityType, entityId: string, description: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      entityType,
      entityId,
      description,
      timestamp: new Date().toISOString()
    };
    await api.addLog(newLog);
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('budget_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('budget_session');
  };

  // Funções agora lançam exceções reais se o banco falhar
  const handleAddCredit = async (newCredit: Credit) => {
    try {
      await api.upsert('credits', newCredit);
      await addLog('CREATE', 'CRÉDITO', newCredit.id, `NC ${newCredit.nc}`);
      syncWithServer();
    } catch (e: any) {
      alert(`FALHA NO ENVIO: ${e.message}`);
    }
  };

  const handleUpdateCredit = async (updated: Credit) => {
    try {
      await api.upsert('credits', updated);
      await addLog('UPDATE', 'CRÉDITO', updated.id, `NC ${updated.nc}`);
      syncWithServer();
    } catch (e: any) {
      alert(`ERRO AO ATUALIZAR: ${e.message}`);
    }
  };

  const handleDeleteCredit = async (id: string) => {
    const credit = credits.find(c => c.id === id);
    if (credit && window.confirm('Excluir este crédito definitivamente?')) {
      try {
        await api.delete('credits', id);
        await addLog('DELETE', 'CRÉDITO', id, `NC ${credit.nc}`);
        syncWithServer();
      } catch (e: any) {
        alert(`ERRO AO EXCLUIR: ${e.message}`);
      }
    }
  };

  const handleAddCommitment = async (newCom: Commitment) => {
    try {
      await api.upsert('commitments', newCom);
      await addLog('CREATE', 'EMPENHO', newCom.id, `NE ${newCom.ne}`);
      syncWithServer();
    } catch (e: any) {
      alert(`FALHA NO EMPENHO: ${e.message}`);
    }
  };

  const handleUpdateCommitment = async (updated: Commitment) => {
    try {
      await api.upsert('commitments', updated);
      await addLog('UPDATE', 'EMPENHO', updated.id, `NE ${updated.ne}`);
      syncWithServer();
    } catch (e: any) {
      alert(`FALHA NA ATUALIZAÇÃO: ${e.message}`);
    }
  };

  const handleDeleteCommitment = async (id: string) => {
    const com = commitments.find(c => c.id === id);
    if (com && window.confirm('Excluir este empenho definitivamente?')) {
      try {
        await api.delete('commitments', id);
        await addLog('DELETE', 'EMPENHO', id, `NE ${com.ne}`);
        syncWithServer();
      } catch (e: any) {
        alert(`FALHA NA EXCLUSÃO: ${e.message}`);
      }
    }
  };

  const handleAddRefund = async (newRefund: Refund) => {
    try {
      await api.upsert('refunds', newRefund);
      await addLog('CREATE', 'RECOLHIMENTO', newRefund.id, `Recolhimento NC individual`);
      syncWithServer();
    } catch (e: any) {
      alert(`FALHA NO RECOLHIMENTO: ${e.message}`);
    }
  };

  const handleAddCancellation = async (newCan: Cancellation) => {
    try {
      await api.upsert('cancellations', newCan);
      await addLog('CREATE', 'ANULAÇÃO', newCan.id, `Anulação parcial/total`);
      syncWithServer();
    } catch (e: any) {
      alert(`FALHA NA ANULAÇÃO: ${e.message}`);
    }
  };

  const handleUpdateUsers = async (nextUsers: User[]) => {
    try {
      for (const user of nextUsers) {
        await api.upsert('users', user);
      }
      syncWithServer();
    } catch (e: any) {
      alert(`FALHA NA GESTÃO DE USUÁRIOS: ${e.message}`);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'credits', label: 'Créditos', icon: ReceiptText, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'commitments', label: 'Empenhos', icon: TrendingDown, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'reports', label: 'Relatórios', icon: FilePieChart, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
    { id: 'history', label: 'Histórico', icon: History, roles: ['ADMIN'] },
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
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Recolher Menu</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => syncWithServer()}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'}`}
              >
                {isSyncing ? <RefreshCw size={10} className="animate-spin" /> : isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isSyncing ? 'Conectando...' : isOnline ? 'Supabase Online' : 'Clique p/ Reconectar'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {!isOnline && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100 animate-bounce">
                <AlertCircle size={14} />
                <span className="text-[10px] font-black uppercase">ERRO: Verifique Variáveis Supabase</span>
              </div>
            )}
            <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-900 leading-none uppercase tracking-tighter">{currentUser.name}</p>
                <p className="text-[9px] text-emerald-600 font-bold mt-1 uppercase tracking-widest italic">BIB 20 - Gestão de Créditos</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {!isOnline && (
            <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-[2rem] flex items-center gap-6 animate-in slide-in-from-top-4">
              <div className="p-4 bg-red-100 text-red-600 rounded-2xl"><WifiOff size={32} /></div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-red-900 uppercase">Sistema em Modo Offline</h3>
                <p className="text-[10px] font-bold text-red-700 uppercase opacity-70">
                  O aplicativo não conseguiu estabelecer conexão com o Supabase. Verifique se as variáveis SUPABASE_URL e SUPABASE_ANON_KEY foram configuradas corretamente no Vercel/Ambiente.
                </p>
              </div>
              <button onClick={() => syncWithServer()} className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2">
                <RefreshCw size={16} /> Tentar Agora
              </button>
            </div>
          )}
          {activeTab === 'dashboard' && <Dashboard credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} filters={filters} setFilters={setFilters} />}
          {activeTab === 'credits' && <CreditList credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} filters={filters} setFilters={setFilters} onAddCredit={handleAddCredit} onUpdateCredit={handleUpdateCredit} onDeleteCredit={handleDeleteCredit} onAddRefund={handleAddRefund} userRole={currentUser.role} />}
          {activeTab === 'commitments' && <CommitmentList credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} onAdd={handleAddCommitment} onUpdate={handleUpdateCommitment} onDelete={handleDeleteCommitment} onAddCancellation={handleAddCancellation} userRole={currentUser.role} />}
          {activeTab === 'reports' && <Reports credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} />}
          {activeTab === 'users' && currentUser.role === 'ADMIN' && <UserManagement users={users} setUsers={handleUpdateUsers} />}
          {activeTab === 'history' && currentUser.role === 'ADMIN' && <AuditHistory logs={auditLogs} />}
        </div>
      </main>
    </div>
  );
};

export default App;
