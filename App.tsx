
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, ReceiptText, Landmark, FilePieChart, Menu, X, TrendingDown, Users, LogOut, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Briefcase, History, PackageSearch } from 'lucide-react';
import { Credit, Commitment, Refund, Cancellation, Filters, User, Contract, AuditLog } from './types';
import Dashboard from './components/Dashboard';
import CreditList from './components/CreditList';
import CommitmentList from './components/CommitmentList';
import ContractList from './components/ContractList';
import Reports from './components/Reports';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import AuditHistory from './components/AuditHistory';
import DeliveryTracking from './components/DeliveryTracking';
import { api, supabase } from './api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'credits' | 'commitments' | 'contracts' | 'reports' | 'users' | 'audit' | 'tracking'>('dashboard');
  
  const [credits, setCredits] = useState<Credit[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [filters, setFilters] = useState<Filters>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const syncingLock = useRef(false);

  const syncWithServer = useCallback(async () => {
    if (syncingLock.current) return;
    syncingLock.current = true;
    setIsSyncing(true);
    
    try {
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
          setContracts(state.contracts || []);
          setAuditLogs(state.auditLogs || []);
          
          localStorage.setItem('budget_credits', JSON.stringify(state.credits));
          localStorage.setItem('budget_commitments', JSON.stringify(state.commitments));
          localStorage.setItem('budget_users', JSON.stringify(state.users));
          localStorage.setItem('budget_contracts', JSON.stringify(state.contracts || []));
        }
      } else {
        const cachedCredits = localStorage.getItem('budget_credits');
        const cachedComs = localStorage.getItem('budget_commitments');
        const cachedUsers = localStorage.getItem('budget_users');
        const cachedContracts = localStorage.getItem('budget_contracts');
        if (cachedCredits) setCredits(JSON.parse(cachedCredits));
        if (cachedComs) setCommitments(JSON.parse(cachedComs));
        if (cachedUsers) setUsers(JSON.parse(cachedUsers));
        if (cachedContracts) setContracts(JSON.parse(cachedContracts));
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setIsSyncing(false);
      syncingLock.current = false;
    }
  }, []);

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
    if (savedSession) {
      const parsedUser = JSON.parse(savedSession);
      setCurrentUser(parsedUser);
      if (parsedUser.role === 'ALMOXARIFADO') setActiveTab('tracking');
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'ALMOXARIFADO') setActiveTab('tracking');
    else setActiveTab('dashboard');
    localStorage.setItem('budget_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('budget_session');
  };

  const handleAddCredit = async (newCredit: Credit) => {
    const nextCredits = [...credits, newCredit];
    setCredits(nextCredits);
    localStorage.setItem('budget_credits', JSON.stringify(nextCredits));
    if (isOnline) {
      try {
        await api.upsert('credits', newCredit);
        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };

  const handleUpdateCredit = async (updated: Credit) => {
    const nextCredits = credits.map(c => c.id === updated.id ? updated : c);
    setCredits(nextCredits);
    localStorage.setItem('budget_credits', JSON.stringify(nextCredits));
    if (isOnline) {
      try {
        await api.upsert('credits', updated);
        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };

  const handleDeleteCredit = async (id: string) => {
    const credit = credits.find(c => c.id === id);
    if (credit && window.confirm('Excluir este crédito definitivamente?')) {
      const nextCredits = credits.filter(c => c.id !== id);
      setCredits(nextCredits);
      localStorage.setItem('budget_credits', JSON.stringify(nextCredits));
      if (isOnline) {
        try {
          await api.delete('credits', id);
          syncWithServer();
        } catch (e: any) {
          console.warn(e.message);
        }
      }
    }
  };

  const handleAddCommitment = async (newCom: Commitment) => {
    const nextComs = [...commitments, newCom];
    setCommitments(nextComs);
    localStorage.setItem('budget_commitments', JSON.stringify(nextComs));
    if (isOnline) {
      try {
        await api.upsert('commitments', newCom);
        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };

  const handleUpdateCommitment = async (updated: Commitment) => {
    const nextComs = commitments.map(c => c.id === updated.id ? updated : c);
    setCommitments(nextComs);
    localStorage.setItem('budget_commitments', JSON.stringify(nextComs));
    if (isOnline) {
      try {
        await api.upsert('commitments', updated);
        
        await supabase
          .from('commitments')
          .update({
            contacts: updated.contacts,
            material_arrived_date: updated.materialArrivedDate || null
          })
          .eq('id', updated.id);

        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };

  const handleDeleteCommitment = async (id: string) => {
    const com = commitments.find(c => c.id === id);
    if (com && window.confirm('Excluir este empenho definitivamente?')) {
      const nextComs = commitments.filter(c => c.id !== id);
      setCommitments(nextComs);
      localStorage.setItem('budget_commitments', JSON.stringify(nextComs));
      if (isOnline) {
        try {
          await api.delete('commitments', id);
          syncWithServer();
        } catch (e: any) {
          console.warn(e.message);
        }
      }
    }
  };

  const handleAddContract = async (newCon: Contract) => {
    const nextContracts = [...contracts, newCon];
    setContracts(nextContracts);
    localStorage.setItem('budget_contracts', JSON.stringify(nextContracts));
    if (isOnline) {
      try {
        await api.upsert('contracts', newCon);
        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };

  const handleUpdateContract = async (updated: Contract) => {
    const nextContracts = contracts.map(c => c.id === updated.id ? updated : c);
    setContracts(nextContracts);
    localStorage.setItem('budget_contracts', JSON.stringify(nextContracts));
    if (isOnline) {
      try {
        await api.upsert('contracts', updated);
        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (window.confirm('Excluir este contrato definitivamente?')) {
      const nextContracts = contracts.filter(c => c.id !== id);
      setContracts(nextContracts);
      localStorage.setItem('budget_contracts', JSON.stringify(nextContracts));
      if (isOnline) {
        try {
          await api.delete('contracts', id);
          syncWithServer();
        } catch (e: any) {
          console.warn(e.message);
        }
      }
    }
  };

  const handleAddRefund = async (newRefund: Refund) => {
    const nextR = [...refunds, newRefund];
    setRefunds(nextR);
    if (isOnline) {
      try {
        await api.upsert('refunds', newRefund);
        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };

  const handleAddCancellation = async (newCan: Cancellation) => {
    const nextC = [...cancellations, newCan];
    setCancellations(nextC);
    if (isOnline) {
      try {
        await api.upsert('cancellations', newCan);
        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };

  const handleUpdateUsers = async (nextUsers: User[]) => {
    setUsers(nextUsers);
    localStorage.setItem('budget_users', JSON.stringify(nextUsers));
    if (isOnline) {
      for (const user of nextUsers) {
        try {
          await api.upsert('users', user);
        } catch (e: any) {
          console.warn('Falha ao sincronizar usuário:', user.username, e.message);
        }
      }
      syncWithServer();
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'tracking', label: 'Acompanhamento', icon: PackageSearch, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO'] },
    { id: 'credits', label: 'Créditos', icon: ReceiptText, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'commitments', label: 'Empenhos', icon: TrendingDown, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'contracts', label: 'Contratos', icon: Briefcase, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'reports', label: 'Relatórios', icon: FilePieChart, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { id: 'audit', label: 'Auditoria', icon: History, roles: ['ADMIN'] },
    { id: 'users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  ] as const;

  if (!currentUser) {
    return <Login users={users} setUsers={handleUpdateUsers} onLogin={handleLogin} />;
  }

  const filteredMenuItems = menuItems.filter(item => (item.roles as readonly string[]).includes(currentUser.role));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-black relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-emerald-950 text-white transition-all duration-300 flex flex-col shrink-0 border-r border-emerald-900 shadow-2xl
        ${isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full md:translate-x-0 md:w-20'}
        md:relative
      `}>
        <div className="p-6 flex items-center gap-4 border-b border-emerald-900/50">
          <div className="bg-emerald-500 p-2.5 rounded-xl shrink-0 shadow-lg shadow-emerald-500/20">
            <Landmark size={24} />
          </div>
          {(isSidebarOpen || window.innerWidth < 768) && (
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
              onClick={() => {
                setActiveTab(item.id as any);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/50 scale-[1.02]' 
                  : 'text-emerald-100/40 hover:bg-emerald-900/50 hover:text-white'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-emerald-500'} />
              {(isSidebarOpen || window.innerWidth < 768) && <span className="font-black text-[10px] uppercase tracking-widest">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-900/50 space-y-2">
          {(isSidebarOpen || window.innerWidth < 768) && (
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
            {(isSidebarOpen || window.innerWidth < 768) && <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex items-center gap-4 text-emerald-100/30 hover:text-white w-full px-4 py-3 transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            <span className="text-[10px] font-black uppercase tracking-widest">Menu</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-widest truncate max-w-[120px] md:max-w-none">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h1>
            <button 
              onClick={() => syncWithServer()}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'}`}
            >
              {isSyncing ? <RefreshCw size={10} className="animate-spin" /> : isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
              <span className="hidden sm:inline">{isSyncing ? 'Conectando...' : isOnline ? 'Online' : 'Desconectado'}</span>
            </button>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-right hidden xs:block">
              <p className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase">{currentUser.name}</p>
              <p className="text-[7px] md:text-[9px] text-emerald-600 font-bold uppercase italic tracking-widest">BIB 20</p>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
          {activeTab === 'dashboard' && <Dashboard credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} filters={filters} setFilters={setFilters} />}
          {activeTab === 'tracking' && <DeliveryTracking credits={credits} commitments={commitments} onUpdateCommitment={handleUpdateCommitment} userRole={currentUser.role} userSection={currentUser.assignedSection} />}
          {activeTab === 'credits' && <CreditList credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} filters={filters} setFilters={setFilters} onAddCredit={handleAddCredit} onUpdateCredit={handleUpdateCredit} onDeleteCredit={handleDeleteCredit} onAddRefund={handleAddRefund} userRole={currentUser.role} auditLogs={auditLogs} />}
          {activeTab === 'commitments' && <CommitmentList credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} onAdd={handleAddCommitment} onUpdate={handleUpdateCommitment} onDelete={handleDeleteCommitment} onAddCancellation={handleAddCancellation} userRole={currentUser.role} auditLogs={auditLogs} />}
          {activeTab === 'contracts' && <ContractList contracts={contracts} credits={credits} commitments={commitments} onAdd={handleAddContract} onUpdate={handleUpdateContract} onDelete={handleDeleteContract} userRole={currentUser.role} />}
          {activeTab === 'reports' && <Reports credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} />}
          {activeTab === 'audit' && currentUser.role === 'ADMIN' && <AuditHistory logs={auditLogs} />}
          {activeTab === 'users' && currentUser.role === 'ADMIN' && <UserManagement users={users} setUsers={handleUpdateUsers} />}
        </div>
      </main>
    </div>
  );
};

export default App;
