
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, ReceiptText, Landmark, FilePieChart, Menu, X, TrendingDown, Users, LogOut, ShieldCheck, History, Wifi, WifiOff, RefreshCw, Settings } from 'lucide-react';
import { Credit, Commitment, Refund, Cancellation, Filters, User, UserRole, AuditLog, ActionType, EntityType } from './types';
import { INITIAL_CREDITS, INITIAL_COMMITMENTS } from './constants';
import Dashboard from './components/Dashboard';
import CreditList from './components/CreditList';
import CommitmentList from './components/CommitmentList';
import Reports from './components/Reports';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import AuditHistory from './components/AuditHistory';
import { api, getApiUrl, setApiUrl } from './api';

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
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [tempServerUrl, setTempServerUrl] = useState(getApiUrl());

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
        setCredits(state.credits || []);
        setCommitments(state.commitments || []);
        setRefunds(state.refunds || []);
        setCancellations(state.cancellations || []);
        setUsers(state.users || []);
        setAuditLogs(state.auditLogs || []);
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
    const interval = setInterval(syncWithServer, 20000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  const persist = async (key: string, data: any) => {
    const success = await api.updateState(key, data);
    setIsOnline(success);
  };

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
    const nextCredits = [...credits, newCredit];
    setCredits(nextCredits);
    persist('credits', nextCredits);
    addLog('CREATE', 'CRÉDITO', newCredit.id, `Lançamento de crédito NC ${newCredit.nc} no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newCredit.valueReceived)}`);
  };

  const handleUpdateCredit = async (updated: Credit) => {
    const nextCredits = credits.map(c => c.id === updated.id ? updated : c);
    setCredits(nextCredits);
    persist('credits', nextCredits);
    addLog('UPDATE', 'CRÉDITO', updated.id, `Alteração nos dados do crédito NC ${updated.nc}`);
  };

  const handleDeleteCredit = async (id: string) => {
    const credit = credits.find(c => c.id === id);
    if (credit && window.confirm('Excluir este crédito e vínculos?')) {
      const nextCredits = credits.filter(c => c.id !== id);
      // Atualiza empenhos removendo alocações vinculadas a este crédito
      const nextCommitments = commitments.map(com => ({
        ...com,
        allocations: com.allocations.filter(a => a.creditId !== id)
      })).filter(com => com.allocations.length > 0); // Remove empenhos que ficarem sem alocação
      
      const nextRefunds = refunds.filter(ref => ref.creditId !== id);
      setCredits(nextCredits);
      setCommitments(nextCommitments);
      setRefunds(nextRefunds);
      persist('credits', nextCredits);
      persist('commitments', nextCommitments);
      persist('refunds', nextRefunds);
      addLog('DELETE', 'CRÉDITO', id, `Exclusão do crédito NC ${credit.nc}`);
    }
  };

  const handleAddCommitment = async (newCom: Commitment) => {
    const nextCommitments = [...commitments, newCom];
    setCommitments(nextCommitments);
    persist('commitments', nextCommitments);
    addLog('CREATE', 'EMPENHO', newCom.id, `Lançamento de empenho NE ${newCom.ne} no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newCom.value)}`);
  };

  const handleUpdateCommitment = async (updated: Commitment) => {
    const nextCommitments = commitments.map(c => c.id === updated.id ? updated : c);
    setCommitments(nextCommitments);
    persist('commitments', nextCommitments);
    addLog('UPDATE', 'EMPENHO', updated.id, `Alteração nos dados do empenho NE ${updated.ne}`);
  };

  const handleDeleteCommitment = async (id: string) => {
    const com = commitments.find(c => c.id === id);
    if (com && window.confirm('Excluir este empenho?')) {
      const nextCommitments = commitments.filter(c => c.id !== id);
      const nextCancellations = cancellations.filter(can => can.commitmentId !== id);
      setCommitments(nextCommitments);
      setCancellations(nextCancellations);
      persist('commitments', nextCommitments);
      persist('cancellations', nextCancellations);
      addLog('DELETE', 'EMPENHO', id, `Exclusão do empenho NE ${com.ne}`);
    }
  };

  const handleAddRefund = async (newRefund: Refund) => {
    const nextRefunds = [...refunds, newRefund];
    setRefunds(nextRefunds);
    persist('refunds', nextRefunds);
    const credit = credits.find(c => c.id === newRefund.creditId);
    addLog('CREATE', 'RECOLHIMENTO', newRefund.id, `Lançamento de recolhimento para NC ${credit?.nc || 'Desconhecida'} no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newRefund.value)}`);
  };

  const handleAddCancellation = async (newCan: Cancellation) => {
    const nextCancellations = [...cancellations, newCan];
    setCancellations(nextCancellations);
    persist('cancellations', nextCancellations);
    const com = commitments.find(c => c.id === newCan.commitmentId);
    addLog('CREATE', 'ANULAÇÃO', newCan.id, `Lançamento de anulação RO ${newCan.ro} para NE ${com?.ne || 'Desconhecida'} no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newCan.value)}`);
  };

  const handleUpdateUsers = async (nextUsers: User[]) => {
    setUsers(nextUsers);
    persist('users', nextUsers);
  };

  const handleSaveServerUrl = () => {
    setApiUrl(tempServerUrl);
    setShowServerSettings(false);
    syncWithServer();
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
                  <p className="text-[8px] font-bold text-emerald-400 uppercase">{currentUser.role === 'ADMIN' ? 'Administrador' : currentUser.role === 'EDITOR' ? 'Editor' : 'Visualizador'}</p>
                </div>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full px-4 py-3 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Sair do Sistema</span>}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-4 text-emerald-100/30 hover:text-white w-full px-4 py-3 transition-colors"
          >
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
              {currentUser.role === 'ADMIN' && (
                <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={10} /> Admin
                </span>
              )}
              <button 
                onClick={() => setShowServerSettings(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
              >
                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isSyncing ? 'Sincronizando...' : isOnline ? 'Conectado' : 'Trabalhando Local'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-900 leading-none uppercase tracking-tighter">{currentUser.name}</p>
                <p className="text-[9px] text-emerald-600 font-bold mt-1 uppercase tracking-widest italic">{isOnline ? 'Em Nuvem' : 'Local-First'}</p>
              </div>
              <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-black text-xs border border-emerald-200 shadow-sm">
                20
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <Dashboard 
              credits={credits} 
              commitments={commitments} 
              refunds={refunds}
              cancellations={cancellations}
              filters={filters} 
              setFilters={setFilters} 
            />
          )}
          {activeTab === 'credits' && (
            <CreditList 
              credits={credits} 
              commitments={commitments} 
              refunds={refunds}
              cancellations={cancellations}
              filters={filters} 
              setFilters={setFilters}
              onAddCredit={handleAddCredit}
              onUpdateCredit={handleUpdateCredit}
              onDeleteCredit={handleDeleteCredit}
              onAddRefund={handleAddRefund}
              userRole={currentUser.role}
            />
          )}
          {activeTab === 'commitments' && (
            <CommitmentList 
              credits={credits}
              commitments={commitments}
              refunds={refunds}
              cancellations={cancellations}
              onAdd={handleAddCommitment}
              onUpdate={handleUpdateCommitment}
              onDelete={handleDeleteCommitment}
              onAddCancellation={handleAddCancellation}
              userRole={currentUser.role}
            />
          )}
          {activeTab === 'reports' && (
            <Reports 
              credits={credits} 
              commitments={commitments}
              refunds={refunds}
              cancellations={cancellations}
            />
          )}
          {activeTab === 'users' && currentUser.role === 'ADMIN' && (
            <UserManagement 
              users={users} 
              setUsers={handleUpdateUsers} 
            />
          )}
          {activeTab === 'history' && currentUser.role === 'ADMIN' && (
            <AuditHistory logs={auditLogs} />
          )}
        </div>
      </main>

      {showServerSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 text-black">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Settings size={16} /> Configurações de Rede
              </h3>
              <button onClick={() => setShowServerSettings(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Endereço do Servidor (IP:Porta)</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={tempServerUrl}
                  onChange={(e) => setTempServerUrl(e.target.value)}
                  placeholder="Ex: http://192.168.1.50:3001"
                />
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 ${isOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                <div className="flex-1">
                   <p className="text-[10px] font-black uppercase">{isOnline ? 'Sincronizado' : 'Modo Offline'}</p>
                   <p className="text-[9px] font-medium leading-relaxed mt-1 italic">
                     {isOnline 
                       ? 'Os dados estão sendo compartilhados com todas as máquinas na rede.' 
                       : 'Trabalhando localmente. Inicie o server.js no computador mestre e coloque o IP dele acima.'}
                   </p>
                </div>
              </div>

              <button 
                onClick={handleSaveServerUrl}
                className="w-full bg-slate-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                Conectar e Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
