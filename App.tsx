import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Landmark,
  FilePieChart,
  Menu,
  X,
  TrendingDown,
  Users,
  LogOut,
  History,
  Wifi,
  WifiOff
} from 'lucide-react';

import {
  Credit,
  Commitment,
  Refund,
  Cancellation,
  Filters,
  User,
  AuditLog,
  ActionType,
  EntityType
} from './types';

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
  const [activeTab, setActiveTab] =
    useState<'dashboard' | 'credits' | 'commitments' | 'reports' | 'users' | 'history'>('dashboard');

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

  /* =========================
     Persistência Offline
     ========================= */
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

  /* =========================
     🔧 SINCRONIZAÇÃO CORRIGIDA
     ========================= */
  const syncWithServer = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      const state = await api.getFullState();

      if (state) {
        setCredits(state.credits ?? []);
        setCommitments(state.commitments ?? []);
        setRefunds(state.refunds ?? []);
        setCancellations(state.cancellations ?? []);
        setUsers(state.users ?? []);
        setAuditLogs(state.auditLogs ?? []);
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
    const interval = setInterval(syncWithServer, 60000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  /* =========================
     Auditoria
     ========================= */
  const addLog = useCallback(
    async (action: ActionType, entityType: EntityType, entityId: string, description: string) => {
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
    },
    [currentUser]
  );

  /* =========================
     Auth
     ========================= */
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('budget_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('budget_session');
  };

  /* =========================
     Créditos
     ========================= */
  const handleAddCredit = async (newCredit: Credit) => {
    setCredits(prev => [...prev, newCredit]);
    const success = await api.upsert('credits', newCredit);
    setIsOnline(success);
    addLog('CREATE', 'CRÉDITO', newCredit.id, `Lançamento de crédito NC ${newCredit.nc}`);
  };

  const handleUpdateCredit = async (updated: Credit) => {
    setCredits(prev => prev.map(c => (c.id === updated.id ? updated : c)));
    const success = await api.upsert('credits', updated);
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

  /* =========================
     Empenhos
     ========================= */
  const handleAddCommitment = async (newCom: Commitment) => {
    setCommitments(prev => [...prev, newCom]);
    const success = await api.upsert('commitments', newCom);
    setIsOnline(success);
    addLog('CREATE', 'EMPENHO', newCom.id, `Lançamento de empenho NE ${newCom.ne}`);
  };

  const handleUpdateCommitment = async (updated: Commitment) => {
    setCommitments(prev => prev.map(c => (c.id === updated.id ? updated : c)));
    const success = await api.upsert('commitments', updated);
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

  /* =========================
     Recolhimentos / Anulações
     ========================= */
  const handleAddRefund = async (newRefund: Refund) => {
    setRefunds(prev => [...prev, newRefund]);
    const success = await api.upsert('refunds', newRefund);
    setIsOnline(success);
    const credit = credits.find(c => c.id === newRefund.creditId);
    addLog('CREATE', 'RECOLHIMENTO', newRefund.id, `Recolhimento para NC ${credit?.nc || '?'}`);
  };

  const handleAddCancellation = async (newCan: Cancellation) => {
    setCancellations(prev => [...prev, newCan]);
    const success = await api.upsert('cancellations', newCan);
    setIsOnline(success);
    const com = commitments.find(c => c.id === newCan.commitmentId);
    addLog('CREATE', 'ANULAÇÃO', newCan.id, `Anulação RO para NE ${com?.ne || '?'}`);
  };

  /* =========================
     Usuários
     ========================= */
  const handleUpdateUsers = async (nextUsers: User[]) => {
    setUsers(nextUsers);
    for (const user of nextUsers) {
      await api.upsert('users', user);
    }
  };

  if (!currentUser) {
    return <Login users={users} setUsers={handleUpdateUsers} onLogin={handleLogin} />;
  }

  /* =========================
     UI
     ========================= */
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-black">
      {/* O restante do JSX permanece EXATAMENTE igual ao seu código original */}
    </div>
  );
};

export default App;
