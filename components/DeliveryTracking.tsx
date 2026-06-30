import React, { useState, useMemo } from 'react';
import { Credit, Commitment, UserRole, CommitmentContact, Cancellation } from '../types';
import { Search, Filter, Calendar, MessageSquare, Truck, CheckCircle2, ChevronDown, ChevronUp, Plus, Clock, Info, PackageSearch, ArrowUp, ArrowDown, Trash2, Edit3, Save, X } from 'lucide-react';
import { parseLocalDate, formatDateBR } from '../utils/dateUtils';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const generateId = () => Math.random().toString(36).substr(2, 9);

interface DeliveryTrackingProps {
  credits: Credit[];
  commitments: Commitment[];
  cancellations: Cancellation[];
  onUpdateCommitment: (updated: Commitment) => void;
  userRole: UserRole;
  userSection?: string;
}

const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({ credits, commitments, cancellations, onUpdateCommitment, userRole, userSection }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState(userSection || '');
  const [ugFilter, setUgFilter] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [sortBy, setSortBy] = useState<'daysPassed' | 'value' | 'ne'>('ne');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newContactDate, setNewContactDate] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');
  const [newContactExpectedDelivery, setNewContactExpectedDelivery] = useState('');

  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactDate, setEditContactDate] = useState('');
  const [editContactNotes, setEditContactNotes] = useState('');
  const [editContactExpectedDelivery, setEditContactExpectedDelivery] = useState('');

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

  const sections = useMemo(() => {
    return Array.from(new Set(mappedCommitments.map(c => c.section))).sort();
  }, [mappedCommitments]);

  const ugs = useMemo(() => {
    return Array.from(new Set(mappedCommitments.map(c => c.ug))).sort();
  }, [mappedCommitments]);

  const filteredCommitments = useMemo(() => {
    return mappedCommitments.filter(com => {
      const matchesSearch = 
        com.ne.toLowerCase().includes(searchTerm.toLowerCase()) || 
        com.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        com.pi.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = sectionFilter ? com.section === sectionFilter : true;
      const matchesUg = ugFilter ? com.ug === ugFilter : true;
      const matchesPending = showOnlyPending ? !com.materialArrivedDate : true;
      return matchesSearch && matchesSection && matchesUg && matchesPending;
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
  }, [mappedCommitments, searchTerm, sectionFilter, ugFilter, showOnlyPending, sortBy, sortOrder]);

  const handleAddContact = (e: React.MouseEvent, com: Commitment) => {
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

    const updatedCom = {
      ...com,
      contacts: [...(com.contacts || []), newContact]
    };

    onUpdateCommitment(updatedCom);
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

  const handleSaveEditContact = (e: React.MouseEvent, com: Commitment) => {
    e.preventDefault();
    if (!editContactDate || !editContactNotes) {
      alert("Preencha a data e os detalhes do contato.");
      return;
    }

    const updatedContacts = (com.contacts || []).map(c => 
      c.id === editingContactId 
        ? { ...c, date: editContactDate, notes: editContactNotes, expectedDeliveryDate: editContactExpectedDelivery || undefined }
        : c
    );

    const updatedCom = {
      ...com,
      contacts: updatedContacts
    };

    onUpdateCommitment(updatedCom);
    setEditingContactId(null);
  };

  const handleDeleteContact = (com: Commitment, contactId: string) => {
    if (window.confirm("Deseja realmente excluir este contato?")) {
      const updatedContacts = (com.contacts || []).filter(c => c.id !== contactId);
      const updatedCom = {
        ...com,
        contacts: updatedContacts
      };
      onUpdateCommitment(updatedCom);
    }
  };

  const handleToggleMaterialArrived = (com: Commitment) => {
    const isArrived = !!com.materialArrivedDate;
    
    if (isArrived) {
       // mark as not arrived
       const updatedCom = { ...com };
       delete updatedCom.materialArrivedDate;
       onUpdateCommitment(updatedCom);
    } else {
       // mark as arrived today
       const today = new Date().toISOString().split('T')[0];
       const updatedCom = { ...com, materialArrivedDate: today };
       onUpdateCommitment(updatedCom);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Acompanhamento de Entregas</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Tratativas com fornecedores e prazos de empenhos</p>
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
            disabled={!!userSection}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all appearance-none font-medium text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            <option value="">Todas as Seções</option>
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
                  <p className="font-black text-slate-700">{formatCurrency(com.value)}</p>
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
                                    <button
                                      onClick={() => startEditingContact(contact)}
                                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Editar"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteContact(com, contact.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 size={14} />
                                    </button>
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
                    {(!com.materialArrivedDate || userRole === 'ADMIN') && (
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

                    {/* Material Arrival Toggle */}
                    <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${com.materialArrivedDate ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${com.materialArrivedDate ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {com.materialArrivedDate ? <CheckCircle2 size={32} /> : <Truck size={32} />}
                      </div>
                      <h4 className={`text-lg font-black mb-1 ${com.materialArrivedDate ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {com.materialArrivedDate ? 'Material Entregue' : 'Aguardando Entrega'}
                      </h4>
                      {com.materialArrivedDate && (
                        <p className="text-sm font-bold text-emerald-600 mb-4">
                          Registrado em: {formatDateBR(com.materialArrivedDate)}
                        </p>
                      )}
                      <button
                        onClick={() => handleToggleMaterialArrived(com)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${com.materialArrivedDate ? 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                      >
                        {com.materialArrivedDate ? 'Desfazer Entrega' : 'Confirmar Recebimento'}
                      </button>
                    </div>

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
    </div>
  );
};

export default DeliveryTracking;
