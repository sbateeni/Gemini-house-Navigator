
import React, { useState, useEffect } from 'react';
import { X, Shield, Search, Loader2 } from 'lucide-react';
import { UnitStatus } from '../../types';

interface SidebarHeaderProps {
  setIsOpen: (o: boolean) => void;
  myStatus: UnitStatus;
  setMyStatus: (s: UnitStatus) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  isSearching: boolean;
  onSearch: (e: React.FormEvent) => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  setIsOpen, myStatus, setMyStatus, searchQuery, setSearchQuery, isSearching, onSearch
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setSearchQuery(e.target.value);
  };

  const statusColors = {
    patrol: 'bg-green-500',
    busy: 'bg-yellow-500',
    pursuit: 'bg-red-500',
    offline: 'bg-slate-500'
  };

  const statusLabels: Record<string, string> = {
    patrol: 'دورية',
    busy: 'مشغول',
    pursuit: 'مطاردة',
    offline: 'غير متصل'
  };

  return (
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 bg-slate-800 rounded-lg text-slate-400 md:hidden hover:text-white"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white leading-none mb-1">غرفة العمليات</h1>
              
              <div className="flex items-center gap-2 justify-end">
                 <div className="relative group">
                    <button className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700 transition-colors">
                        {statusLabels[myStatus]}
                        <div className={`w-2 h-2 rounded-full ${statusColors[myStatus]} animate-pulse`}></div>
                    </button>
                    <div className="absolute top-full right-0 mt-1 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
                        {(['patrol', 'busy', 'pursuit'] as UnitStatus[]).map(s => (
                            <button 
                                key={s}
                                onClick={() => setMyStatus(s)}
                                className="w-full text-right px-3 py-2 text-xs font-bold hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-end gap-2"
                            >
                                {statusLabels[s]}
                                <div className={`w-2 h-2 rounded-full ${statusColors[s]}`}></div>
                            </button>
                        ))}
                    </div>
                 </div>
              </div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
        </div>
        
        <form onSubmit={onSearch} className="relative">
          <input 
            type="text" 
            value={localSearch}
            onChange={handleChange}
            placeholder="بحث عن موقع..." 
            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-2.5 pr-10 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
            disabled={isSearching}
          />
          <Search className="absolute right-3 top-3 text-slate-500" size={16} />
          {isSearching && <Loader2 className="absolute left-3 top-3 text-blue-500 animate-spin" size={16} />}
        </form>
      </div>
  );
};
