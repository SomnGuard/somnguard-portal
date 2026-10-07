import { useNavigate } from 'react-router-dom';
import { paths } from '../../../app/router/paths';

function HomeLogo() {
  return (
    <svg viewBox="0 0 100 112" fill="none" aria-hidden="true">
      <path d="M50 5 L88 19 L88 55 C88 79 70 97 50 107 C30 97 12 79 12 55 L12 19 Z" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="5.5" strokeLinejoin="round"></path>
      <rect x="26" y="38" width="48" height="24" rx="12" ry="12" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="4"></rect>
      <circle cx="50" cy="50" r="9" fill="#00C8C8" stroke="none"></circle>
      <path d="M41 73 Q50 78 59 73" stroke="#00C8C8" strokeWidth="3.5" strokeLinecap="round" fill="none"></path>
    </svg>
  );
}

export function UserDashboard() {
  const navigate = useNavigate();
  return (
    <section className="module-page user-page user-home">
      <div className="user-home-logo">
        <HomeLogo />
      </div>
      <h1>SOMNGUARD</h1>
      <p>Monitoreo de conductor en tiempo real</p>
      <div className="user-home-actions">
        <button
          type="button"
          className="user-home-primary"
          onClick={() => navigate(paths.user.device)}
        >
          Iniciar monitoreo
        </button>
        <button
          type="button"
          className="user-home-outline"
          onClick={() => navigate(paths.user.events)}
        >
          Ver eventos
        </button>
      </div>
    </section>
  );
}
