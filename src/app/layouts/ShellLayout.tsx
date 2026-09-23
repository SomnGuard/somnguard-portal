import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/model/AuthContext';
import { getHomeRoute, paths } from '../router/paths';

export interface ShellSubItem {
  to: string;
  label: string;
}

export interface ShellGroup {
  id: string;
  title: string;
  /** Si se define, el grupo navega directo (Dashboard). Si no, es desplegable. */
  to?: string;
  icon: React.ReactNode;
  children?: ShellSubItem[];
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="9" rx="1"></rect>
      <rect x="14" y="3" width="7" height="5" rx="1"></rect>
      <rect x="14" y="12" width="7" height="9" rx="1"></rect>
      <rect x="3" y="16" width="7" height="5" rx="1"></rect>
    </svg>
  );
}

export function SecurityIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="5" y="10" width="14" height="10" rx="2"></rect>
      <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
    </svg>
  );
}

export function dashboardGroup(to: string): ShellGroup {
  return { id: 'dashboard', title: 'Dashboard', to, icon: <DashboardIcon /> };
}

export function securityGroup(children: ShellSubItem[]): ShellGroup {
  return { id: 'security', title: 'Seguridad', icon: <SecurityIcon />, children };
}

function initials(name: string | undefined, email: string | undefined): string {
  const base = (name ?? '').trim() || (email ?? '').split('@')[0] || 'SG';
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function roleLabel(roles: string[] | undefined): string {
  if (roles?.includes('ADMIN')) return 'Administrador';
  if (roles?.includes('USER')) return 'Usuario';
  return roles?.[0] ?? 'Cuenta';
}

export function ShellLayout({ menu }: { menu: ShellGroup[] }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userWrapRef = useRef<HTMLDivElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);

  const name = user?.name ?? user?.email?.split('@')[0] ?? 'Cuenta';
  const label = roleLabel(user?.roles);

  // Grupo activo según la ruta (igual que el nativo: el módulo padre queda resaltado).
  const activeGroupId = useMemo(() => {
    for (const g of menu) {
      if (g.to && (location.pathname === g.to || location.pathname.startsWith(g.to + '/'))) return g.id;
      if (g.children?.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + '/'))) return g.id;
    }
    return null;
  }, [location.pathname, menu]);

  // Auto-abrir el grupo activo (excepto dashboard, como en el nativo).
  useEffect(() => {
    if (activeGroupId && activeGroupId !== 'dashboard') setOpenGroup(activeGroupId);
    if (activeGroupId === 'dashboard') setOpenGroup(null);
  }, [activeGroupId]);

  // Cerrar dropdowns con click fuera / Escape (igual que admin-core.js).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (userWrapRef.current && !userWrapRef.current.contains(t)) setUserOpen(false);
      if (notifWrapRef.current && !notifWrapRef.current.contains(t)) setNotifOpen(false);
      if (!t.closest?.('.nav-group')) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserOpen(false);
        setNotifOpen(false);
        setOpenGroup(null);
        document.body.classList.remove('sg-mobile-open');
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Limpiar clases del body al desmontar.
  useEffect(() => {
    return () => {
      document.body.classList.remove('sg-mobile-open');
    };
  }, []);

  const toggleCollapse = () => {
    document.body.classList.toggle('sg-collapsed');
    setOpenGroup(null);
  };

  const toggleMobile = (open: boolean) => {
    document.body.classList.toggle('sg-mobile-open', open);
  };

  const handleGroupClick = (g: ShellGroup) => {
    if (g.to) {
      setOpenGroup(null);
      navigate(g.to);
      document.body.classList.remove('sg-mobile-open');
      return;
    }
    setOpenGroup((cur) => (cur === g.id ? null : g.id));
  };

  const handleLogout = async () => {
    setUserOpen(false);
    await logout();
    document.body.classList.remove('sg-mobile-open');
    navigate(paths.public.home, { replace: true });
  };

  return (
    <div className="app-shell">
      <a className="sr-only" href="#main-content">Saltar al contenido</a>

      <header className="topbar">
        <div className="topbar-start">
          <button className="icon-btn" data-mobile-nav onClick={() => toggleMobile(true)} aria-label="Abrir navegación">
            <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>
          </button>
          <button className="icon-btn desktop-collapse" onClick={toggleCollapse} aria-label="Colapsar navegación">
            <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h16"></path></svg>
          </button>
          <button className="brand" onClick={() => user && navigate(getHomeRoute(user))} aria-label="Ir al inicio">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 100 112" fill="none" style={{ width: 40, height: 45 }}>
                <path d="M50 5 L88 19 L88 55 C88 79 70 97 50 107 C30 97 12 79 12 55 L12 19 Z" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="5.5" strokeLinejoin="round"></path>
                <rect x="26" y="38" width="48" height="24" rx="12" ry="12" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="4"></rect>
                <circle cx="50" cy="50" r="9" fill="#00C8C8"></circle>
                <path d="M41 73 Q50 78 59 73" stroke="#00C8C8" strokeWidth="3.5" strokeLinecap="round" fill="none"></path>
              </svg>
            </span>
            <span className="brand-copy">
              <strong>SOMNGUARD</strong>
            </span>
          </button>
        </div>

        <div className="topbar-end">
          <div style={{ position: 'relative' }} ref={notifWrapRef}>
            <button
              className="icon-btn bell"
              aria-label="Notificaciones"
              onClick={(e) => {
                e.stopPropagation();
                setNotifOpen((v) => !v);
                setUserOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10.5 20a1.5 1.5 0 0 0 3 0"></path></svg>
            </button>
            {!notifOpen ? null : (
              <div className="dropdown" style={{ width: 340 }} role="dialog" aria-label="Notificaciones">
                <div className="dropdown-head">
                  <strong>Notificaciones</strong>
                  <span>Sin notificaciones por ahora</span>
                </div>
              </div>
            )}
          </div>

          <div className="user-menu-wrap" ref={userWrapRef}>
            <button
              className="user-trigger"
              aria-expanded={userOpen}
              onClick={(e) => {
                e.stopPropagation();
                setUserOpen((v) => !v);
                setNotifOpen(false);
              }}
            >
              <span className="user-avatar">{initials(user?.name, user?.email)}</span>
              <span className="user-copy"><strong>{name}</strong><span>{label}</span></span>
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><path d="m6 9 6 6 6-6"></path></svg>
            </button>
            {!userOpen ? null : (
              <div className="dropdown" role="menu" aria-label="Cuenta">
                <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                  <span aria-hidden="true">↪</span>Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="sidebar" aria-label="Navegación principal">
        {menu.map((g) => {
          const isActive = activeGroupId === g.id;
          const isOpen = openGroup === g.id;
          return (
            <div key={g.id} className={`nav-group${isActive ? ' active' : ''}${isOpen ? ' open' : ''}`} data-group={g.id}>
              <button
                className="nav-group-toggle"
                onClick={() => handleGroupClick(g)}
                title={g.title}
                aria-label={`Módulo ${g.title}`}
              >
                {g.icon}
                <span className="nav-group-title">{g.title}</span>
                {g.children ? (
                  <svg className="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"></path></svg>
                ) : null}
              </button>
              {g.children ? (
                <nav className="nav">
                  {g.children.map((c) => (
                    <NavLink
                      key={c.to}
                      to={c.to}
                      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                      onClick={() => document.body.classList.remove('sg-mobile-open')}
                    >
                      <span>{c.label}</span>
                    </NavLink>
                  ))}
                </nav>
              ) : null}
            </div>
          );
        })}
      </aside>
      <button className="sidebar-backdrop" aria-label="Cerrar navegación" onClick={() => toggleMobile(false)} />

      <main className="main-area" id="main-content">
        <div className="content">
          <Outlet />
        </div>
        <footer className="app-foot">
          <span>© 2026 SomnGuard</span>
          <a href="#" onClick={(e) => e.preventDefault()}>Privacidad</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Términos</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Contacto</a>
        </footer>
      </main>
    </div>
  );
}
