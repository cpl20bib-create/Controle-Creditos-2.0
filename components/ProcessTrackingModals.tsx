import React, { useState, useMemo } from 'react';
import { Commitment } from '../types';
import { X, CheckCircle2, Clock } from 'lucide-react';
import { formatDateBR } from '../utils/dateUtils';

interface ProcessTrackingModalsProps {
  commitments: Commitment[];
  onUpdateCommitment: (updated: Commitment) => void;
  onNotify?: (role: string, title: string, msg: string) => void;
  onClose: () => void;
  modalType: 'ConfDoc' | 'Finance';
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const ProcessTrackingModals: React.FC<ProcessTrackingModalsProps> = ({ commitments, onUpdateCommitment, onNotify, onClose, modalType }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionDate, setActionDate] = useState('');
  const [diexRemessa, setDiexRemessa] = useState('');

  // Extract all individual pending items
  const pendingItems = useMemo(() => {
    const groups: Record<string, {
      id: string; // ug_ne
      ne: string;
      ug: string;
      type: string;
      invoices: string[];
      value: number;
      date: string;
      items: Array<{ commitmentId: string; arrivalId?: string }>;
    }> = {};

    commitments.forEach((com: any) => {
      const isGlobal = com.type === 'Global' || com.type === 'Estimativo';
      const groupKey = `${com.ug || 'N/A'}_${com.ne}`;

      const addGroupItem = (type: string, invoice: string, value: number, arrivalId: string | undefined, date: string) => {
        if (!groups[groupKey]) {
          groups[groupKey] = {
            id: groupKey,
            ne: com.ne,
            ug: com.ug || 'N/A',
            type: isGlobal ? 'Parcial' : 'Ordinário',
            invoices: [],
            value: 0,
            date: date,
            items: []
          };
        }
        
        if (invoice && invoice !== 'S/N' && !groups[groupKey].invoices.includes(invoice)) {
          groups[groupKey].invoices.push(invoice);
        }
        groups[groupKey].value += value;
        groups[groupKey].items.push({ commitmentId: com.id, arrivalId });
        
        // Update to earliest date
        if (new Date(date) < new Date(groups[groupKey].date)) {
          groups[groupKey].date = date;
        }
      };

      if (modalType === 'ConfDoc') {
        // Needs to have arrived but not sent to ConfDoc
        if (isGlobal) {
          (com.materialArrivals || []).forEach((arr: any) => {
            if (!arr.sentToConfDocDate) {
              addGroupItem('Parcial', arr.invoice || 'S/N', arr.value, arr.id, arr.date);
            }
          });
        } else {
          if (com.materialArrivedDate && !com.sentToConfDocDate) {
            addGroupItem('Ordinário', com.invoice || 'S/N', com.activeValue || com.value, undefined, com.materialArrivedDate);
          }
        }
      } else {
        // Finance: Needs to be in ConfDoc but not sent to Finance
        if (isGlobal) {
          (com.materialArrivals || []).forEach((arr: any) => {
            if (arr.sentToConfDocDate && !arr.sentToFinanceDate) {
              addGroupItem('Parcial', arr.invoice || 'S/N', arr.value, arr.id, arr.sentToConfDocDate);
            }
          });
        } else {
          if (com.sentToConfDocDate && !com.sentToFinanceDate) {
            addGroupItem('Ordinário', com.invoice || 'S/N', com.activeValue || com.value, undefined, com.sentToConfDocDate);
          }
        }
      }
    });
        
    return Object.values(groups).map(g => ({
      ...g,
      invoice: g.invoices.length > 0 ? g.invoices.join(', ') : 'S/N'
    })).sort((a, b) => a.ne.localeCompare(b.ne));
  }, [commitments, modalType]);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSave = () => {
    if (selectedIds.length === 0) return alert('Selecione pelo menos um item.');
    if (!actionDate) return alert('Informe a data da ação.');
    if (modalType === 'ConfDoc' && !diexRemessa) return alert('Informe o número do DIEx Remessa.');

    // Group selected items by commitment ID to minimize updates
    const updatesByCommitment: Record<string, Commitment> = {};

    selectedIds.forEach(groupId => {
      const group = pendingItems.find(i => i.id === groupId);
      if (!group) return;

      group.items.forEach(subItem => {
        if (!updatesByCommitment[subItem.commitmentId]) {
          // Clone the original commitment
          const orig = commitments.find(c => c.id === subItem.commitmentId);
          if (orig) updatesByCommitment[subItem.commitmentId] = JSON.parse(JSON.stringify(orig));
        }

        const com = updatesByCommitment[subItem.commitmentId];
        if (!com) return;

        if (subItem.arrivalId) {
          // Partial
          const arr = com.materialArrivals?.find(a => a.id === subItem.arrivalId);
          if (arr) {
            if (modalType === 'ConfDoc') {
              arr.sentToConfDocDate = actionDate;
              arr.diexRemessa = diexRemessa;
            } else {
              arr.sentToFinanceDate = actionDate;
            }
          }
        } else {
          // Ordinário
          if (modalType === 'ConfDoc') {
            com.sentToConfDocDate = actionDate;
            com.diexRemessa = diexRemessa;
          } else {
            com.sentToFinanceDate = actionDate;
          }
        }
      });
    });

    Object.values(updatesByCommitment).forEach(com => {
      onUpdateCommitment(com);
      if (onNotify) {
         if (modalType === 'ConfDoc') {
            onNotify('CONFORMADOR', 'Processo Recebido', `Empenho ${com.ne} enviado para Conformidade Documental.`);
         } else if (modalType === 'Finance') {
            onNotify('FINANCEIRO', 'Processo Recebido', `Empenho ${com.ne} enviado para o Setor Financeiro.`);
         }
      }
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-full">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {modalType === 'ConfDoc' ? 'Inserir DIEx Remessa (Almoxarifado)' : 'Enviar para Liquidação (Conf. Doc)'}
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Selecione as notas fiscais que farão parte deste lote.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          {modalType === 'ConfDoc' && (
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nº DIEx Remessa</label>
              <input 
                type="text" 
                value={diexRemessa}
                onChange={e => setDiexRemessa(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-bold text-slate-700 outline-none"
                placeholder="Ex: 123-SCA"
              />
            </div>
          )}
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data do Envio</label>
            <input 
              type="date" 
              value={actionDate}
              onChange={e => setActionDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-bold text-slate-700 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div 
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 
                    ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm shadow-indigo-100/50' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                    ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                    {isSelected && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-800 text-sm truncate">{item.ne}</h4>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">UG: {item.ug}</p>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">NF: <span className="text-indigo-600">{item.invoice}</span></p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.type}</p>
                      <p className={`font-black ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{formatCurrency(item.value)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {pendingItems.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-12">
                <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">Nenhum item pendente</h3>
                <p className="text-slate-500 font-medium mt-2">Não há notas fiscais aguardando esta etapa.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={selectedIds.length === 0 || !actionDate || (modalType === 'ConfDoc' && !diexRemessa)}
            className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckCircle2 size={18} /> Confirmar {selectedIds.length} Itens
          </button>
        </div>
      </div>
    </div>
  );
};
