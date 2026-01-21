
import React, { useState, useMemo, useEffect } from 'react';
import { Credit, Commitment, Refund, Cancellation, UG } from '../types';
import { Save, AlertCircle, RefreshCw, ArrowLeft, Landmark, PieChart } from 'lucide-react';
import { UGS } from '../constants';

interface RefundFormProps {
  credits: Credit[];
  commitments: Commitment[];
  refunds: Refund[];
  cancellations: Cancellation[];
  onSave: (refund: Refund) => void;
  onCancel: () => void;
}

const RefundForm: React.FC<RefundFormProps> = ({ credits, commitments, refunds, cancellations, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    ug: '' as UG | '',
    pi: '',
    creditId: '',
    value: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [error, setError] = useState<string | null>(null);

  // Helper para calcular saldo preciso de uma NC individual
  const calculateNCBalance = (credit: Credit) => {
    // Fixed: Commitment uses creditId directly, not allocations
    const totalSpent = commitments.reduce((acc, com) => {
      return acc + (com.creditId === credit.id ? com.value : 0);
    }, 0);

    const totalRefunded = refunds.filter(ref => ref.creditId === credit.id).reduce((a, b) => a + b.value, 0);
    
    // Fixed: Commitment uses creditId directly, not allocations
    const totalCancelled = cancellations.reduce((acc, can) => {
      const com = commitments.find(c => c.id === can.commitmentId);
      if (!com || com.creditId !== credit.id) return acc;
      return acc + can.value;
    }, 0);

    return parseFloat((credit.valueReceived - totalSpent - totalRefunded + totalCancelled).toFixed(2));
  };

  const piOptions = useMemo(() => {
    if (!formData.ug) return [];
    
    // Filtra PIs que possuem pelo menos uma NC com saldo >= 0.01
    const pisWithBalance = credits
      .filter(c => c.ug === formData.ug)
      .filter(c => calculateNCBalance(c) >= 0.01)
      .map(c => c.pi);

    return Array.from(new Set(pisWithBalance)).sort();
  }, [formData.ug, credits, commitments, refunds, cancellations]);

  // NCs filtradas por dotação E COM SALDO DISPONÍVEL (Ajustado para >= 0.01)
  const filteredCredits = useMemo(() => {
    if (!formData.ug || !formData.pi) return [];
    return credits
      .filter(c => c.ug === formData.ug && c.pi === formData.pi)
      .map(c => ({
        ...c,
        available: calculateNCBalance(c)
      }))
      .filter(c => c.available >= 0.01); 
  }, [formData.ug, formData.pi, credits, commitments, refunds, cancellations]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, pi: '', creditId: '', value: 0 }));
  }, [formData.ug]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, creditId: '', value: 0 }));
  }, [formData.pi]);

  const availableBalance = useMemo(() => {
    const selected = filteredCredits.find(c => c.id === formData.creditId);
    return selected ? selected.available : 0;
  }, [formData.creditId, filteredCredits]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.creditId || formData.value <= 0 || formData.value > availableBalance) {
      setError('⚠️ Verifique o crédito selecionado e o valor (não pode exceder o saldo disponível).');
      return;
    }
    
    const { ug, pi, ...refundData } = formData;
    onSave({ 
      id: Math.random().toString(36).substr(2, 9), 
      ...refundData 
    } as Refund);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-amber-700 font-black text-[10px] uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Voltar à lista
      </button>

      <div className="bg-white rounded-3xl shadow-2xl border border-amber-100 overflow-hidden text-black">
        <div className="bg-amber-900 px-8 py-7 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-800 rounded-xl border border-amber-700">
               <RefreshCw size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight italic leading-none">Recolhimento de Crédito</h2>
              <p className="text-amber-300 text-[10px] uppercase tracking-widest font-black mt-2 italic opacity-80">
                Estorno / Devolução de Dotação Orçamentária
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-black text-[10px] uppercase flex items-center gap-3 animate-shake">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
                <Landmark size={10} /> Unidade Gestora (UG)
              </label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-amber-500 transition-all" 
                value={formData.ug} 
                onChange={e => setFormData({...formData, ug: e.target.value as UG})}
              >
                <option value="">Selecione a UG...</option>
                {UGS.map(ug => <option key={ug} value={ug}>{ug}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
                <PieChart size={10} /> Plano Interno (PI)
              </label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40 transition-all" 
                value={formData.pi} 
                onChange={e => setFormData({...formData, pi: e.target.value})}
                disabled={!formData.ug}
              >
                <option value="">{!formData.ug ? 'Aguardando UG...' : piOptions.length === 0 ? 'Nenhum PI com saldo' : 'Selecione o PI...'}</option>
                {piOptions.map(pi => <option key={pi} value={pi}>{pi}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota de Crédito Disponível (NC)</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40 transition-all" 
              value={formData.creditId} 
              onChange={e => setFormData({...formData, creditId: e.target.value})}
              disabled={!formData.pi}
            >
              <option value="">{!formData.pi ? 'Aguardando PI...' : filteredCredits.length === 0 ? 'Nenhuma NC com saldo disponível' : 'Selecione a Nota de Crédito...'}</option>
              {filteredCredits.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nc} - SALDO: R$ {c.available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          {formData.creditId && (
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 animate-in fade-in slide-in-from-top-2 shadow-inner">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Limite Máximo para Recolhimento</p>
                  <p className="text-3xl font-black text-amber-900 leading-none">
                    R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Seção Destino</p>
                  <p className="text-xs font-black text-amber-800 uppercase italic">
                    {credits.find(c => c.id === formData.creditId)?.section}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Recolhimento (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full bg-amber-50 border border-amber-100 rounded-xl pl-12 pr-4 py-4 text-2xl font-black text-black outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 shadow-inner" 
                  placeholder="0,00"
                  value={formData.value || ''} 
                  onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                  disabled={!formData.creditId}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Documento</label>
              <input 
                type="date" 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-amber-500 text-slate-950 [color-scheme:light] shadow-sm" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Histórico / Observação do Estorno</label>
            <textarea 
              rows={2}
              placeholder="Descreva o motivo deste recolhimento à instância superior..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-4 disabled:opacity-40 disabled:grayscale"
            disabled={!formData.creditId || formData.value <= 0}
          >
            <RefreshCw size={20} />
            Efetivar Recolhimento
          </button>
        </form>
      </div>
    </div>
  );
};

export default RefundForm;
