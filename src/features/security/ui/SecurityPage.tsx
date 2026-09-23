export function SecurityPage() {
  return (
    <section>
      <nav className="breadcrumb">seguridad / <b>general</b></nav>
      <header className="page-header">
        <div>
          <h1>Seguridad</h1>
          <p>Submódulo general de seguridad.</p>
        </div>
        <div className="page-actions"></div>
      </header>
      <section className="panel">
        <div className="empty-state">
          <div>
            <div className="state-icon">◌</div>
            <h2>Submódulo vacío</h2>
            <p>Aún no hay contenido para mostrar en este submódulo.</p>
          </div>
        </div>
      </section>
    </section>
  );
}
