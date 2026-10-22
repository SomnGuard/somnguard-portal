import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/model/AuthContext';
import { getHomeRoute, paths } from '../router/paths';
import { SomnguardLogoStatic } from '../../shared/ui/SomnguardLogo';

export function RoleHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate(paths.public.home, { replace: true });
  };

  return (
    <header className="portal-header">
      <button className="portal-brand" onClick={() => user && navigate(getHomeRoute(user))} aria-label="Ir al inicio del portal">
        <SomnguardLogoStatic size={34} />
        <span>SOMNGUARD</span>
      </button>
      <div className="portal-header-center">{title}</div>
      <div className="portal-user">
        <div>
          <strong>{user?.name}</strong>
          <span>{user?.roles.join(' · ')}</span>
        </div>
        <button className="btn-nav" onClick={handleLogout}>Cerrar sesión</button>
      </div>
    </header>
  );
}
