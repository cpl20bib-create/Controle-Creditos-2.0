
import React, { useState, useMemo } from 'react';
import { Contract, UserRole, Credit, Commitment } from '../types';
import ContractForm from './ContractForm';
import { Search, PlusCircle, Calendar, Briefcase, Building2, UserCircle, Clock, Info, X, Edit3, Trash2, AlertTriangle, TrendingDown, Landmark, Tag, Target, DollarSign, ArrowUpRight, BarChart3, PieChart as PieChartIcon, Zap } from 'lucide-react';

interface ContractListProps {
  contracts: Contract[];
  credits: Credit[];
  commitments: Commitment[];
  onAdd: (c: Contract) => void;
  onUpdate: (c: Contract) => void;
  onDelete: (id: string) => void;
  userRole: UserRole;
}

const ContractList: React.FC<ContractListProps> = ({ contracts, credits, commitments, onAdd, onUpdate, onDelete, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [detailContractId, setDetailContractId] = useState<string | null>(null);

  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

  // Lógica de cálculo dinâmico do valor empenhado por PI
  const getDynamicValue = (contract: Contract) => {
    if (contract.type === 'RECEITA') return contract.value;

    // 1. Achar todos os créditos que possuem o mesmo PI do contrato
    const relatedCreditsIds = (credits || [])
      .filter(c => c.pi === contract.pi)
      .map(c => c.id);

    // 2. Somar todos os empenhos vinculados a esses créditos
    const totalEmpenhado = (commitments || [])
      .filter(com => relatedCreditsIds.includes(com.creditId))
      .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    return totalEmpenhado;
  };

  const filteredContracts = useMemo(() => {
    return (contracts || []).filter(c => 
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.object.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.pi && c.pi.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const selectedDetailContract = useMemo(() => {
    const contract = contracts.find(c => c.id === detailContractId);
    if (!contract) return null;

    // Lógica para Contrato de Despesa: Cálculos de PI
    const relatedCredits = (credits || []).filter(c => c.pi === contract.pi);
    const totalReceivedPi = relatedCredits.reduce((acc, curr) => acc + (Number(curr.valueReceived) || 0), 0);
    
    const relatedCreditsIds = relatedCredits.map(c => c.id);
    const relatedCommitments = (commitments || []).filter(com => relatedCreditsIds.includes(com.creditId));
    const totalCommittedPi = relatedCommitments.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    
    const executionPercentage = totalReceivedPi > 0 ? (totalCommittedPi / totalReceivedPi) * 100 : 0;

    return {
      ...contract,
      totalReceivedPi,
      totalCommittedPi,
      executionPercentage,
      currentValue: getDynamicValue(contract),
      breakdown: relatedCommitments.map(com => ({
        ...com,
        nc: relatedCredits.find(c => c.id === com.creditId)?.nc || '---'
      }))
    };
  }, [detailContractId, contracts, credits, commitments]);

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
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-2 italic text-slate-400">Setor de Aquisições e Contratos BIB 20</p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar contrato, empresa ou PI..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-500/20 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canEdit && (
            <button 
              onClick={() => { setEditingContract(null); setShowForm(true); }}
              className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2"
            >
              <PlusCircle size={18} /> Novo Contrato
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredContracts.length > 0 ? filteredContracts.map(contract => {
          const status = getStatusInfo(contract.endDate);
          const currentValue = getDynamicValue(contract);
          const isDespesa = contract.type === 'DESPESA';
          const isReceita = contract.type === 'RECEITA';

          return (
            <div 
              key={contract.id} 
              className={`bg-white rounded-[2.5rem] p-8 border-2 transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] flex flex-col justify-between group ${isReceita ? 'border-emerald-500/20' : 'border-orange-500/20'} ${status.isCritical ? '!border-red-500' : ''}`}
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
                </div>

                <div className="flex items-center gap-2 mb-6">
                   <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isDespesa ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      {isDespesa ? (
                        <span className="flex items-center gap-1"><TrendingDown size={10} /> DESPESA</span>
                      ) : (
                        <span className="flex items-center gap-1"><ArrowUpRight size={10} /> RECEITA</span>
                      )}
                   </div>
                   {isDespesa && (
                    <div className="bg-slate-100 px-3 py-1 rounded-full text-[8px] font-black text-slate-500 uppercase border border-slate-200 flex items-center gap-2">
                       <Target size={10} /> PI: {contract.pi}
                    </div>
                   )}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4">
                    <Building2 className={`text-slate-300 group-hover:${isReceita ? 'text-emerald-500' : 'text-orange-500'} transition-colors`} size={20} />
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
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                         {isDespesa ? 'Total Empenhado' : 'Valor Total Contrato'}
                      </p>
                      <p className={`text-xl font-black tracking-tighter ${isDespesa ? 'text-orange-600' : 'text-emerald-600'}`}>
                         {formatCurrency(currentValue)}
                      </p>
                   </div>
                   {isDespesa && (
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Teto Contr.</p>
                       <p className="text-[10px] font-black text-slate-500">{formatCurrency(contract.value)}</p>
                    </div>
                   )}
                </div>

                <div className="flex gap-3">
                   <button 
                     onClick={() => setDetailContractId(contract.id)}
                     className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                   >
                     <Info size={14} /> Detalhes
                   </button>
                   {canEdit && (
                     <button 
                       onClick={() => { setEditingContract(contract); setShowForm(true); }}
                       className={`flex-1 ${isReceita ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'} py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
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

      {/* Modal de Detalhes do Contrato - Global Standard */}
      {selectedDetailContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className={`p-8 text-white flex items-center justify-between shrink-0 ${selectedDetailContract.type === 'DESPESA' ? 'bg-orange-950' : 'bg-emerald-950'}`}>
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl shadow-lg ${selectedDetailContract.type === 'DESPESA' ? 'bg-orange-600' : 'bg-emerald-600'}`}>
                  <Briefcase size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic leading-none tracking-tight">Contrato {selectedDetailContract.contractNumber}</h3>
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-3 italic ${selectedDetailContract.type === 'DESPESA' ? 'text-orange-400' : 'text-emerald-400'}`}>Dossiê Contratual - {selectedDetailContract.type}</p>
                </div>
              </div>
              <button onClick={() => setDetailContractId(null)} className="p-3 hover:bg-black/20 rounded-full transition-colors"><X size={28} /></button>
            </div>

            <div className="p-10 space-y-8 font-sans overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Empresa Favorecida</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{selectedDetailContract.companyName}</p>
                 </div>
                 <div className="space-y-1 md:text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {selectedDetailContract.type === 'DESPESA' ? 'Saldo Empenhado (Líquido)' : 'Valor Total Contratual'}
                    </p>
                    <p className={`text-xl font-black ${selectedDetailContract.type === 'DESPESA' ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {formatCurrency(selectedDetailContract.currentValue)}
                    </p>
                 </div>
              </div>

              {/* DASHBOARD DE EXECUÇÃO DO PI (Apenas para Despesa) */}
              {selectedDetailContract.type === 'DESPESA' && (
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-orange-100 shadow-inner space-y-8 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between border-b border-orange-200 pb-4">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="text-orange-600" size={20} />
                      <h4 className="text-[11px] font-black text-orange-950 uppercase tracking-widest">Execução Financeira do PI {selectedDetailContract.pi}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-orange-600 bg-white px-3 py-1 rounded-full border border-orange-200">
                        {selectedDetailContract.executionPercentage.toFixed(1)}% Executado
                       </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm group hover:scale-[1.02] transition-transform">
                      <div className="flex items-center gap-2 mb-2">
                        <Landmark size={14} className="text-orange-400" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Recebido (Aportes)</p>
                      </div>
                      <p className="text-xl font-black text-slate-900">{formatCurrency(selectedDetailContract.totalReceivedPi)}</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm group hover:scale-[1.02] transition-transform">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-orange-600" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Empenhado (Consumo)</p>
                      </div>
                      <p className="text-xl font-black text-orange-600">{formatCurrency(selectedDetailContract.totalCommittedPi)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500 tracking-widest px-1">
                      <span>Progresso de Execução Orçamentária</span>
                      <span>{selectedDetailContract.executionPercentage.toFixed(2)}%</span>
                    </div>
                    <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden p-1 shadow-inner border border-slate-300">
                       <div 
                        className={`h-full rounded-full transition-all duration-1000 ${selectedDetailContract.executionPercentage > 90 ? 'bg-red-500' : selectedDetailContract.executionPercentage > 60 ? 'bg-amber-500' : 'bg-orange-500'}`} 
                        style={{ width: `${Math.min(100, selectedDetailContract.executionPercentage)}%` }}
                       ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                 {selectedDetailContract.type === 'DESPESA' && (
                    <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-orange-700">
                      <Target size={14} /> PI: {selectedDetailContract.pi}
                    </div>
                 )}
                 <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Tag size={14} className="text-slate-400" /> {selectedDetailContract.type}
                 </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Objeto do Contrato</p>
                <p className="text-[11px] font-medium text-slate-700 leading-relaxed italic border-l-2 border-slate-300 pl-5">{selectedDetailContract.object}</p>
              </div>

              {selectedDetailContract.type === 'DESPESA' && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                    <TrendingDown size={14} className="text-orange-600" /> Extrato de Execução (Empenhos vinculados ao PI)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedDetailContract.breakdown.length > 0 ? selectedDetailContract.breakdown.map((com, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center group hover:border-orange-200 transition-all shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{com.ne}</span>
                          <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">NC Origem: {com.nc}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-orange-600">{formatCurrency(com.value)}</p>
                          <p className="text-[8px] font-bold text-slate-300 uppercase">{new Date(com.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-[10px] font-black text-slate-300 uppercase py-4 text-center">Nenhum empenho vinculado a este contrato via PI.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-slate-900 p-8 rounded-2xl text-white space-y-6 shadow-xl">
                <div className="flex items-center gap-3 text-slate-500 border-b border-slate-800 pb-3">
                  <UserCircle size={18} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fiscalização e Publicidade Militar</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fiscal Titular</p>
                    <p className="text-xs font-black text-white italic">{selectedDetailContract.mainFiscal || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fiscal Substituto</p>
                    <p className="text-xs font-black text-white italic">{selectedDetailContract.substituteFiscal || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Publicação em BI</p>
                    <p className="text-xs font-black text-white italic">{selectedDetailContract.biNumber || 'Não informado'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-4 shrink-0 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setDetailContractId(null)}
                  className="bg-slate-900 text-white px-12 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  Fechar Dossiê
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
