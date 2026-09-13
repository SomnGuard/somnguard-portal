import { SomnguardLogoStatic } from './SomnguardLogo';

type Props = {
  isAuthenticated: boolean;
  onOpen: (m: 'login' | 'register') => void;
  onLogout: () => void;
};

export function Header({ isAuthenticated, onOpen, onLogout }: Props) {
  return (
    <header className="header">
      <div className="logo-header">
        <SomnguardLogoStatic size={36} />
        <span className="logo-header-text">SOMNGUARD</span>
      </div>

      {!isAuthenticated ? (
        <div className="nav-buttons" id="authButtons">
          <button className="btn-nav" onClick={() => onOpen('login')}>Iniciar sesión</button>
          <button className="btn-nav" onClick={() => onOpen('register')}>Registrarse</button>
        </div>
      ) : (
        <button className="btn-nav" id="logoutBtn" onClick={onLogout}>Cerrar sesión</button>
      )}
    </header>
  );
}
