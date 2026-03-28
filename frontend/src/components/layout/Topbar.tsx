import { PanelLeft, ChevronRight, MoreHorizontal, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store';

export default function Topbar() {
  const isSidebarOpen = useAppStore(state => state.isSidebarOpen);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);

  return (
    <header className="flex items-center justify-between px-3 md:px-4 py-3 h-12 sticky top-0 z-30 bg-[#191919]/90 backdrop-blur-sm">
      <div className="flex items-center gap-1 text-sm text-[#9b9b9b] font-medium min-w-0">
        {!isSidebarOpen && (
          <button 
            onClick={toggleSidebar}
            className="p-1 hover:bg-white/10 rounded-md transition-colors mr-2 md:hidden"
          >
            <PanelLeft size={18} />
          </button>
        )}
        <span className="hover:bg-white/5 px-2 py-0.5 rounded cursor-pointer transition-colors hidden md:block">
          Keshayen's OS
        </span>
        <ChevronRight size={14} className="text-[#525252] hidden md:block" />
        <span className="px-2 py-0.5 text-[#d4d4d4] truncate">
          Dashboard
        </span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[11px] text-[#9b9b9b] mr-2">Edited just now</span>
        <button className="p-1.5 text-[#d4d4d4] hover:bg-white/10 rounded-md transition-colors">
          <MessageSquare size={16} />
        </button>
        <button className="p-1.5 text-[#d4d4d4] hover:bg-white/10 rounded-md transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>
    </header>
  );
}
