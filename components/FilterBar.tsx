
import React, { useMemo } from 'react';
import { Filters, Credit, SortField, SortOrder } from '../types';
import { RotateCcw, SortAsc, EyeOff } from 'lucide-react';

interface FilterBarProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  credits: Credit[];
  showExtendedFilters?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, credits, showExtendedFilters = true }) => {
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
    setFilters({ ...filters, [field]: value === '' ? undefined : value });
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 text-black">
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
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
          onClick={() => setFilters({ hideZeroBalance: filters.hideZeroBalance })}
          className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-black py-2 rounded-xl text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 shadow-sm transition-all h-[36px]"
        >
          <RotateCcw size={14} />
          Limpar Filtros
        </button>
      </div>

      {showExtendedFilters && (
        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-4">
             <div className="flex flex-col gap-1">
               <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><SortAsc size={10}/> Ordenar por</label>
               <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <select 
                    value={filters.sortBy || 'createdAt'} 
                    onChange={(e) => handleChange('sortBy', e.target.value as SortField)}
                    className="bg-transparent text-[10px] font-black uppercase text-slate-600 outline-none border-none pr-6 cursor-pointer"
                  >
                    <option value="createdAt">Data de Lançamento</option>
                    <option value="value">Valor Original</option>
                    <option value="deadline">Prazo de Empenho</option>
                  </select>
                  <select 
                    value={filters.sortOrder || 'desc'} 
                    onChange={(e) => handleChange('sortOrder', e.target.value as SortOrder)}
                    className="bg-transparent text-[10px] font-black uppercase text-slate-600 outline-none border-none cursor-pointer"
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
               </div>
             </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input 
                type="checkbox" 
                checked={!!filters.hideZeroBalance} 
                onChange={(e) => handleChange('hideZeroBalance', e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 shadow-inner"></div>
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">
              Ocultar Saldo Zerado
            </span>
          </label>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
