import { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { 
  ChevronLeft,  Home, Search, BookOpen, 
  CheckSquare, Activity, Waves, GraduationCap 
} from 'lucide-react';

export default function Sidebar() {
  const isSidebarOpen = useAppStore(state => state.isSidebarOpen);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const setCurrentPage = useAppStore(state => state.setCurrentPage);
  const currentPage = useAppStore(state => state.currentPage);
  const [isMobile, setIsMobile] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Idle');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Tauri real-time event listeners for Data tracking
    import('../../api').then(({ Api }) => {
      Api.onSyncStatusChange((status) => setSyncStatus(status));
      Api.onConnectionChange((offline) => setIsOffline(offline));
      Api.getConnectionStatus().then(offline => setIsOffline(offline));
    });

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { icon: <Home size={18} />, label: "Dashboard", id: "dashboard" as const },
    { icon: <Search size={18} />, label: "Search", id: "search" as const },
    { icon: <BookOpen size={18} />, label: "School Notes", id: "notes" as const },
    { icon: <CheckSquare size={18} />, label: "Tasks & Habits", id: "tasks" as const },
    { icon: <Activity size={18} />, label: "Grades", id: "grades" as const },
    { icon: <Waves size={18} />, label: "Swim Sessions", id: "swims" as const },
    { icon: <Waves size={18} className="text-blue-400" />, label: "Swim Galas", id: "galas" as const },
    { icon: <Activity size={18} className="text-yellow-400" />, label: "Qualifying Times", id: "qts" as const },
    { icon: <GraduationCap size={18} />, label: "Flashcards", id: "flashcards" as const },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed md:relative flex flex-col z-50
          bg-[#202020] h-full
          transition-all duration-300 ease-in-out border-r border-white/5
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden'}
        `}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-[16rem]">
          {/* Workspace Switcher / Header */}
          <div className="flex items-center hover:bg-white/5 cursor-pointer px-4 py-3 mx-2 mt-2 rounded-md transition-colors text-sm font-medium gap-2 group">
            <div className="w-5 h-5 bg-linear-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-[10px] font-black">
              KN
            </div>
            <span className="truncate flex-1">Keshayen's OS</span>
            <ChevronLeft 
              size={16} 
              className="text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded ml-auto transition-all md:block hidden cursor-pointer" 
              onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
            />
          </div>

          <div className="mt-4 px-2 space-y-[2px]">
            {navItems.map((item, idx) => (
              <button 
                key={idx}
                onClick={() => 'id' in item ? setCurrentPage(item.id as any) : null}
                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  currentPage === item.id 
                    ? 'bg-white/10 text-white font-semibold' 
                    : 'text-[#9b9b9b] hover:bg-white/5 hover:text-[#d4d4d4]'
                }`}
              >
                {item.icon}
                <span className="font-medium whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 px-5">
            <h3 className="text-xs font-semibold text-[#9b9b9b]/70 tracking-wider mb-2 uppercase">Favorites</h3>
            {/* Map favorites if any */}
            <div className="text-sm text-[#9b9b9b] px-3 py-1">No favorites</div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 text-xs flex items-center justify-between min-w-[16rem]">
          <span className={`${isOffline ? 'text-red-400' : 'text-[#9b9b9b]'}`}>
            {isOffline ? 'Offline Mode' : 'Network Active'}
          </span>
          <span className={`capitalize ${syncStatus === 'syncing' ? 'text-blue-400 animate-pulse' : 'text-[#525252]'}`}>
            {syncStatus === 'syncing' ? 'Syncing...' : 'Idle'}
          </span>
        </div>
      </aside>
    </>
  );
}
