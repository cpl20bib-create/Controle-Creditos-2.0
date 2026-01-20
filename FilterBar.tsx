
import React, { useMemo } from 'react';
import { Filters, Credit } from '../types';
import { RotateCcw } from 'lucide-react';

interface FilterBarProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  credits: Credit[];
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, credits }) => {
  const availableOptions = useMemo(() => {
    const getOptions = (field: keyof Filters) => {
      const filtered = credits.filter(c => {
        if (field !== 'ug' && filters.ug && c.ug !== filters.ug) return false;
        if (field !== 'pi' && filters.pi && c.pi !== filters.pi) return false;
        if (field !== 'nd' && filters.nd && c.nd !== filters.nd) return false;
        if (field !== 'section' && filters.section && c.section !== filters.section) return false;
        return true;
      });
      return Array.from(new Set(filtered.map(c => c[field as keyof Credit] as string))).sort();
    };

    return {
      ugs: getOptions('ug'),
      pis: getOptions('pi'),
      nds: getOptions('nd'),
      sections: getOptions('section'),
    };
  }, [credits, filters]);

  const handleChange = (field: keyof Filters, value: any) => {
    setFilters({ ...filters, [field]: value || undefined });
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidade Gestora</label>
        <select 
          value={filters.ug || ''} 
          onChange={(e) => handleChange('ug', e.target.value)}
          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="">Todas</option>
          {availableOptions.ugs.map(ug => <option key={ug} value={ug}>{ug}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plano Interno</label>
        <select 
          value={filters.pi || ''} 
          onChange={(e) => handleChange('pi', e.target.value)}
          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="">Todos</option>
          {availableOptions.pis.map(pi => <option key={pi} value={pi}>{pi}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Natureza (ND)</label>
        <select 
          value={filters.nd || ''} 
          onChange={(e) => handleChange('nd', e.target.value)}
          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="">Todas</option>
          {availableOptions.nds.map(nd => <option key={nd} value={nd}>{nd}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seção Interessada</label>
        <select 
          value={filters.section || ''} 
          onChange={(e) => handleChange('section', e.target.value)}
          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="">Todas</option>
          {availableOptions.sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <button 
        onClick={() => setFilters({})}
        className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-black py-2 rounded-xl text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 shadow-sm transition-all"
      >
        <RotateCcw size={14} />
        Limpar
      </button>
    </div>
  );
};

export default FilterBar;
