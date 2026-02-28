
import React, { useState, useMemo } from 'react';
import { Contract, UserRole, Credit, Commitment } from '../types';
import ContractForm from './ContractForm';
import { formatDateBR, parseLocalDate } from '../utils/dateUtils';
import { Search, PlusCircle, Calendar, Briefcase, Building2, UserCircle, Clock, Info, X, Edit3, Trash2, AlertTriangle, TrendingDown, Landmark, Tag, Target, DollarSign, ArrowUpRight, BarChart3, PieChart as PieChartIcon, Zap, CalendarDays, FileText, UserCheck, ShieldCheck } from 'lucide-react';

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

    const relatedCreditsIds = (credits || [])
      .filter(c => c.pi === contract.pi)
      .map(c => c.id);

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
    ).sort((a, b) => parseLocalDate(a.endDate).getTime() - parseLocalDate(b.endDate).getTime());
  }, [contracts, searchTerm]);

  const getStatusInfo = (endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseLocalDate(endDate);
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

    const isDespesa = contract.type === 'DESPESA';
    
    // Lógica para Contrato de Despesa: Cálculos de PI
    const relatedCredits = (credits || [])
      .filter(c => c.pi === contract.pi)
      .sort((a, b) => parseLocalDate(b.created_at || '').getTime() - parseLocalDate(a.created_at || '').getTime());
    
    const totalReceivedPi = relatedCredits.reduce((acc, curr) => acc + (Number(curr.valueReceived) || 0), 0);
    
    const relatedCreditsIds = relatedCredits.map(c => c.id);
    const relatedCommitments = (commitments || []).filter(com => relatedCreditsIds.includes(com.creditId));
    const totalCommittedPi = relatedCommitments.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    
    const executionPercentage = totalReceivedPi > 0 ? (totalCommittedPi / totalReceivedPi) * 100 : 0;

    const latestCredit = relatedCredits[0] || null;

    return {
      ...contract,
      totalReceivedPi,
      totalCommittedPi,
      executionPercentage,
      latestCreditDescription: latestCredit?.description || null,
      currentValue: getDynamicValue(contract),
      breakdown: isDespesa ? relatedCommitments.map(com => ({
        ...com,
        nc: relatedCredits.find(c => c.id === com.creditId)?.nc || '---'
      })) : []
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

      {/* Modal de Detalhes do Contrato - Redesenhado */}
      {selectedDetailContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className={`p-8 text-white flex items-center justify-between shrink-0 ${selectedDetailContract.type === 'DESPESA' ? 'bg-orange-950' : 'bg-emerald-950'}`}>
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-2xl shadow-lg ${selectedDetailContract.type === 'DESPESA' ? 'bg-orange-600' : 'bg-emerald-600'}`}>
                  <Briefcase size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic leading-none tracking-tight">Contrato {selectedDetailContract.contractNumber}</h3>
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-3 italic ${selectedDetailContract.type === 'DESPESA' ? 'text-orange-400' : 'text-emerald-400'}`}>Dossiê Contratual - {selectedDetailContract.type}</p>
                </div>
              </div>
              <button onClick={() => setDetailContractId(null)} className="p-3 hover:bg-black/20 rounded-full transition-colors"><X size={32} /></button>
            </div>

            <div className="p-8 lg:p-10 space-y-8 font-sans overflow-y-auto flex-1 custom-scrollbar">
              
              {/* SEÇÃO 1: Identificação e Cabeçalho de Valores */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa Favorecida (Contratada)</p>
                       <p className="text-lg font-black text-slate-900 uppercase italic">{selectedDetailContract.companyName}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><FileText size={12} /> Objeto do Contrato</p>
                       <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic line-clamp-3">{selectedDetailContract.object}</p>
                    </div>
                 </div>
                 
                 <div className={`${selectedDetailContract.type === 'DESPESA' ? 'bg-orange-50' : 'bg-emerald-50'} p-6 rounded-2xl border ${selectedDetailContract.type === 'DESPESA' ? 'border-orange-100' : 'border-emerald-100'} shadow-sm flex flex-col justify-center items-center text-center`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${selectedDetailContract.type === 'DESPESA' ? 'text-orange-800' : 'text-emerald-800'}`}>
                      {selectedDetailContract.type === 'DESPESA' ? 'Teto Orçamentário' : 'Valor Total Contratual'}
                    </p>
                    <p className={`text-2xl font-black ${selectedDetailContract.type === 'DESPESA' ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {formatCurrency(selectedDetailContract.value)}
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Modalidade: {selectedDetailContract.status}</span>
                 </div>
              </div>

              {/* SEÇÃO 2: Prazos e Fiscalização */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Card de Vigência */}
                 <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3 text-slate-600">
                       <Calendar size={18} />
                       <h4 className="text-[10px] font-black uppercase tracking-widest">Prazos e Vigência</h4>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Início do Contrato</p>
                          <p className="text-xs font-black text-slate-900 italic">{formatDateBR(selectedDetailContract.startDate)}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Término do Contrato</p>
                          <p className="text-xs font-black text-red-600 italic">{formatDateBR(selectedDetailContract.endDate)}</p>
                       </div>
                       <div className="col-span-2 space-y-1 pt-2 border-t border-slate-50">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Publicação em Boletim Interno (BI)</p>
                          <p className="text-xs font-black text-slate-900">{selectedDetailContract.biNumber || 'Aguardando publicação...'}</p>
                       </div>
                    </div>
                 </div>

                 {/* Card de Fiscalização */}
                 <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3 text-slate-600">
                       <UserCheck size={18} />
                       <h4 className="text-[10px] font-black uppercase tracking-widest">Equipe de Fiscalização</h4>
                    </div>
                    <div className="p-6 space-y-6">
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ShieldCheck size={20} /></div>
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fiscal Titular</p>
                             <p className="text-xs font-black text-slate-900 uppercase italic">{selectedDetailContract.mainFiscal || 'Não nomeado'}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-slate-50 text-slate-400 rounded-lg"><UserCircle size={20} /></div>
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fiscal Substituto</p>
                             <p className="text-xs font-black text-slate-900 uppercase italic">{selectedDetailContract.substituteFiscal || 'Não nomeado'}</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* SEÇÃO 3: Dashboards Financeiros (Apenas Despesa) */}
              {selectedDetailContract.type === 'DESPESA' && (
                <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                  
                  {/* Dashboard de Execução do PI */}
                  <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                    
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="text-emerald-500" size={20} />
                        <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Execução Orçamentária do PI {selectedDetailContract.pi}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                          {selectedDetailContract.executionPercentage.toFixed(1)}% Consumido
                         </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-2 mb-2">
                          <Landmark size={14} className="text-slate-500" />
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aportes Recebidos (Total PI)</p>
                        </div>
                        <p className="text-2xl font-black text-white italic">{formatCurrency(selectedDetailContract.totalReceivedPi)}</p>
                      </div>
                      
                      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={14} className="text-orange-500" />
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Empenhado (Consumo PI)</p>
                        </div>
                        <p className="text-2xl font-black text-orange-500 italic">{formatCurrency(selectedDetailContract.totalCommittedPi)}</p>
                      </div>
                    </div>

                    <div className="space-y-3 relative z-10">
                      <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden p-1 shadow-inner border border-slate-800">
                         <div 
                          className={`h-full rounded-full transition-all duration-1000 ${selectedDetailContract.executionPercentage > 90 ? 'bg-red-500' : selectedDetailContract.executionPercentage > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(100, selectedDetailContract.executionPercentage)}%` }}
                         ></div>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 4: PREVISÃO DE COBERTURA (STATUS DA NOTA DE CRÉDITO) */}
                  <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-200 shadow-sm space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="text-orange-700" size={20} />
                          <h4 className="text-[11px] font-black text-orange-900 uppercase tracking-widest italic">Status da Cobertura de Crédito</h4>
                        </div>
                        <span className="bg-orange-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm animate-pulse">Último Aporte do Comando</span>
                     </div>
                     
                     <div className="bg-white/80 p-6 rounded-2xl border border-orange-100 shadow-inner">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Descrição de Competência da Última Nota de Crédito</p>
                        <p className="text-[12px] font-bold text-slate-700 italic border-l-4 border-orange-300 pl-6 leading-relaxed">
                          {selectedDetailContract.latestCreditDescription ? 
                            `"${selectedDetailContract.latestCreditDescription}"` : 
                            "⚠️ Nenhuma Nota de Crédito vinculada a este PI foi encontrada no sistema. Verifique os lançamentos de crédito."
                          }
                        </p>
                        <p className="text-[10px] text-orange-800 mt-4 font-black flex items-center gap-2">
                           <Info size={14} /> Esta informação indica até qual mês o recurso recebido cobre as faturas.
                        </p>
                     </div>
                  </div>

                  {/* SEÇÃO 5: EXTRATO DE EXECUÇÃO */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                      <TrendingDown size={14} className="text-orange-600" /> Histórico de Empenhos Vinculados (PI)
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {selectedDetailContract.breakdown.length > 0 ? selectedDetailContract.breakdown.map((com, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-orange-200 transition-all shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{com.ne}</span>
                            <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">NC Origem: {com.nc}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-orange-600">{formatCurrency(com.value)}</p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase">{formatDateBR(com.date)}</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-[10px] font-black text-slate-300 uppercase py-6 text-center italic">Sem empenhos emitidos para este PI até o momento.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-4 shrink-0 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setDetailContractId(null)}
                  className="bg-slate-950 text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl active:scale-95"
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
