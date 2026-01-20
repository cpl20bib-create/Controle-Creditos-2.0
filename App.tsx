
import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, ReceiptText, Landmark, FilePieChart, Menu, X, TrendingDown, Users, LogOut, ShieldCheck, History, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Credit, Commitment, Refund, Cancellation, Filters, User, AuditLog, ActionType, EntityType } from './types';
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
  
  const [credits, setCredits] = useState<Credit[]>(() => {
    const saved = localStorage.getItem('budget_credits');
    return saved ? JSON.parse(saved) : INITIAL_CREDITS;
  });
  const [commitments, setCommitments] = useState<Commitment[]>(() => {
    const saved = localStorage.getItem('budget_commitments');
    return saved ? JSON.parse(saved) : INITIAL_COMMITMENTS;
  });
  const [refunds, setRefunds] = useState<Refund[]>(() => {
    const saved = localStorage.getItem('budget_refunds');
    return saved ? JSON.parse(saved) : [];
  });
  const [cancellations, setCancellations] = useState<Cancellation[]>(() => {
    const saved = localStorage.getItem('budget_cancellations');
    return saved ? JSON.parse(saved) : [];
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('budget_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('budget_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [filters, setFilters] = useState<Filters>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Persistência em cache local para funcionamento offline
  useEffect(() => {
    localStorage.setItem('budget_credits', JSON.stringify(credits));
    localStorage.setItem('budget_commitments', JSON.stringify(commitments));
    localStorage.setItem('budget_refunds', JSON.stringify(refunds));
    localStorage.setItem('budget_cancellations', JSON.stringify(cancellations));
    localStorage.setItem('budget_users', JSON.stringify(users));
    localStorage.setItem('budget_logs', JSON.stringify(auditLogs));
  }, [credits, commitments, refunds, cancellations, users, auditLogs]);

  useEffect(() => {
    const savedSession = localStorage.getItem('budget_session');
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
  }, []);

  const syncWithServer = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const state = await api.getFullState();
      if (state) {
        setCredits(state.creditos);
        setCommitments(state.empenhos);
        setRefunds(state.recolhimentos);
        setCancellations(state.anulacoes_empenhos);
        setUsers(state.usuarios);
        setAuditLogs(state.auditLogs);
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    syncWithServer();
    const interval = setInterval(syncWithServer, 60000); // Sincronização automática a cada 1 minuto
    return () => clearInterval(interval);
  }, [syncWithServer]);

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
    setAuditLogs(prev => [newLog, ...prev]);
    api.addLog(newLog);
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('budget_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('budget_session');
  };

  const handleAddCredit = async (newCredit: Credit) => {
    setCredits(prev => [...prev, newCredit]);
    const success = await api.upsert('creditos', newCredit);
    setIsOnline(success);
    addLog('CREATE', 'CRÉDITO', newCredit.id, `Lançamento de crédito NC ${newCredit.nc}`);
  };

  const handleUpdateCredit = async (updated: Credit) => {
    setCredits(prev => prev.map(c => c.id === updated.id ? updated : c));
    const success = await api.upsert('creditos', updated);
    setIsOnline(success);
    addLog('UPDATE', 'CRÉDITO', updated.id, `Alteração no crédito NC ${updated.nc}`);
  };

  const handleDeleteCredit = async (id: string) => {
    const credit = credits.find(c => c.id === id);
    if (credit && window.confirm('Excluir este crédito?')) {
      setCredits(prev => prev.filter(c => c.id !== id));
      const success = await api.delete('credits', id);
      setIsOnline(success);
      addLog('DELETE', 'CRÉDITO', id, `Exclusão do crédito NC ${credit.nc}`);
    }
  };

  const handleAddCommitment = async (newCom: Commitment) => {
    setCommitments(prev => [...prev, newCom]);
    const success = await api.upsert('empenhos', newCom);
    setIsOnline(success);
    addLog('CREATE', 'EMPENHO', newCom.id, `Lançamento de empenho NE ${newCom.ne}`);
  };

  const handleUpdateCommitment = async (updated: Commitment) => {
    setCommitments(prev => prev.map(c => c.id === updated.id ? updated : c));
    const success = await api.upsert('empenhos', updated);
    setIsOnline(success);
    addLog('UPDATE', 'EMPENHO', updated.id, `Alteração no empenho NE ${updated.ne}`);
  };

  const handleDeleteCommitment = async (id: string) => {
    const com = commitments.find(c => c.id === id);
    if (com && window.confirm('Excluir este empenho?')) {
      setCommitments(prev => prev.filter(c => c.id !== id));
      const success = await api.delete('commitments', id);
      setIsOnline(success);
      addLog('DELETE', 'EMPENHO', id, `Exclusão do empenho NE ${com.ne}`);
    }
  };

  const handleAddRefund = async (newRefund: Refund) => {
    setRefunds(prev => [...prev, newRefund]);
    const success = await api.upsert('recolhimentos', newRefund);
    setIsOnline(success);
    const credit = credits.find(c => c.id === newRefund.creditId);
    addLog('CREATE', 'RECOLHIMENTO', newRefund.id, `Recolhimento para NC ${credit?.nc || '?'}`);
  };

  const handleAddCancellation = async (newCan: Cancellation) => {
    setCancellations(prev => [...prev, newCan]);
    const success = await api.upsert('anulacoes_empenhos', newCan);
    setIsOnline(success);
    const com = commitments.find(c => c.id === newCan.commitmentId);
    addLog('CREATE', 'ANULAÇÃO', newCan.id, `Anulação RO para NE ${com?.ne || '?'}`);
  };

  const handleUpdateUsers = async (nextUsers: User[]) => {
    setUsers(nextUsers);
    for (const user of nextUsers) {
      await api.upsert('usuarios', user);
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

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

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
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
              >
                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isSyncing ? 'Sincronizando...' : isOnline ? 'Supabase Online' : 'Offline'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-900 leading-none uppercase tracking-tighter">{currentUser.name}</p>
                <p className="text-[9px] text-emerald-600 font-bold mt-1 uppercase tracking-widest italic">BIB 20 - Vercel Deploy</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
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
