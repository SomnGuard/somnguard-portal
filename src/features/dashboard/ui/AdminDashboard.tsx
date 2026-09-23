export function AdminDashboard() {
  return (
    <section>
      <nav className="breadcrumb">dashboard / <b>dashboard</b></nav>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Vista general del panel administrativo.</p>
        </div>
        <div className="page-actions"></div>
      </header>
      <section className="panel">
        <div className="empty-state">
          <div>
            <div className="state-icon">◌</div>
            <h2>Dashboard vacío</h2>
            <p>Aún no hay contenido para mostrar en este módulo.</p>
          </div>
        </div>
      </section>
    </section>
  );
}
