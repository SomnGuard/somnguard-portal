import { AutoLiveBox } from '../../streaming/ui/AutoLiveBox';

export function UserDashboard() {
  return (
    <section>
      <nav className="breadcrumb">dashboard / <b>dashboard</b></nav>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Vista general de tu espacio.</p>
        </div>
        <div className="page-actions"></div>
      </header>
      <section className="panel">
        <AutoLiveBox />
      </section>
    </section>
  );
}
