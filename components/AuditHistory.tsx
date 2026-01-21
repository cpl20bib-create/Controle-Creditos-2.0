
import React, { useState, useMemo, useEffect } from 'react';
import { AuditLog, ActionType, EntityType } from '../types';
import { Search, History, Clock, User, FileText, Tag, FilterX } from 'lucide-react';

interface AuditHistoryProps {
  logs: AuditLog[];
}

const AuditHistory: React.FC<AuditHistoryProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<ActionType | ''>('');
  const [filterEntity, setFilterEntity] = useState<EntityType | ''>('');

  useEffect(() => {
    console.log('Audit logs loaded:', logs);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Tenta pegar o nome do join (users.name) ou o userName legado
      const operatorName = log.users?.name || log.userName || 'Operador Desconhecido';
      const description = log.description || '';
      const entityId = log.entityId || '';
      const tableName = log.table_name || log.entityType || '';

      const matchSearch = 
        operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entityId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchAction = !filterAction || log.action === filterAction;
      const matchEntity = !filterEntity || tableName === filterEntity;

      return matchSearch && matchAction && matchEntity;
    });
  }, [logs, searchTerm, filterAction, filterEntity]);

  const getActionBadge = (action: ActionType) => {
    switch (action) {
      case 'CREATE':
        return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Lançamento</span>;
      case 'UPDATE':
        return <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Alteração</span>;
      case 'DELETE':
        return <span className="bg-red-100 text-red-700 border border-red-200 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Exclusão</span>;
      default:
        return <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">{action}</span>;
    }
  };

  const formatDate = (isoString: string | undefined) => {
    if (!isoString) return { date: '--/--/--', time: '--:--' };
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { date: '--/--/--', time: '--:--' };
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-black">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar por operador, ID ou descrição..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            value={filterAction} 
            onChange={(e) => setFilterAction(e.target.value as ActionType | '')}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
          >
            <option value="">Todas as Ações</option>
            <option value="CREATE">Lançamentos</option>
            <option value="UPDATE">Alterações</option>
            <option value="DELETE">Exclusões</option>
          </select>

          <select 
            value={filterEntity} 
            onChange={(e) => setFilterEntity(e.target.value as EntityType | '')}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
          >
            <option value="">Todos os Módulos</option>
            <option value="CRÉDITO">Créditos</option>
            <option value="EMPENHO">Empenhos</option>
            <option value="RECOLHIMENTO">Recolhimentos</option>
            <option value="ANULAÇÃO">Anulações</option>
          </select>

          {(searchTerm || filterAction || filterEntity) && (
            <button 
              onClick={() => { setSearchTerm(''); setFilterAction(''); setFilterEntity(''); }}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
              title="Limpar filtros"
            >
              <FilterX size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={12} /> Data/Hora
                </th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Módulo</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição do Evento</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <User size={12} /> Operador
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length > 0 ? filteredLogs.map((log) => {
                const { date, time } = formatDate(log.created_at || log.timestamp);
                const operatorName = log.users?.name || log.userName || 'Operador';
                const tableName = log.table_name || log.entityType || '--';
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[10px] font-black text-slate-900 leading-none">{date}</div>
                      <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic tracking-tighter">{time}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{tableName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-bold text-slate-700 leading-relaxed max-w-md">{log.description}</p>
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mt-1">ID: {log.entity_id || log.entityId || '--'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                          {operatorName.charAt(0)}
                        </div>
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{operatorName}</span>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <History size={48} className="text-slate-400 mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Nenhum registro encontrado no histórico de auditoria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditHistory;
