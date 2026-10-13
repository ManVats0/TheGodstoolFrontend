import { NavLink, useLocation } from 'react-router-dom'
// import { usePermissions, ROLE_LABELS } from '../usePermissions'
import { API_BASE } from '../config'
import { usePermissions, ROLE_LABELS } from '../usePermissions'
function SidebarIcon({ name, size = 19, active = false }: { name: string; size?: number; active?: boolean }) {
  const paths: Record<string, JSX.Element> = {
    plug: <><path d="M9 2v6M15 2v6M6 8h12l-1 6a5 5 0 0 1-5 4h0a5 5 0 0 1-5-4L6 8z" /><path d="M12 18v4" /></>,
    folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
    flow: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M6 9v6" /><path d="M18 6a9 9 0 0 1-9 9" /></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    message: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
    team: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#c4b5fd' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

interface SidebarProps {
  onOpenNotif: () => void;
  unread: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLogout: () => void;
}

export default function Sidebar({ onOpenNotif, unread, isExpanded, onToggleExpand, onLogout }: SidebarProps) {
  const location = useLocation();

const { can, role } = usePermissions()

  const allNavItems: { path: string; icon: string; label: string; show?: boolean }[] = [
    { path: '/sources', icon: 'plug', label: 'Sources' },
    { path: '/catalog', icon: 'folder', label: 'Catalog' },
    { path: '/flow', icon: 'flow', label: 'Pipeline Flow' },
    { path: '/analysis', icon: 'chart', label: 'Analysis' },
    { path: '/audit', icon: 'file', label: 'Audit Logs', show: can('audit.view') },
    { path: '/team', icon: 'team', label: 'Team' },
    { path: '/docs', icon: 'book', label: 'Cosmic Documentation' },
    { path: '/tunneling', icon: 'shield', label: 'Tunneling', show: can('tunnel.use') || can('tunnel.manage') },
    { path: '/feedback', icon: 'message', label: 'Feedback / Support' },
  ]
  const navItems = allNavItems.filter(item => item.show !== false)

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
              <span className="shrink-0">
                <SidebarIcon name={item.icon} active={isActive} />
              </span>
              
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
        {isExpanded && role && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-white/70 truncate" title={localStorage.getItem('datapro_email') || ''}>
              {localStorage.getItem('datapro_email') || ''}
            </p>
            <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>{ROLE_LABELS[role] || role}</p>
          </div>
        )}

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
            <SidebarIcon name="bell" />
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
