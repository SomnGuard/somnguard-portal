import { NavLink, Outlet } from 'react-router-dom';
import { paths } from '../../../app/router/paths';

export function DeviceManagementPage() {
  return (
    <section className="module-page">
      <div className="page-heading compact">
        <span className="eyebrow">ADMIN / DEVICE MANAGEMENT</span>
        <h1>Gestión de dispositivos</h1>
        <p>Módulo administrativo para inventario y configuración.</p>
      </div>
      <nav className="module-tabs">
        <NavLink to={paths.admin.deviceList}>Dispositivos</NavLink>
        <NavLink to={paths.admin.deviceConfig}>Configuración</NavLink>
      </nav>
      <Outlet />
    </section>
  );
}
