import { SomnguardLogoSync } from '../../../shared/ui/SomnguardLogo';

export function Hero() {
  const downloadApp = () => {
    const pdfPath = '/SOMNGUARD_APK_EN_PROCESO.pdf';
    const link = document.createElement('a');
    link.href = pdfPath;
    link.download = 'SOMNGUARD_APK_EN_PROCESO.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-left">
          <h1 className="hero-title">
            Tu seguridad al volante
            <span className="accent">empieza aquí</span>
          </h1>
          <p className="hero-subtitle">
            SOMNGUARD monitorea tu estado de alerta en tiempo real. No permitas que el cansancio tome el control. Descarga la app y mantente seguro.
          </p>
          <div className="download-buttons">
            <button className="btn-download" onClick={downloadApp}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.523 15.341c-.6-.583-.923-1.337-.923-2.141s.323-1.558.923-2.141c1.123-1.086 1.475-2.74.84-4.177C17.727 5.32 16.198 4.278 14.5 4c-2.012-.328-3.875.72-4.656 2.62-.78 1.9-.23 4.084 1.376 5.46.6.52.96 1.237.96 2.02s-.36 1.5-.96 2.02c-1.607 1.377-2.157 3.56-1.376 5.46.78 1.9 2.643 2.948 4.656 2.62 1.698-.278 3.227-1.32 3.863-2.883.636-1.437.284-3.09-.84-4.176zM7 12c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1z"></path>
              </svg>
              Descargar para Android
            </button>
          </div>
        </div>

        <div className="hero-right">
          <div className="logo-container">
            <SomnguardLogoSync id="heroLogo" />
            <div className="brand-name">SOMNGUARD</div>
          </div>
        </div>
      </div>
    </section>
  );
}
