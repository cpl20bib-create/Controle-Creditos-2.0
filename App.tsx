
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, ReceiptText, Landmark, FilePieChart, Menu, X, TrendingDown, Users, LogOut, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Briefcase, History, PackageSearch, Bell, Trash2 } from 'lucide-react';
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
import LiquidationTracking from './components/LiquidationTracking';
import { api, supabase } from './api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'credits' | 'commitments' | 'contracts' | 'reports' | 'users' | 'audit' | 'tracking' | 'liquidations'>('dashboard');
  
  const [credits, setCredits] = useState<Credit[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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

  const sendNotification = async (targetRole: string, title: string, message: string, section?: string) => {
    if (!isOnline || !currentUser) return;
    const notif: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'NOTIFICATION',
      entityType: targetRole as any,
      entityId: Math.random().toString(36).substr(2, 9),
      description: JSON.stringify({ title, message, readBy: [], section }),
      timestamp: new Date().toISOString()
    };
    try {
      await api.upsert('audit_logs', notif);
      // We don't necessarily need to await syncWithServer here
      // as it will be called by the caller
    } catch (e) {
      console.warn('Failed to send notification', e);
    }
  };

  const handleAddCredit = async (newCredit: Credit) => {
    const nextCredits = [...credits, newCredit];
    setCredits(nextCredits);
    localStorage.setItem('budget_credits', JSON.stringify(nextCredits));
    if (isOnline) {
      try {
        await api.upsert('credits', newCredit);
        await sendNotification('ALMOXARIFADO', 'Novo Recurso', `Recurso ${newCredit.nc} recebido com saldo R$ ${Number(newCredit.valueReceived).toLocaleString('pt-BR')}.`, newCredit.section);
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
        const credit = credits.find(c => c.id === newCom.creditId);
        await sendNotification('ALMOXARIFADO', 'Novo Empenho', `Empenho ${newCom.ne} registrado no valor de R$ ${Number(newCom.value).toLocaleString('pt-BR')}.`, credit?.section);
        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };

  const handleUpdateCommitment = async (updated: Commitment) => {
    setCommitments(prev => {
      const nextComs = prev.map(c => c.id === updated.id ? updated : c);
      localStorage.setItem('budget_commitments', JSON.stringify(nextComs));
      return nextComs;
    });

    if (isOnline) {
      try {
        await api.upsert('commitments', updated);
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
        const credit = credits.find(c => c.id === newRefund.creditId);
        await sendNotification('ALMOXARIFADO', 'Novo Recolhimento', `Recolhimento registrado no valor de R$ ${Number(newRefund.value).toLocaleString('pt-BR')}.`, credit?.section);
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
        const com = commitments.find(c => c.id === newCan.commitmentId);
        const credit = credits.find(c => c.id === com?.creditId);
        await sendNotification('ALMOXARIFADO', 'Nova Anulação', `Anulação registrada no valor de R$ ${Number(newCan.value).toLocaleString('pt-BR')}.`, credit?.section);
        syncWithServer();
      } catch (e: any) {
        console.warn(e.message);
      }
    }
  };


  const handleDeleteUser = async (id: string) => {
    const nextUsers = users.filter(u => u.id !== id);
    setUsers(nextUsers);
    localStorage.setItem('budget_users', JSON.stringify(nextUsers));
    
    if (isOnline) {
      try {
        await api.delete('users', id);
        syncWithServer();
      } catch (e: any) {
        console.warn('Falha ao excluir usuário:', e.message);
        alert('Erro ao excluir usuário: ' + e.message);
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'tracking', label: 'Acompanhamento', icon: PackageSearch, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'liquidations', label: 'Liquidação', icon: CheckCircle, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'credits', label: 'Créditos', icon: ReceiptText, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'commitments', label: 'Empenhos', icon: TrendingDown, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'contracts', label: 'Contratos', icon: Briefcase, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'reports', label: 'Relatórios', icon: FilePieChart, roles: ['ADMIN', 'EDITOR', 'VIEWER', 'ALMOXARIFADO', 'CONFORMADOR', 'FINANCEIRO'] },
    { id: 'audit', label: 'Auditoria', icon: History, roles: ['ADMIN'] },
    { id: 'users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  ] as const;

  if (!currentUser) {
    return <Login users={users} setUsers={handleUpdateUsers} onLogin={handleLogin} />;
  }

  const filteredMenuItems = menuItems.filter(item => (item.roles as readonly string[]).includes(currentUser.role));

  const userNotifications = auditLogs.filter(log => {
    if (log.action !== 'NOTIFICATION') return false;
    if (log.entityType === 'ALL') return true;
    if (log.entityType !== currentUser.role) return false;
    
    try {
      const parsed = JSON.parse(log.description);
      if (parsed.deletedBy && parsed.deletedBy.includes(currentUser.id)) return false;
      if (parsed.section && currentUser.role === 'ALMOXARIFADO') {
        if (!currentUser.assignedSections || currentUser.assignedSections.length === 0) return true;
        return currentUser.assignedSections.includes(parsed.section);
      }
    } catch (e) {}
    return true;
  });
  const unreadCount = userNotifications.filter(log => {
    try {
      const parsed = JSON.parse(log.description);
      return !(parsed.readBy && parsed.readBy.includes(currentUser.id));
    } catch(e) {
      return true;
    }
  }).length;



  const markAllAsRead = async () => {
    const unread = userNotifications.filter(log => {
    try {
      const parsed = JSON.parse(log.description);
      return !(parsed.readBy && parsed.readBy.includes(currentUser.id));
    } catch(e) {
      return true;
    }
  });
    for (const log of unread) {
      try {
        const parsed = JSON.parse(log.description);
        parsed.readBy = parsed.readBy || [];
        if (!parsed.readBy.includes(currentUser.id)) {
           parsed.readBy.push(currentUser.id);
           const updated = { ...log, description: JSON.stringify(parsed) };
           await api.upsert('audit_logs', updated);
        }
      } catch (e) {}
    }
    syncWithServer();
  };
  const deleteNotification = async (logId: string) => {
    const log = auditLogs.find(l => l.id === logId);
    if (!log) return;
    try {
      let parsed = JSON.parse(log.description);
      parsed.deletedBy = parsed.deletedBy || [];
      if (!parsed.deletedBy.includes(currentUser.id)) {
        parsed.deletedBy.push(currentUser.id);
        const updated = { ...log, description: JSON.stringify(parsed) };
        await api.upsert('audit_logs', updated);
        syncWithServer();
      }
    } catch(e) {}
  };


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
            
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors relative">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Notificações</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase">
                        Marcar como lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {userNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-medium">
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      userNotifications.slice(0, 50).map(notif => {
                        let parsed: any = { title: 'Aviso', message: notif.description };
                        try { parsed = JSON.parse(notif.description); } catch(e){}
                        const isRead = parsed.readBy?.includes(currentUser.id);
                        return (
                          <div key={notif.id} className={`p-4 border-b border-slate-50 transition-colors relative group ${isRead ? 'opacity-50 hover:opacity-100' : 'bg-slate-50/30'}`}>
                            <div className="flex justify-between items-start">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">{parsed.title}</h4>
                              {isRead && (
                                <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir aviso">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">{parsed.message}</p>
                            <span className="text-[9px] text-slate-400 font-medium mt-2 block">
                              {new Date(notif.timestamp).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right hidden xs:block">
              <p className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase">{currentUser.name}</p>
              <p className="text-[7px] md:text-[9px] text-emerald-600 font-bold uppercase italic tracking-widest">BIB 20</p>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
          {activeTab === 'dashboard' && <Dashboard credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} filters={filters} setFilters={setFilters} />}
          {activeTab === 'tracking' && <DeliveryTracking credits={credits} commitments={commitments} cancellations={cancellations} onUpdateCommitment={handleUpdateCommitment} onNotify={sendNotification} userRole={currentUser.role} userSections={currentUser.assignedSections} />}
          {activeTab === 'liquidations' && <LiquidationTracking commitments={commitments} cancellations={cancellations} credits={credits} onUpdateCommitment={handleUpdateCommitment} userRole={currentUser.role} />}
          {activeTab === 'credits' && <CreditList credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} filters={filters} setFilters={setFilters} onAddCredit={handleAddCredit} onUpdateCredit={handleUpdateCredit} onDeleteCredit={handleDeleteCredit} onAddRefund={handleAddRefund} userRole={currentUser.role} auditLogs={auditLogs} />}
          {activeTab === 'commitments' && <CommitmentList credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} onAdd={handleAddCommitment} onUpdate={handleUpdateCommitment} onDelete={handleDeleteCommitment} onAddCancellation={handleAddCancellation} userRole={currentUser.role} auditLogs={auditLogs} />}
          {activeTab === 'contracts' && <ContractList contracts={contracts} credits={credits} commitments={commitments} onAdd={handleAddContract} onUpdate={handleUpdateContract} onDelete={handleDeleteContract} userRole={currentUser.role} />}
          {activeTab === 'reports' && <Reports credits={credits} commitments={commitments} refunds={refunds} cancellations={cancellations} />}
          {activeTab === 'audit' && currentUser.role === 'ADMIN' && <AuditHistory logs={auditLogs} />}
          {activeTab === 'users' && currentUser.role === 'ADMIN' && <UserManagement users={users} setUsers={handleUpdateUsers} onDelete={handleDeleteUser} />}
        </div>
      </main>
    </div>
  );
};

export default App;
