export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">SomnGuard</span>
          <span className="footer-subtitle">Sistema de monitoreo y gestión</span>
        </div>

        <div className="footer-bottom">
          <span>© 2026 SomnGuard. Todos los derechos reservados.</span>
          <nav className="footer-links" aria-label="Enlaces legales">
            <a href="#" onClick={(e) => e.preventDefault()}>Política de privacidad</a>
            <span className="footer-sep" aria-hidden> | </span>
            <a href="#" onClick={(e) => e.preventDefault()}>Términos y condiciones</a>
            <span className="footer-sep" aria-hidden> | </span>
            <a href="#" onClick={(e) => e.preventDefault()}>Contacto</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
