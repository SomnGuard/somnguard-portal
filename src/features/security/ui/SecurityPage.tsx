import { NavLink, Outlet } from 'react-router-dom';
import { paths } from '../../../app/router/paths';

export function SecurityPage() {
  return (
    <section className="admin-security-page">
      <nav className="module-tabs admin-security-tabs"><NavLink to={paths.admin.securityRoles}>Roles y permisos</NavLink><NavLink to={paths.admin.catalogs}>Catálogos</NavLink></nav>
      <Outlet />
    </section>
  );
}
