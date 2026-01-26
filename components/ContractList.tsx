
import React, { useState, useMemo } from 'react';
import { Contract, UserRole } from '../types';
import ContractForm from './ContractForm';
import { Search, PlusCircle, Calendar, Briefcase, Building2, UserCircle, Clock, Info, X, Edit3, Trash2, AlertTriangle, CheckCircle2, FileText, Landmark } from 'lucide-react';

interface ContractListProps {
  contracts: Contract[];
  onAdd: (c: Contract) => void;
  onUpdate: (c: Contract) => void;
  onDelete: (id: string) => void;
  userRole: UserRole;
}

const ContractList: React.FC<ContractListProps> = ({ contracts, onAdd, onUpdate, onDelete, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);

  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

  const filteredContracts = useMemo(() => {
    return (contracts || []).filter(c => 
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.object.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  }, [contracts, searchTerm]);

  const getStatusInfo = (endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expirado', color: 'bg-red-500', border: 'border-red-500', text: 'text-red-600', isCritical: true };
    if (diffDays <= 90) return { label: `Vence em ${diffDays} dias`, color: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-600', isWarning: true };
    return { label: 'Vigente', color: 'bg-emerald-500', border: 'border-slate-100', text: 'text-emerald-600' };
  };

  if (showForm) {
    return (
      <ContractForm 
        onSave={(c) => { 
          if (editingContract) onUpdate(c); 
          else onAdd(c); 
          setShowForm(false); 
          setEditingContract(null); 
        }}
        onCancel={() => { setShowForm(false); setEditingContract(null); }}
        initialData={editingContract || undefined}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 text-black font-sans pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl">
              <Briefcase size={28} />
           </div>
           <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight leading-none">Controle de Contratos</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-2 italic">BIB 20 - Gestão de Ativos e Parcerias</p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar contrato ou empresa..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canEdit && (
            <button 
              onClick={() => { setEditingContract(null); setShowForm(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/10 transition-all flex items-center gap-2"
            >
              <PlusCircle size={18} /> Novo Contrato
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredContracts.length > 0 ? filteredContracts.map(contract => {
          const status = getStatusInfo(contract.endDate);
          return (
            <div 
              key={contract.id} 
              className={`bg-white rounded-[2.5rem] p-8 border-2 transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] flex flex-col justify-between group ${status.border}`}
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-widest border border-slate-200">
                      Nº {contract.contractNumber}
                    </span>
                    <span className={`text-[8px] font-black text-white px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-sm ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {status.isCritical && <AlertTriangle size={20} className="text-red-500 animate-pulse" />}
                  {status.isWarning && <Clock size={20} className="text-amber-500 animate-pulse" />}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4">
                    <Building2 className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Empresa Favorecida</p>
                      <h3 className="text-sm font-black text-slate-900 uppercase truncate leading-tight">{contract.companyName}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Briefcase className="text-slate-300" size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Objeto Resumido</p>
                      <p className="text-[11px] font-medium text-slate-600 truncate">{contract.object}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <UserCircle className="text-slate-300" size={20} />
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fiscal Titular</p>
                      <p className="text-[11px] font-black text-slate-800 uppercase italic tracking-tighter">{contract.mainFiscal}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor do Contrato</p>
                      <p className="text-lg font-black text-slate-900 tracking-tighter">{formatCurrency(contract.value)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Situação</p>
                      <p className="text-[10px] font-black text-emerald-600 uppercase italic">{contract.status}</p>
                   </div>
                </div>

                <div className="flex gap-3">
                   <button 
                     onClick={() => setDetailContract(contract)}
                     className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                   >
                     <Info size={14} /> Detalhes
                   </button>
                   {canEdit && (
                     <button 
                       onClick={() => { setEditingContract(contract); setShowForm(true); }}
                       className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                     >
                       <Edit3 size={14} /> Atualizar
                     </button>
                   )}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-24 text-center opacity-30">
            <Briefcase size={56} className="mx-auto mb-6 text-slate-300" />
            <p className="text-sm font-black uppercase tracking-[0.5em] text-slate-400 italic">Nenhum contrato ativo no sistema</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Contrato */}
      {detailContract && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20"><Briefcase size={24} /></div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic leading-none tracking-tight">Contrato {detailContract.contractNumber}</h3>
                  <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em] mt-3 italic">Ficha Técnica Contratual</p>
                </div>
              </div>
              <button onClick={() => setDetailContract(null)} className="p-3 hover:bg-slate-800 rounded-full transition-colors"><X size={28} /></button>
            </div>

            <div className="p-10 space-y-8 font-sans">
              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Empresa Favorecida</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{detailContract.companyName}</p>
                 </div>
                 <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Global</p>
                    <p className="text-xl font-black text-emerald-600">{formatCurrency(detailContract.value)}</p>
                 </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Objeto do Contrato</p>
                <p className="text-[11px] font-medium text-slate-700 leading-relaxed italic border-l-2 border-emerald-500/30 pl-5">{detailContract.object}</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                   <Calendar size={18} className="text-emerald-500" />
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vigência Início</p>
                      <p className="text-xs font-black text-slate-900">{new Date(detailContract.startDate).toLocaleDateString('pt-BR')}</p>
                   </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                   <Clock size={18} className="text-red-500" />
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vigência Término</p>
                      <p className="text-xs font-black text-slate-900">{new Date(detailContract.endDate).toLocaleDateString('pt-BR')}</p>
                   </div>
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-6">
                <div className="flex items-center gap-3 text-emerald-500 border-b border-slate-800 pb-3">
                  <UserCircle size={18} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Equipe de Fiscalização e Publicidade</span>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fiscal Titular</p>
                    <p className="text-xs font-black text-white italic">{detailContract.mainFiscal}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fiscal Substituto</p>
                    <p className="text-xs font-black text-white italic">{detailContract.substituteFiscal}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Situação Atual</p>
                    <p className="text-xs font-black text-emerald-400 uppercase italic">{detailContract.status}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Publicação em BI</p>
                    <p className="text-xs font-black text-white italic">{detailContract.biNumber}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center gap-4">
                {canEdit && (
                  <button 
                    onClick={() => onDelete(detailContract.id)}
                    className="flex items-center gap-2 text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={14} /> Excluir Contrato Definitivamente
                  </button>
                )}
                <button 
                  onClick={() => setDetailContract(null)}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all ml-auto"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractList;
