import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../features/auth/model/AuthContext';
import { getHomeRoute, paths } from '../paths';

export function ForbiddenPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const homeRoute = isAuthenticated ? getHomeRoute(user) : paths.public.home;

  const handleLogout = async () => {
    await logout();
    navigate(paths.public.home, { replace: true });
  };

  return (
    <section className="forbidden-page">
      <div className="simple-panel">
        <span className="eyebrow">403</span>
        <h1>Acceso no disponible</h1>
        <p>
          {isAuthenticated
            ? `Tu rol (${user?.roles.join(' · ') || 'sin rol'}) no tiene acceso a esta ruta.`
            : 'La sesión existe, pero no tiene un rol o permiso suficiente para esta ruta.'}
        </p>
        <Link className="btn-submit inline-action" to={homeRoute}>
          {isAuthenticated ? 'Volver a mi panel' : 'Volver al inicio'}
        </Link>
        {isAuthenticated && (
          <p style={{ marginTop: 12 }}>
            <button className="modal-link accent" onClick={handleLogout}>
              Cerrar sesión y volver a ingresar
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
