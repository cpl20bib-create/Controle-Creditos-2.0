
import React, { useState, useMemo, useEffect } from 'react';
import { Credit, Commitment, Cancellation, UG } from '../types';
import { Save, AlertCircle, RefreshCw, ArrowLeft, Landmark, PieChart, FileText, ClipboardList } from 'lucide-react';
import { UGS } from '../constants';

interface CancellationFormProps {
  credits: Credit[];
  commitments: Commitment[];
  cancellations: Cancellation[];
  onSave: (cancellation: Cancellation) => void;
  onCancel: () => void;
}

const CancellationForm: React.FC<CancellationFormProps> = ({ credits, commitments, cancellations, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    ug: '' as UG | '',
    pi: '',
    commitmentId: '',
    value: 0,
    ro: '2026RO',
    date: new Date().toISOString().split('T')[0],
    bi: 'BI nº XX, de DD/MM/AAAA'
  });

  const [error, setError] = useState<string | null>(null);

  // Filtragem de PIs: Apenas PIs que possuem empenhos emitidos na UG selecionada
  const piOptions = useMemo(() => {
    if (!formData.ug) return [];
    
    // 1. Filtrar empenhos cujos créditos pertencem à UG selecionada
    const commitmentsInUG = commitments.filter(com => {
      const credit = credits.find(c => c.id === com.creditId);
      return credit?.ug === formData.ug;
    });

    // 2. Extrair os PIs únicos desses créditos
    const pisWithCommitments = commitmentsInUG.map(com => {
      const credit = credits.find(c => c.id === com.creditId);
      return credit?.pi;
    }).filter(Boolean) as string[];

    return Array.from(new Set(pisWithCommitments)).sort();
  }, [formData.ug, credits, commitments]);

  const filteredCommitments = useMemo(() => {
    if (!formData.ug || !formData.pi) return [];
    return commitments.filter(com => {
      const credit = credits.find(c => c.id === com.creditId);
      return credit?.ug === formData.ug && credit?.pi === formData.pi;
    });
  }, [formData.ug, formData.pi, commitments, credits]);

  useEffect(() => { setFormData(prev => ({ ...prev, pi: '', commitmentId: '', value: 0 })); }, [formData.ug]);
  useEffect(() => { setFormData(prev => ({ ...prev, commitmentId: '', value: 0 })); }, [formData.pi]);

  const maxCancellableValue = useMemo(() => {
    const com = commitments.find(c => c.id === formData.commitmentId);
    if (!com) return 0;
    const alreadyCancelled = cancellations
      .filter(can => can.commitmentId === com.id)
      .reduce((acc, curr) => acc + curr.value, 0);
    return com.value - alreadyCancelled;
  }, [formData.commitmentId, commitments, cancellations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.commitmentId || formData.value <= 0 || formData.value > maxCancellableValue || formData.ro.length < 12) {
      setError('Verifique os campos. O valor não pode exceder o saldo do empenho e a RO deve estar completa.');
      return;
    }
    
    const { ug, pi, ...cancellationData } = formData;
    onSave({ 
      id: Math.random().toString(36).substr(2, 9), 
      ...cancellationData 
    });
    onCancel();
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-blue-700 font-black text-[10px] uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden text-black">
        <div className="bg-blue-900 px-8 py-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight italic">Anulação de Empenho</h2>
            <p className="text-blue-300 text-[9px] uppercase tracking-widest font-black mt-1">Devolução de Saldo à Dotação</p>
          </div>
          <RefreshCw className="text-blue-400 opacity-50" size={40} />
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-black text-[10px] uppercase flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Landmark size={10} /> UG do Empenho</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 text-black" value={formData.ug} onChange={e => setFormData({...formData, ug: e.target.value as UG})}>
                <option value="">Selecione a UG...</option>
                {UGS.map(ug => <option key={ug} value={ug}>{ug}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><PieChart size={10} /> PI do Empenho</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 text-black disabled:opacity-50 transition-all" 
                value={formData.pi} 
                onChange={e => setFormData({...formData, pi: e.target.value})} 
                disabled={!formData.ug}
              >
                <option value="">
                  {!formData.ug ? 'Aguardando UG...' : piOptions.length === 0 ? 'Sem empenhos emitidos nesta UG' : 'Selecione o PI...'}
                </option>
                {piOptions.map(pi => <option key={pi} value={pi}>{pi}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><FileText size={10} /> Empenho para Anular (NE)</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 text-black disabled:opacity-50" value={formData.commitmentId} onChange={e => setFormData({...formData, commitmentId: e.target.value})} disabled={!formData.pi}>
              <option value="">{!formData.pi ? 'Aguardando PI...' : 'Selecione a NE...'}</option>
              {filteredCommitments.map(com => (
                <option key={com.id} value={com.id}>{com.ne} - R$ {com.value.toLocaleString('pt-BR')}</option>
              ))}
            </select>
          </div>

          {formData.commitmentId && (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2 shadow-inner">
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Saldo Remanescente do Empenho</p>
              <p className="text-2xl font-black text-blue-900">R$ {maxCancellableValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor da Anulação (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">R$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-4 text-2xl font-black text-black outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" 
                  placeholder="0,00" 
                  value={formData.value || ''} 
                  onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Número da RO (2026ROXXXXXX)</label>
              <input type="text" maxLength={12} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 text-black shadow-sm" value={formData.ro} onChange={e => { const v = e.target.value.toUpperCase(); if (v.startsWith('2026RO') || v === '') setFormData({...formData, ro: v}); }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1"><ClipboardList size={10} /> Publicação em BI</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 text-black shadow-sm" value={formData.bi} onChange={e => setFormData({...formData, bi: e.target.value})} onClick={(e) => { if (formData.bi === 'BI nº XX, de DD/MM/AAAA') setFormData({...formData, bi: 'BI nº '}); }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Anulação</label>
              <input 
                type="date" 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 text-slate-950 [color-scheme:light] shadow-sm" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
          </div>

          <button type="submit" className="w-full py-5 bg-blue-700 hover:bg-blue-800 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]" disabled={!formData.commitmentId || formData.value <= 0}>
            <Save size={20} /> Efetivar Anulação no Sistema
          </button>
        </form>
      </div>
    </div>
  );
};

export default CancellationForm;
