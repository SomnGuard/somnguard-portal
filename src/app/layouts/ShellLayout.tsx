import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/model/AuthContext';
import { getHomeRoute, hasPermission, paths } from '../router/paths';
import {
  getUnreadCountApi,
  listNotificationsApi,
  markNotificationReadApi,
  type NotificationItem,
} from '../../features/notifications/api/notifications.api';
import {
  getBrowserNotifyPermission,
  showBrowserNotification,
} from '../../features/notifications/api/browserNotify';
import { NotificationPermissionBanner } from '../../features/notifications/ui/NotificationPermissionBanner';

/** Polling de novedades HU-API-009 (alineado al sync del device). */
const NOTIF_POLL_MS = 20000;

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

export function BellIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path>
      <path d="M10.5 20a1.5 1.5 0 0 0 3 0"></path>
    </svg>
  );
}

export function dashboardGroup(to: string): ShellGroup {
  return { id: 'dashboard', title: 'Inicio', to, icon: <DashboardIcon /> };
}

export function securityGroup(children: ShellSubItem[]): ShellGroup {
  return { id: 'security', title: 'Seguridad', icon: <SecurityIcon />, children };
}

function DeviceIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="7" y="2.5" width="10" height="19" rx="2"></rect>
      <path d="M10 18h4"></path>
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M3 12h4l2-6 4 12 2-6h6"></path>
    </svg>
  );
}

function PreferencesIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 3v3M12 18v3M4.2 7.1l2.1 1.2M17.7 15.7l2.1 1.2M3 12h3M18 12h3M4.2 16.9l2.1-1.2M17.7 8.3l2.1-1.2"></path>
      <circle cx="12" cy="12" r="3.2"></circle>
    </svg>
  );
}

export function deviceGroup(to: string): ShellGroup {
  return { id: 'device', title: 'Monitoreo', to, icon: <DeviceIcon /> };
}

export function eventsGroup(children: ShellSubItem[]): ShellGroup {
  return { id: 'events', title: 'Eventos', icon: <EventsIcon />, children };
}

export function preferencesGroup(to: string): ShellGroup {
  return { id: 'preferences', title: 'Preferencias', to, icon: <PreferencesIcon /> };
}

export function alertsGroup(children: ShellSubItem[]): ShellGroup {
  return eventsGroup(children);
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
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const userWrapRef = useRef<HTMLDivElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);

  // Vocabulario frontend (auth.api mapea "notification.read" -> "NOTIFICATION_READ").
  const canNotify =
    hasPermission(user, 'NOTIFICATION_READ') || hasPermission(user, 'NOTIFICATION_SEND');

  const name = user?.name ?? user?.email?.split('@')[0] ?? 'Cuenta';
  const label = roleLabel(user?.roles);
  const isUserShell = location.pathname.startsWith('/user');

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

  // HU-API-009: campana en vivo. Primera carga siembra conocidos (sin spam);
  // el polling eleva aviso nativo del SO solo por novedades sin leer.
  useEffect(() => {
    if (!user || !canNotify) {
      setUnread(0);
      setNotifs([]);
      knownIdsRef.current = new Set();
      return;
    }
    void refreshNotifs(false);
    // Sin filtro de pestaña oculta: el navegador ya limita el intervalo en
    // segundo plano y el aviso nativo solo tiene sentido fuera del foco.
    const timer = window.setInterval(() => {
      void refreshNotifs(true);
    }, NOTIF_POLL_MS);
    const onFocus = () => {
      void refreshNotifs(true);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.pathname]);

  // El clic en el aviso nativo abre las alertas (o el dropdown fuera de /user).
  useEffect(() => {
    const open = () => {
      if (location.pathname.startsWith('/user')) {
        navigate(paths.user.alerts);
      } else {
        setNotifOpen(true);
        void refreshNotifs(false);
      }
    };
    window.addEventListener('sg:notifications-open', open);
    return () => window.removeEventListener('sg:notifications-open', open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navigate]);

  const refreshNotifs = async (background: boolean) => {
    setNotifLoading(true);
    try {
      const [page, unreadCount] = await Promise.all([
        listNotificationsApi(1, 5),
        getUnreadCountApi(),
      ]);
      setNotifs(page.data);
      setUnread(Number.isFinite(unreadCount) ? unreadCount : page.data.filter((n) => !n.readAt).length);
      if (background && getBrowserNotifyPermission() === 'granted') {
        for (const n of page.data) {
          if (!n.readAt && !knownIdsRef.current.has(n.id)) {
            showBrowserNotification(n);
          }
        }
      }
      knownIdsRef.current = new Set(page.data.map((n) => n.id));
    } catch {
      // Sin backend de notificaciones: se muestra el vacío.
    } finally {
      setNotifLoading(false);
    }
  };

  const handleNotifToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !notifOpen;
    setNotifOpen(next);
    setUserOpen(false);
    if (next) void refreshNotifs(false);
  };

  const handleNotifRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString(), status: 'NOTIFICATION_READ' } : n)),
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      // Reintento manual desde Mis alertas.
    }
  };

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
    <div className={`app-shell${isUserShell ? ' user-shell' : ''}`}>
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
                <circle cx="50" cy="50" r="9" fill="#00C8C8" stroke="none"></circle>
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
              onClick={handleNotifToggle}
            >
              <svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10.5 20a1.5 1.5 0 0 0 3 0"></path></svg>
              {unread > 0 ? <span className="bell-dot" aria-label={`${unread} sin leer`} /> : null}
            </button>
            {!notifOpen ? null : (
              <div className={`notification-popover${isUserShell ? ' notification-popover-user' : ''}`} role="dialog" aria-label="Notificaciones">
                <div className="notification-popover-head">
                  <div>
                    <span className="notification-popover-eyebrow">Centro de avisos</span>
                    <strong>Notificaciones</strong>
                  </div>
                  <span className={`notification-count${unread > 0 ? ' has-unread' : ''}`}>
                    {unread > 0 ? `${unread} sin leer` : 'Al día'}
                  </span>
                </div>
                <div className="notification-popover-body">
                  {notifLoading ? <p className="notification-empty">Cargando notificaciones…</p> : null}
                  {!notifLoading && notifs.length === 0 ? (
                    <div className="notification-empty-state">
                      <span className="notification-empty-icon"><BellIcon /></span>
                      <strong>No tienes notificaciones</strong>
                      <span>Los nuevos avisos aparecerán aquí.</span>
                    </div>
                  ) : null}
                  {notifs.map((n) => (
                    <button
                      key={n.id}
                      className={`notification-item${n.readAt ? ' is-read' : ' is-unread'}`}
                      onClick={() => void handleNotifRead(n.id)}
                      title={n.readAt ? 'Notificación leída' : 'Marcar como leída'}
                    >
                      <span className="notification-item-mark" aria-hidden="true"></span>
                      <span className="notification-item-content">
                        <span className="notification-item-title-row">
                          <strong>{n.title || '(sin título)'}</strong>
                          {!n.readAt ? <span className="notification-unread-label">Nueva</span> : null}
                        </span>
                        <span className="notification-item-message">{n.message}</span>
                        <span className="notification-item-meta">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Ahora'}
                          <i aria-hidden="true">·</i>{n.channel || 'in_app'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {isUserShell ? (
                  <div className="notification-popover-foot">
                    <button
                      className="notification-view-all"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate(paths.user.alerts);
                      }}
                    >
                      Ver todas las notificaciones
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                ) : null}
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
        {canNotify ? <NotificationPermissionBanner /> : null}
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
