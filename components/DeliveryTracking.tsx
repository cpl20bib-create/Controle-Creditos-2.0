import React, { useState, useMemo } from 'react';
import { Credit, Commitment, UserRole, CommitmentContact, Cancellation } from '../types';
import { Search, Filter, Calendar, MessageSquare, Truck, CheckCircle2, ChevronDown, ChevronUp, Plus, Clock, Info, PackageSearch, ArrowUp, ArrowDown, Trash2, Edit3, Save, X } from 'lucide-react';
import { parseLocalDate, formatDateBR } from '../utils/dateUtils';
import { ProcessTrackingModals } from './ProcessTrackingModals';
import { ProcessMetricsModal } from './ProcessMetricsModal';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const generateId = () => Math.random().toString(36).substr(2, 9);

interface DeliveryTrackingProps {
  credits: Credit[];
  commitments: Commitment[];
  cancellations: Cancellation[];
  onUpdateCommitment: (updated: Commitment) => void;
  onNotify?: (role: string, title: string, msg: string) => void;
  userRole: UserRole;
  userSections?: string[];
}

const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({ credits, commitments, cancellations, onUpdateCommitment, onNotify, userRole, userSections }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState(() => {
    if (userRole === 'ALMOXARIFADO' && userSections && userSections.length > 0) {
      return 'MINHAS_SECOES';
    }
    return '';
  });
  const [ugFilter, setUgFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [sortBy, setSortBy] = useState<'daysPassed' | 'value' | 'ne'>('ne');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDates, setPendingDates] = useState<Record<string, { sent?: string, received?: string, processNumber?: string }>>({});

  const applyProcessMask = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 5) v = v.slice(0, 5) + '.' + v.slice(5);
    if (v.length > 12) v = v.slice(0, 12) + '/' + v.slice(12);
    if (v.length > 17) v = v.slice(0, 17) + '-' + v.slice(17, 19);
    return v;
  };

  const handlePendingDateChange = (id: string, field: 'sent' | 'received' | 'processNumber', value: string) => {
    setPendingDates(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };
  const handleSaveDates = (com: any) => {
    const sent = pendingDates[com.id]?.sent !== undefined ? pendingDates[com.id].sent : (com.sentToCompanyDate || '');
    const received = pendingDates[com.id]?.received !== undefined ? pendingDates[com.id].received : (com.receivedFromCompanyDate || '');
    const processNumber = pendingDates[com.id]?.processNumber !== undefined ? pendingDates[com.id].processNumber : (com.processNumber || '');
    com.originalCommitments.forEach((origCom: any) => {
      const updatedCom = { ...origCom, sentToCompanyDate: sent || undefined, receivedFromCompanyDate: received || undefined, processNumber: processNumber || undefined };
      onUpdateCommitment(updatedCom);
    });
    alert('Datas salvas com sucesso!');
  };

  const [newContactDate, setNewContactDate] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');
  const [newContactExpectedDelivery, setNewContactExpectedDelivery] = useState('');

  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactDate, setEditContactDate] = useState('');
  const [editContactNotes, setEditContactNotes] = useState('');
  const [editContactExpectedDelivery, setEditContactExpectedDelivery] = useState('');

  const [showConfDocModal, setShowConfDocModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  const canEditItem = (itemSection: string) => {
    if (userRole === 'ADMIN' || userRole === 'EDITOR') return true;
    if (userRole === 'ALMOXARIFADO') {
      if (!userSections || userSections.length === 0) return true;
      return userSections.includes(itemSection);
    }
    return false;
  };

  // Map commitments to include credit info
  const mappedCommitments = useMemo(() => {
    return commitments
      .filter(com => {
        const totalCancellations = cancellations
          .filter(c => c.commitmentId === com.id)
          .reduce((sum, c) => sum + c.value, 0);
        const balance = com.value - totalCancellations;
        return balance > 0;
      })
      .map(com => {
      const credit = credits.find(c => c.id === com.creditId);
      
      let daysPassed = 0;
      if (com.date) {
        const comDate = parseLocalDate(com.date);
        if (comDate) {
          const today = new Date();
          today.setHours(0,0,0,0);
          comDate.setHours(0,0,0,0);
          daysPassed = Math.floor((today.getTime() - comDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      return {
        ...com,
        section: credit?.section || 'Desconhecida',
        pi: credit?.pi || 'N/A',
        ug: credit?.ug || 'N/A',
        creditDescription: credit?.description || 'Sem descrição',
        daysPassed: daysPassed >= 0 ? daysPassed : 0
      };
    });
  }, [commitments, credits, cancellations]);

  const groupedCommitments = useMemo(() => {
    const groups: Record<string, any> = {};
    mappedCommitments.forEach(com => {
      const key = `${com.ne}_${com.ug}`;
      if (!groups[key]) {
        groups[key] = {
          ...com,
          id: key, // Use composite key for iteration
          originalCommitments: [com],
          value: com.value,
          description: com.description,
          pi: com.pi,
        };
      } else {
        groups[key].value += com.value;
        groups[key].originalCommitments.push(com);
        
        // Merge descriptions
        if (com.description && !groups[key].description.includes(com.description)) {
           groups[key].description += ` / ${com.description}`;
        }
        
        // Merge PIs
        if (com.pi && !groups[key].pi.includes(com.pi)) {
           groups[key].pi += `, ${com.pi}`;
        }

        // Maintain logic for material arrival (if any part is missing, the whole group is missing)
        if (!com.materialArrivedDate) {
          groups[key].materialArrivedDate = undefined;
        }

        if (com.type && com.type !== 'Ordinário' && (!groups[key].type || groups[key].type === 'Ordinário')) {
          groups[key].type = com.type;
        }

        if (com.materialArrivals && com.materialArrivals.length > (groups[key].materialArrivals?.length || 0)) {
           groups[key].materialArrivals = com.materialArrivals;
        }

        // Inherit contacts if one has more up-to-date contacts
        if (com.contacts && com.contacts.length > (groups[key].contacts?.length || 0)) {
           groups[key].contacts = com.contacts;
        }
        
        if (com.sentToCompanyDate && !groups[key].sentToCompanyDate) {
          groups[key].sentToCompanyDate = com.sentToCompanyDate;
        }
        if (com.receivedFromCompanyDate && !groups[key].receivedFromCompanyDate) {
          groups[key].receivedFromCompanyDate = com.receivedFromCompanyDate;
        }
      }
    });
    return Object.values(groups);
  }, [mappedCommitments]);

  const sections = useMemo(() => {
    return Array.from(new Set(groupedCommitments.map(c => c.section))).sort();
  }, [groupedCommitments]);

  const ugs = useMemo(() => {
    return Array.from(new Set(groupedCommitments.map(c => c.ug))).sort();
  }, [groupedCommitments]);

  const filteredCommitments = useMemo(() => {
    return groupedCommitments.filter(com => {
      const matchesSearch = 
        com.ne.toLowerCase().includes(searchTerm.toLowerCase()) || 
        com.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        com.pi.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = sectionFilter === 'MINHAS_SECOES' 
        ? (userSections || []).includes(com.section)
        : (sectionFilter ? com.section === sectionFilter : true);
      const matchesUg = ugFilter ? com.ug === ugFilter : true;
      const matchesType = typeFilter ? com.type === typeFilter : true;
      const matchesPending = showOnlyPending ? !com.materialArrivedDate : true;
      return matchesSearch && matchesSection && matchesUg && matchesType && matchesPending;
    }).sort((a, b) => {
      // Sort by unresolved first
      if (a.materialArrivedDate && !b.materialArrivedDate) return 1;
      if (!a.materialArrivedDate && b.materialArrivedDate) return -1;
      
      let comparison = 0;
      if (sortBy === 'daysPassed') {
        comparison = a.daysPassed - b.daysPassed;
      } else if (sortBy === 'value') {
        comparison = (a.value || 0) - (b.value || 0);
      } else if (sortBy === 'ne') {
        comparison = a.ne.localeCompare(b.ne);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [groupedCommitments, searchTerm, sectionFilter, ugFilter, showOnlyPending, sortBy, sortOrder]);

  const handleAddContact = (e: React.MouseEvent, com: any) => {
    e.preventDefault();
    if (!newContactDate || !newContactNotes) {
      alert("Preencha a data e os detalhes do contato.");
      return;
    }

    const newContact: CommitmentContact = {
      id: generateId(),
      date: newContactDate,
      notes: newContactNotes,
      expectedDeliveryDate: newContactExpectedDelivery || undefined,
    };

    com.originalCommitments.forEach((origCom: Commitment) => {
      const updatedCom = {
        ...origCom,
        contacts: [...(origCom.contacts || []), newContact]
      };
      onUpdateCommitment(updatedCom);
    });

    setNewContactDate('');
    setNewContactNotes('');
    setNewContactExpectedDelivery('');
  };

  const startEditingContact = (contact: CommitmentContact) => {
    setEditingContactId(contact.id);
    setEditContactDate(contact.date);
    setEditContactNotes(contact.notes);
    setEditContactExpectedDelivery(contact.expectedDeliveryDate || '');
  };

  const handleSaveEditContact = (e: React.MouseEvent, com: any) => {
    e.preventDefault();
    if (!editContactDate || !editContactNotes) {
      alert("Preencha a data e os detalhes do contato.");
      return;
    }

    com.originalCommitments.forEach((origCom: Commitment) => {
      const updatedContacts = (origCom.contacts || []).map(c => 
        c.id === editingContactId 
          ? { ...c, date: editContactDate, notes: editContactNotes, expectedDeliveryDate: editContactExpectedDelivery || undefined }
          : c
      );
  
      const updatedCom = {
        ...origCom,
        contacts: updatedContacts
      };
  
      onUpdateCommitment(updatedCom);
    });

    setEditingContactId(null);
  };

  const handleDeleteContact = (com: any, contactId: string) => {
    if (window.confirm("Deseja realmente excluir este contato?")) {
      com.originalCommitments.forEach((origCom: Commitment) => {
        const updatedContacts = (origCom.contacts || []).filter(c => c.id !== contactId);
        const updatedCom = {
          ...origCom,
          contacts: updatedContacts
        };
        onUpdateCommitment(updatedCom);
      });
    }
  };

  const handleAddMaterialArrival = (com: any, date: string, value: number, invoice?: string) => {
    if (!date || value <= 0) return;
    const newArrival = { id: generateId(), date, value, invoice };
    com.originalCommitments.forEach((origCom: Commitment) => {
      const updatedCom = { ...origCom, materialArrivals: [...(origCom.materialArrivals || []), newArrival] };
      onUpdateCommitment(updatedCom);
    });
  };

  const handleRemoveMaterialArrival = (com: any, arrivalId: string) => {
    com.originalCommitments.forEach((origCom: Commitment) => {
      const updatedCom = { ...origCom, materialArrivals: (origCom.materialArrivals || []).filter(a => a.id !== arrivalId) };
      onUpdateCommitment(updatedCom);
    });
  };

  const handleToggleMaterialArrived = (com: any, invoice?: string) => {
    const isArrived = !!com.materialArrivedDate;
    
    if (isArrived) {
       // mark as not arrived
       com.originalCommitments.forEach((origCom: Commitment) => {
         const updatedCom = { ...origCom };
         delete updatedCom.materialArrivedDate;
         delete updatedCom.invoice;
         onUpdateCommitment(updatedCom);
       });
    } else {
       // mark as arrived today
       const today = new Date().toISOString().split('T')[0];
       com.originalCommitments.forEach((origCom: Commitment) => {
         const updatedCom = { ...origCom, materialArrivedDate: today, invoice: invoice || undefined };
         onUpdateCommitment(updatedCom);
       });
    }
  };

  const handleUpdateSentDate = (com: any, date: string) => {
    com.originalCommitments.forEach((origCom: Commitment) => {
      const updatedCom = { ...origCom, sentToCompanyDate: date || undefined };
      onUpdateCommitment(updatedCom);
    });
  };

  const handleUpdateReceivedDate = (com: any, date: string) => {
    com.originalCommitments.forEach((origCom: Commitment) => {
      const updatedCom = { ...origCom, receivedFromCompanyDate: date || undefined };
      onUpdateCommitment(updatedCom);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Acompanhamento de Entregas</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Tratativas com fornecedores e prazos de empenhos</p>
        </div>
        <div className="flex flex-wrap gap-2">
           {(userRole === 'ALMOXARIFADO' || userRole === 'ADMIN' || userRole === 'EDITOR') && (
             <button onClick={() => setShowConfDocModal(true)} className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2">
               <ArrowUp size={14} /> DIEx Remessa (Almoxarifado)
             </button>
           )}
           {(userRole === 'CONFORMADOR' || userRole === 'ADMIN' || userRole === 'EDITOR') && (
             <button onClick={() => setShowFinanceModal(true)} className="px-4 py-2 bg-amber-50 text-amber-700 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-2">
               <ArrowUp size={14} /> P/ Liquidação (Conf. Doc)
             </button>
           )}
           <button onClick={() => setShowMetricsModal(true)} className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2">
             <Clock size={14} /> Métricas de Tempo
           </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por NE, descrição ou PI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all font-medium text-slate-700"
          />
        </div>
        <div className="md:w-64 relative w-full">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            // disabled={!!userSections?.length}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all appearance-none font-medium text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            <option value="">Todas as Seções</option>
            {userRole === 'ALMOXARIFADO' && userSections && userSections.length > 0 && (
              <option value="MINHAS_SECOES">Minhas Seções</option>
            )}
            {sections.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>
        <div className="md:w-48 relative w-full">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={ugFilter}
            onChange={(e) => setUgFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all appearance-none font-medium text-slate-700 bg-white"
          >
            <option value="">Todas as UGs</option>
            {ugs.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="md:w-48 relative w-full">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all appearance-none font-medium text-slate-700 bg-white"
          >
            <option value="">Todos os Tipos</option>
            <option value="Ordinário">Ordinário</option>
            <option value="Global">Global</option>
            <option value="Estimativo">Estimativo</option>
          </select>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 px-2 md:px-0">
          <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
            <input 
              type="checkbox" 
              checked={showOnlyPending}
              onChange={(e) => setShowOnlyPending(e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm font-bold text-slate-700 uppercase tracking-widest">Apenas Não Recebidos</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Desktop Headers */}
        {filteredCommitments.length > 0 && (
          <div className="hidden md:flex items-center px-5 py-2">
            <div className="flex-1 pl-[68px]">
              <button 
                onClick={() => {
                  if (sortBy === 'ne') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('ne'); setSortOrder('asc'); }
                }}
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest hover:text-emerald-600 transition-colors group"
              >
                <span className={sortBy === 'ne' ? 'text-emerald-600' : 'text-slate-400'}>Detalhes do Empenho</span>
                <span className={sortBy === 'ne' ? 'text-emerald-600' : 'text-transparent group-hover:text-slate-300'}>
                  {sortBy === 'ne' && sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-6 shrink-0 pr-10">
              <div className="w-24 text-right">
                <button 
                  onClick={() => {
                    if (sortBy === 'daysPassed') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('daysPassed'); setSortOrder('desc'); }
                  }}
                  className="inline-flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-widest hover:text-emerald-600 transition-colors group"
                >
                  <span className={sortBy === 'daysPassed' ? 'text-emerald-600' : 'text-slate-400'}>Emitido há</span>
                  <span className={sortBy === 'daysPassed' ? 'text-emerald-600' : 'text-transparent group-hover:text-slate-300'}>
                    {sortBy === 'daysPassed' && sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  </span>
                </button>
              </div>
              <div className="w-24 text-right">
                <button 
                  onClick={() => {
                    if (sortBy === 'value') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('value'); setSortOrder('desc'); }
                  }}
                  className="inline-flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-widest hover:text-emerald-600 transition-colors group"
                >
                  <span className={sortBy === 'value' ? 'text-emerald-600' : 'text-slate-400'}>Valor</span>
                  <span className={sortBy === 'value' ? 'text-emerald-600' : 'text-transparent group-hover:text-slate-300'}>
                    {sortBy === 'value' && sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {filteredCommitments.map(com => (
          <div key={com.id} className={`rounded-2xl border transition-all shadow-sm ${com.materialArrivedDate ? 'bg-slate-50/50 border-slate-200 opacity-60 grayscale-[0.3]' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
            {/* Header / Summary */}
            <div 
              className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between cursor-pointer"
              onClick={() => {
                if (expandedId === com.id) setExpandedId(null);
                else setExpandedId(com.id);
              }}
            >
              <div className="flex-1 min-w-0 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${com.materialArrivedDate ? 'bg-slate-200 text-slate-500' : 'bg-amber-100 text-amber-600'}`}>
                  {com.materialArrivedDate ? <CheckCircle2 size={24} /> : <Truck size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-black text-lg ${com.materialArrivedDate ? 'text-slate-500' : 'text-slate-900'}`}>{com.ne}</h3>
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-indigo-200">
                      {com.type}
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-slate-200">
                      PI: {com.pi}
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-slate-200">
                      UG: {com.ug}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-200">
                      {com.section}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-600 truncate">{com.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0 w-full md:w-auto">
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:hidden">Emitido há</p>
                  <p className={`font-black text-xl flex items-center gap-1.5 ${com.materialArrivedDate ? 'text-slate-400' : com.daysPassed > 30 ? 'text-red-500' : 'text-slate-700'}`}>
                    <Clock size={16} className={com.materialArrivedDate ? 'text-slate-300' : com.daysPassed > 30 ? 'text-red-400' : 'text-slate-400'} />
                    {com.daysPassed} {com.daysPassed === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:hidden">Valor</p>
                  <p className="font-black text-slate-700">
                    {formatCurrency(
                      (com.type === 'Global' || com.type === 'Estimativo') 
                        ? Math.max(0, com.value - (com.materialArrivals || []).reduce((acc: number, a: any) => acc + a.value, 0))
                        : com.value
                    )}
                  </p>
                </div>
                <div className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors hidden md:block">
                  {expandedId === com.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedId === com.id && (
              <div className="border-t border-slate-100 p-5 bg-slate-50/50 rounded-b-2xl animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Left: Contact History */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare size={16} className="text-emerald-500" />
                      Histórico de Contatos
                    </h4>

                    <div className="space-y-3">
                      {com.contacts && com.contacts.length > 0 ? (
                        [...com.contacts].reverse().map(contact => (
                          <div key={contact.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400"></div>
                            
                            {editingContactId === contact.id ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data</label>
                                    <input 
                                      type="date" 
                                      value={editContactDate}
                                      onChange={(e) => setEditContactDate(e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Previsão</label>
                                    <input 
                                      type="date" 
                                      value={editContactExpectedDelivery}
                                      onChange={(e) => setEditContactExpectedDelivery(e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Detalhes</label>
                                  <textarea 
                                    value={editContactNotes}
                                    onChange={(e) => setEditContactNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium resize-none"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end mt-2">
                                  <button
                                    onClick={() => setEditingContactId(null)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors flex items-center gap-1"
                                  >
                                    <X size={14} /> Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleSaveEditContact(e, com)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1"
                                  >
                                    <Save size={14} /> Salvar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
                                      {formatDateBR(contact.date)}
                                    </span>
                                    {contact.expectedDeliveryDate && (
                                      <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1 border border-emerald-100">
                                        <Calendar size={12} /> Prev: {formatDateBR(contact.expectedDeliveryDate)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="hidden group-hover:flex items-center gap-1">
                                    {canEditItem(com.section) && (
                                    <button
                                      onClick={() => startEditingContact(contact)}
                                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Editar"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    )}
                                    {canEditItem(com.section) && (
                                    <button
                                      onClick={() => handleDeleteContact(com, contact.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm font-medium text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
                              </>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 bg-slate-100/50 rounded-xl border border-slate-200 border-dashed">
                          <Info size={24} className="text-slate-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-500">Nenhum contato registrado ainda.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="space-y-6">
                    {/* Add new contact form */}
                    {(!com.materialArrivedDate || userRole === 'ADMIN') && canEditItem(com.section) && (
                      <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                        <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest mb-4">Registrar Novo Contato</h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data do Contato</label>
                              <input 
                                type="date" 
                                value={newContactDate}
                                onChange={(e) => setNewContactDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Previsão de Entrega</label>
                              <input 
                                type="date" 
                                value={newContactExpectedDelivery}
                                onChange={(e) => setNewContactExpectedDelivery(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Detalhes / Observações</label>
                            <textarea 
                              value={newContactNotes}
                              onChange={(e) => setNewContactNotes(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium resize-none"
                              placeholder="Falei com o vendedor..."
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => handleAddContact(e, com)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus size={16} /> Salvar Contato
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Datas do Empenho */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Informações do Empenho</h4>
                      <div className="space-y-4">
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nº do Processo</label>
                            <input 
                              type="text"
                              placeholder="XXXXX.XXXXXX/XXXX-XX"
                              value={pendingDates[com.id]?.processNumber !== undefined ? pendingDates[com.id].processNumber : (com.processNumber || '')}
                              onChange={(e) => handlePendingDateChange(com.id, 'processNumber', applyProcessMask(e.target.value))}
                              disabled={!canEditItem(com.section)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed uppercase"
                            />
                          </div>
                          {canEditItem(com.section) && (
                            <button onClick={() => handleSaveDates(com)} className="mb-[2px] p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors shrink-0" title="Salvar">
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Enviado para Empresa</label>
                            <input 
                              type="date"
                              value={pendingDates[com.id]?.sent !== undefined ? pendingDates[com.id].sent : (com.sentToCompanyDate || '')}
                              onChange={(e) => handlePendingDateChange(com.id, 'sent', e.target.value)}
                              disabled={!canEditItem(com.section)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                            />
                          </div>
                          {canEditItem(com.section) && (
                            <button onClick={() => handleSaveDates(com)} className="mb-[2px] p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors shrink-0" title="Salvar">
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Recebido da Empresa</label>
                            <input 
                              type="date"
                              value={pendingDates[com.id]?.received !== undefined ? pendingDates[com.id].received : (com.receivedFromCompanyDate || '')}
                              onChange={(e) => handlePendingDateChange(com.id, 'received', e.target.value)}
                              disabled={!canEditItem(com.section)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                            />
                          </div>
                          {canEditItem(com.section) && (
                            <button onClick={() => handleSaveDates(com)} className="mb-[2px] p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors shrink-0" title="Salvar">
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Material Arrival / Liquidations depending on type */}
                    {com.type === 'Global' || com.type === 'Estimativo' ? (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Recebimentos Parciais</h4>
                        <div className="space-y-3 mb-4">
                          {(com.materialArrivals || []).map((arrival: any) => (
                            <div key={arrival.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  {formatDateBR(arrival.date)}
                                  {arrival.invoice && <span className="ml-2 text-indigo-500">NF: {arrival.invoice}</span>}
                                </p>
                                <p className="text-sm font-black text-emerald-600">{formatCurrency(arrival.value)}</p>
                              </div>
                              {canEditItem(com.section) && (
                              <button onClick={() => handleRemoveMaterialArrival(com, arrival.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                              )}
                            </div>
                          ))}
                          {(com.materialArrivals?.length || 0) === 0 && (
                            <p className="text-xs font-medium text-slate-400 italic text-center py-2">Nenhum recebimento registrado.</p>
                          )}
                        </div>
                        
                        {canEditItem(com.section) && (
                        <div className="border-t border-slate-100 pt-4 space-y-3">
                          <h5 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Novo Recebimento</h5>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input 
                                type="date"
                                id={`date-${com.id}`}
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                              />
                              <input 
                                type="number"
                                step="0.01"
                                placeholder="Valor R$"
                                id={`val-${com.id}`}
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                            <input 
                              type="text"
                              placeholder="Número da Nota Fiscal"
                              id={`invoice-global-${com.id}`}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const dt = (document.getElementById(`date-${com.id}`) as HTMLInputElement).value;
                              const vl = parseFloat((document.getElementById(`val-${com.id}`) as HTMLInputElement).value);
                              const inv = (document.getElementById(`invoice-global-${com.id}`) as HTMLInputElement).value;
                              if (!inv || !inv.trim()) {
                                alert('A Nota Fiscal é obrigatória para o recebimento.');
                                return;
                              }
                              handleAddMaterialArrival(com, dt, vl, inv);
                              (document.getElementById(`date-${com.id}`) as HTMLInputElement).value = '';
                              (document.getElementById(`val-${com.id}`) as HTMLInputElement).value = '';
                              (document.getElementById(`invoice-global-${com.id}`) as HTMLInputElement).value = '';
                            }}
                            className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                          >
                            <Plus size={14} /> Adicionar
                          </button>
                        </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Recebido</span>
                          <span className="text-sm font-black text-emerald-600">
                            {formatCurrency((com.materialArrivals || []).reduce((acc: number, a: any) => acc + a.value, 0))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${com.materialArrivedDate ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${com.materialArrivedDate ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {com.materialArrivedDate ? <CheckCircle2 size={32} /> : <Truck size={32} />}
                        </div>
                        <h4 className={`text-lg font-black mb-1 ${com.materialArrivedDate ? 'text-emerald-900' : 'text-slate-700'}`}>
                          {com.materialArrivedDate ? 'Material Entregue' : 'Aguardando Entrega'}
                        </h4>
                        {com.materialArrivedDate ? (
                          <div className="mb-4">
                            <p className="text-sm font-bold text-emerald-600">
                              Registrado em: {formatDateBR(com.materialArrivedDate)}
                            </p>
                            {com.invoice && (
                              <p className="text-xs font-bold text-emerald-700 mt-1 uppercase tracking-widest">
                                NF: {com.invoice}
                              </p>
                            )}
                          </div>
                        ) : canEditItem(com.section) ? (
                          <div className="w-full max-w-xs mb-4">
                            <input 
                              type="text"
                              id={`invoice-ord-${com.id}`}
                              placeholder="Número da Nota Fiscal"
                              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-center"
                            />
                          </div>
                        ) : null}
                        {canEditItem(com.section) && (
                        <button
                          onClick={() => {
                            if (!com.materialArrivedDate) {
                              const inv = (document.getElementById(`invoice-ord-${com.id}`) as HTMLInputElement)?.value;
                              if (!inv || !inv.trim()) {
                                alert('A Nota Fiscal é obrigatória para confirmar o recebimento.');
                                return;
                              }
                              handleToggleMaterialArrived(com, inv);
                            } else {
                              handleToggleMaterialArrived(com);
                            }
                          }}
                          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${com.materialArrivedDate ? 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          {com.materialArrivedDate ? 'Desfazer Entrega' : 'Confirmar Recebimento'}
                        </button>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredCommitments.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
            <PackageSearch size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">Nenhum empenho encontrado</h3>
            <p className="text-slate-500 font-medium mt-2">Ajuste os filtros de busca para encontrar o que procura.</p>
          </div>
        )}
      </div>

      {showConfDocModal && (
        <ProcessTrackingModals 
          commitments={mappedCommitments.filter(c => canEditItem(c.section))} 
          onUpdateCommitment={onUpdateCommitment}
          onNotify={onNotify}
          onClose={() => setShowConfDocModal(false)}
          modalType="ConfDoc"
        />
      )}
      {showFinanceModal && (
        <ProcessTrackingModals 
          commitments={mappedCommitments.filter(c => canEditItem(c.section))} 
          onUpdateCommitment={onUpdateCommitment}
          onNotify={onNotify}
          onClose={() => setShowFinanceModal(false)}
          modalType="Finance"
        />
      )}
      {showMetricsModal && (
        <ProcessMetricsModal 
          commitments={commitments}
          credits={credits} 
          onClose={() => setShowMetricsModal(false)}
        />
      )}
    </div>
  );
};

export default DeliveryTracking;
