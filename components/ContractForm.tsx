
import React, { useState, useEffect } from 'react';
import { Contract, ContractStatus } from '../types';
// Fixed: Added Clock to the imported icons from lucide-react
import { Save, ArrowLeft, Briefcase, Building2, Landmark, Target, Calendar, UserCheck, FileText, AlertCircle, Clock } from 'lucide-react';

interface ContractFormProps {
  onSave: (contract: Contract) => void;
  onCancel: () => void;
  initialData?: Contract;
}

const ContractForm: React.FC<ContractFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<Contract>>({
    contractNumber: '',
    companyName: '',
    value: 0,
    object: '',
    startDate: '',
    endDate: '',
    status: 'INICIAL',
    mainFiscal: '',
    substituteFiscal: '',
    biNumber: ''
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (!formData.contractNumber || formData.contractNumber.trim().length < 3) {
      setError('O Número do Contrato é obrigatório.');
      return;
    }
    if (!formData.companyName || formData.companyName.trim().length < 3) {
      setError('O Nome da Empresa é obrigatório.');
      return;
    }
    if (!formData.biNumber || formData.biNumber.trim().length < 3) {
      setError('O Número do BI de Publicação é obrigatório para salvar.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('As datas de vigência são obrigatórias.');
      return;
    }
    if (!formData.mainFiscal) {
      setError('O Fiscal Titular deve ser informado.');
      return;
    }

    const contractToSave: Contract = {
      ...formData,
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      created_at: initialData?.created_at || new Date().toISOString()
    } as Contract;

    onSave(contractToSave);
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500 font-sans text-black pb-24">
      <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-emerald-700 font-black text-[10px] uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Cancelar Operação
      </button>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 px-10 py-8 text-white flex items-center justify-between">
           <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight leading-none">
                {initialData ? 'Atualização de Contrato' : 'Novo Cadastro de Contrato'}
              </h2>
              <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mt-2 opacity-80 italic">Setor de Aquisições e Contratos - BIB 20</p>
           </div>
           <div className="bg-slate-800 p-4 rounded-2xl">
              <Landmark size={32} className="opacity-30" />
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          {error && (
            <div className="p-5 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-black text-[11px] uppercase flex items-center gap-4 animate-shake shadow-sm">
              <AlertCircle size={24} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Target size={12} className="text-emerald-500" /> Número do Contrato
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ex: 01/2026-BIB20"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                    value={formData.contractNumber} 
                    onChange={e => setFormData({...formData, contractNumber: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Building2 size={12} className="text-emerald-500" /> Empresa Favorecida
                  </label>
                  <input 
                    type="text" 
                    placeholder="Razão Social ou Nome Fantasia"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                    value={formData.companyName} 
                    onChange={e => setFormData({...formData, companyName: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Situação / Aditivo</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as ContractStatus})}
                  >
                    <option value="INICIAL">Contrato Inicial</option>
                    <option value="1º ADITIVO">1º Termo Aditivo</option>
                    <option value="2º ADITIVO">2º Termo Aditivo</option>
                    <option value="3º ADITIVO">3º Termo Aditivo</option>
                    <option value="4º ADITIVO">4º Termo Aditivo</option>
                  </select>
                </div>
             </div>

             <div className="space-y-6">
                <div className="bg-slate-950 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                  <div className="relative z-10 space-y-4">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Valor Atualizado do Contrato</p>
                     <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-800 italic">R$</span>
                        <input 
                           type="number" 
                           step="0.01"
                           placeholder="0,00"
                           className="w-full bg-transparent border-b border-slate-800 focus:border-emerald-500 outline-none pl-12 py-2 text-4xl font-black text-white transition-all tracking-tighter"
                           value={formData.value || ''}
                           onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                        />
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Calendar size={12} className="text-emerald-500" /> Início Vigência
                      </label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light]" 
                        value={formData.startDate} 
                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        {/* Fixed: Clock is now properly imported */}
                        <Clock size={12} className="text-red-500" /> Término Vigência
                      </label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-red-500 [color-scheme:light]" 
                        value={formData.endDate} 
                        onChange={e => setFormData({...formData, endDate: e.target.value})}
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Objeto do Contrato (Completo)</label>
            <textarea 
              rows={3} 
              placeholder="Descreva detalhadamente o objeto, quantidades e finalidade do contrato..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" 
              value={formData.object} 
              onChange={e => setFormData({...formData, object: e.target.value})} 
            />
          </div>

          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 space-y-8">
             <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <UserCheck size={18} className="text-emerald-600" />
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Responsáveis e Publicidade</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fiscal Titular</label>
                   <input 
                     type="text" 
                     placeholder="Nome completo do Fiscal"
                     className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500" 
                     value={formData.mainFiscal} 
                     onChange={e => setFormData({...formData, mainFiscal: e.target.value.toUpperCase()})}
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fiscal Substituto</label>
                   <input 
                     type="text" 
                     placeholder="Nome completo do Substituto"
                     className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500" 
                     value={formData.substituteFiscal} 
                     onChange={e => setFormData({...formData, substituteFiscal: e.target.value.toUpperCase()})}
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <FileText size={12} className="text-emerald-500" /> Publicação (Nº do BI)
                   </label>
                   <input 
                     type="text" 
                     placeholder="Ex: BI nº 24 de 15/01/2026"
                     className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500" 
                     value={formData.biNumber} 
                     onChange={e => setFormData({...formData, biNumber: e.target.value})}
                   />
                </div>
             </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-7 bg-slate-900 hover:bg-slate-800 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Save size={24} className="text-emerald-500" /> 
            {initialData ? 'Efetivar Atualizações do Contrato' : 'Cadastrar Contrato no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContractForm;
