import { NavLink, useLocation } from 'react-router-dom'

interface SidebarProps {
  onOpenNotif: () => void;
  unread: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLogout: () => void;
}

export default function Sidebar({ onOpenNotif, unread, isExpanded, onToggleExpand, onLogout }: SidebarProps) {
  const location = useLocation();

const navItems = [
    { path: '/sources', icon: '🔌', label: 'Sources' },
    { path: '/catalog', icon: '🗂️', label: 'Catalog' },
    { path: '/flow', icon: '⚙️', label: 'Pipeline Flow' },
    { path: '/analysis', icon: '📊', label: 'Analysis' },
    { path: '/audit', icon: '📜', label: 'Audit Logs' },
    { path: '/docs', icon: '📖', label: 'Cosmic Documentation' },
    { path: '/tunneling', icon: '🔐', label: 'Tunneling' },
    { path: '/feedback', icon: '💬', label: 'Give Feedback' },
  ]

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-40`}
      style={{ 
        background: '#0d0a1a', 
        borderRight: '1px solid rgba(255,255,255,0.08)',
        width: isExpanded ? '16rem' : '4rem' 
      }}
    >
      {/* Brand / Logo Area */}
      <div className={`h-16 flex items-center border-b border-white/5 ${isExpanded ? 'px-4' : 'justify-center'}`}>
        <button 
          onClick={onToggleExpand}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0 outline-none"
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {/* Hamburger Icon */}
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {isExpanded && (
          <span className="text-white font-bold ml-3 text-lg whitespace-nowrap overflow-hidden transition-opacity duration-300">
            The God's Tool
          </span>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          // Highlight if current path matches, or if we are on root '/' and the item is '/sources'
          const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/sources');
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-purple-600/15 text-white' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white'
              }`}
              style={{
                padding: isExpanded ? '0.75rem 1rem' : '0.75rem 0',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                border: isActive ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent'
              }}
              title={!isExpanded ? item.label : undefined}
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              
              {isExpanded && (
                <span className="ml-3 text-sm font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}

              {/* Active Indicator Line (Only visible when collapsed) */}
              {!isExpanded && isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-r-full" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-white/5 space-y-2">
        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center rounded-xl text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all group relative"
          style={{
            padding: isExpanded ? '0.75rem 1rem' : '0.75rem 0',
            justifyContent: isExpanded ? 'flex-start' : 'center',
          }}
          title={!isExpanded ? "Logout" : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {isExpanded && (
            <span className="ml-3 text-sm font-medium whitespace-nowrap">Logout</span>
          )}
        </button>

        {/* Notifications */}
        <button
          onClick={onOpenNotif}
          className="w-full flex items-center rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-all group relative"
          style={{
            padding: isExpanded ? '0.75rem 1rem' : '0.75rem 0',
            justifyContent: isExpanded ? 'flex-start' : 'center',
          }}
          title={!isExpanded ? "Notifications" : undefined}
        >
          <div className="relative shrink-0">
            <span className="text-lg">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-[#0d0a1a]">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          
          {isExpanded && (
            <span className="ml-3 text-sm font-medium whitespace-nowrap">
              Notifications
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
