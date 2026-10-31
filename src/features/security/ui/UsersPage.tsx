import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { hasPermission } from '../../../app/router/paths';
import { useAuth } from '../../auth/model/AuthContext';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';
import { assignUserRoleAdminApi, listRolesAdminApi, removeUserRoleAdminApi, type Role } from '../api/admin-rbac.api';
import { createUserAdminApi, deleteUserAdminApi, getUserAdminApi, listUsersAdminApi, updateUserAdminApi, type AdminUser } from '../api/admin-users.api';

const emptyForm = { email: '', password: '', firstName: '', lastName: '', phone: '' };

export function UsersPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canWriteUsers = hasPermission(user, 'USER_WRITE');
  const canAssignRoles = hasPermission(user, 'ROLE_ASSIGN') || hasPermission(user, 'ROLE_WRITE');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userDetails, setUserDetails] = useState<AdminUser | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [roleId, setRoleId] = useState('');

  const load = async (keepSelected = true, preferredSelectedId?: string) => {
    setLoading(true);
    try {
      const [usersResult, rolesResult] = await Promise.allSettled([listUsersAdminApi(), listRolesAdminApi()]);
      if (usersResult.status === 'rejected') throw usersResult.reason;
      const listedUsers = usersResult.value;
      const listedRoles = rolesResult.status === 'fulfilled' ? rolesResult.value : [];
      const safeUsers = Array.isArray(listedUsers) ? listedUsers : [];
      setUsers(safeUsers);
      setUserDetails(null);
      setRoles(Array.isArray(listedRoles) ? listedRoles : []);
      if (rolesResult.status === 'rejected') toast({ type: 'error', title: 'No se pudieron cargar roles', msg: getUserMessage(rolesResult.reason) });
      const requestedId = preferredSelectedId ?? selectedId;
      setSelectedId(keepSelected && safeUsers.some((item) => item.id === requestedId) ? requestedId : safeUsers[0]?.id ?? '');
      setRoleId((current) => current || (Array.isArray(listedRoles) ? listedRoles.find((item) => item.isActive !== false)?.id : '') || '');
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo cargar usuarios', msg: getUserMessage(error) });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(false); }, []);

  const selectedSummary = users.find((item) => item.id === selectedId) ?? null;
  const selected = userDetails?.id === selectedId ? userDetails : selectedSummary;
  const visibleUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return users;
    return users.filter((item) => `${item.firstName} ${item.lastName} ${item.email} ${item.phone ?? ''}`.toLocaleLowerCase().includes(query));
  }, [search, users]);

  useEffect(() => {
    if (!selectedId) { setUserDetails(null); setForm(emptyForm); return; }
    let cancelled = false;
    void getUserAdminApi(selectedId).then((details) => { if (!cancelled) setUserDetails(details); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    setForm({ email: selected.email, password: '', firstName: selected.firstName, lastName: selected.lastName, phone: selected.phone ?? '' });
  }, [selected]);

  const saveUser = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    let preferredId: string | undefined;
    try {
      if (selected) {
        await updateUserAdminApi(selected.id, { email: form.email.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim() || undefined });
        toast({ type: 'success', title: 'Usuario actualizado', msg: 'Los cambios se guardaron.' });
      } else {
        const created = await createUserAdminApi({ email: form.email.trim(), password: form.password, firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim() || undefined });
        toast({ type: 'success', title: 'Usuario creado', msg: 'La API creó la cuenta y envió la verificación de correo.' });
        preferredId = created.id;
        setSelectedId(created.id);
      }
      await load(true, preferredId);
    } catch (error) { toast({ type: 'error', title: 'No se pudo guardar el usuario', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };

  const removeUser = async () => {
    if (!selected || !window.confirm(`¿Eliminar la cuenta de ${selected.email}?`)) return;
    setBusy(true);
    try {
      await deleteUserAdminApi(selected.id);
      toast({ type: 'success', title: 'Usuario eliminado', msg: 'La cuenta fue desactivada.' });
      setSelectedId(''); await load(false);
    } catch (error) { toast({ type: 'error', title: 'No se pudo eliminar el usuario', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };

  const assignRole = async (nextRoleId: string) => {
    if (!selected) return;
    if (selected.roles?.some((assigned) => assigned.id === nextRoleId)) {
      setRoleId('');
      await load();
      toast({ type: 'info', title: 'Rol ya asignado', msg: 'Este usuario ya tenía ese rol. La ficha se actualizó.' });
      return;
    }
    setBusy(true);
    try {
      await assignUserRoleAdminApi(selected.id, nextRoleId);
      setRoleId('');
      toast({ type: 'success', title: 'Rol asignado', msg: `Se asignó ${roles.find((role) => role.id === nextRoleId)?.name ?? 'el rol'} a ${selected.email}.` });
      await load();
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
      if (status === 409) {
        setRoleId('');
        await load();
        toast({ type: 'info', title: 'Rol ya asignado', msg: 'La API confirmó que el usuario ya tenía ese rol. Se actualizó la ficha.' });
      } else toast({ type: 'error', title: 'No se pudo asignar el rol', msg: getUserMessage(error) });
    }
    finally { setBusy(false); }
  };

  const removeRole = async (role: Role) => {
    if (!selected) return;
    setBusy(true);
    try {
      await removeUserRoleAdminApi(selected.id, role.id);
      toast({ type: 'success', title: 'Rol retirado', msg: `Se quitó ${role.name} de ${selected.email}.` });
      await load();
    } catch (error) { toast({ type: 'error', title: 'No se pudo retirar el rol', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };

  return <section className="admin-rbac-page admin-users-page">
    <header className="page-header"><div><span className="eyebrow">SEGURIDAD</span><h1>Usuarios</h1><p>Consulta cuentas y administra los roles disponibles según tus permisos.</p></div></header>
    <div className="admin-rbac-refresh"><span>{users.length} usuarios</span><div className="admin-users-toolbar-actions">{canWriteUsers ? <button className="device-button primary" type="button" disabled={busy} onClick={() => { setSelectedId(''); setUserDetails(null); setForm(emptyForm); }}>{selectedId ? 'Nuevo usuario' : 'Limpiar formulario'}</button> : null}<button className="device-button secondary" onClick={() => void load()} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</button></div></div>
    <div className="admin-users-layout">
      <section className="admin-rbac-card admin-users-list"><div className="admin-rbac-card-title"><div><span>CUENTAS REGISTRADAS</span><h2>Directorio</h2></div></div>
        <label className="admin-users-search">Buscar usuario<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, correo o teléfono" /></label>
        {loading ? <p className="admin-rbac-hint">Cargando usuarios…</p> : visibleUsers.length ? <div className="admin-users-rows">{visibleUsers.map((item) => <button type="button" key={item.id} className={`admin-user-row${item.id === selectedId ? ' selected' : ''}`} onClick={() => setSelectedId(item.id)}><span className="admin-user-avatar">{`${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`.toLocaleUpperCase() || 'U'}</span><span className="admin-user-row-copy"><strong>{item.firstName} {item.lastName}</strong><small>{item.email}</small><span className="admin-user-role-chips">{item.roles?.length ? item.roles.map((role) => <span key={role.id}>{role.name}</span>) : <span>Sin roles</span>}</span></span><span className={`admin-user-status${item.isActive ? ' active' : ''}`}>{item.isActive ? 'Activo' : 'Inactivo'}</span></button>)}</div> : <p className="admin-rbac-hint">No hay usuarios que coincidan con la búsqueda.</p>}
      </section>
      <section className="admin-rbac-card admin-user-details"><div className="admin-rbac-card-title"><div><span>FICHA DE CUENTA</span><h2>{selected ? `${selected.firstName} ${selected.lastName}` : canWriteUsers ? 'Crear usuario' : 'Selecciona un usuario'}</h2></div></div>
        {selected ? <>
          {canWriteUsers ? <form className="admin-rbac-form admin-user-form" onSubmit={(event) => void saveUser(event)}>
            <label>Correo<input type="email" required maxLength={254} disabled={busy} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <div className="admin-users-name-fields"><label>Nombre<input required maxLength={100} disabled={busy} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label><label>Apellido<input required maxLength={100} disabled={busy} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label></div>
            <label>Teléfono<input maxLength={30} disabled={busy} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <div><button className="device-button primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><button type="button" className="device-button secondary" disabled={busy} onClick={() => setForm({ email: selected.email, password: '', firstName: selected.firstName, lastName: selected.lastName, phone: selected.phone ?? '' })}>Restaurar datos</button><button type="button" className="device-button danger" disabled={busy} onClick={() => void removeUser()}>Eliminar usuario</button></div>
          </form> : <dl className="admin-user-readonly"><div><dt>Correo</dt><dd>{selected.email}</dd></div><div><dt>Nombre</dt><dd>{selected.firstName} {selected.lastName}</dd></div><div><dt>Teléfono</dt><dd>{selected.phone || '—'}</dd></div></dl>}
          <div className="admin-user-meta"><span>Estado<strong>{selected.isActive ? 'Activo' : 'Inactivo'}</strong></span><span>Correo verificado<strong>{selected.emailVerifiedAt ? 'Sí' : 'Pendiente'}</strong></span><span>Último acceso<strong>{selected.lastLoginAt ? new Date(selected.lastLoginAt).toLocaleString() : 'Sin registro'}</strong></span></div>
          <div className="admin-user-role-section"><div className="admin-rbac-card-title"><div><span>AUTORIZACIÓN</span><h2>Roles asignados</h2></div></div>
            {selected.roles?.length ? <div className="admin-user-assigned-roles">{selected.roles.map((assigned) => <div key={assigned.id}><span><strong>{assigned.name}</strong><small>{assigned.code}</small></span>{canAssignRoles ? <button type="button" className="danger" disabled={busy} onClick={() => { const role = roles.find((item) => item.id === assigned.id); if (role) void removeRole(role); }}>Quitar</button> : null}</div>)}</div> : <p className="admin-rbac-hint">Este usuario no tiene roles asignados.</p>}
            {canAssignRoles ? <form className="admin-rbac-form inline" onSubmit={(event) => { event.preventDefault(); if (roleId) void assignRole(roleId); }}><label>Asignar rol<select value={roleId} onChange={(event) => setRoleId(event.target.value)}><option value="">Selecciona un rol</option>{roles.filter((role) => role.isActive !== false && !selected.roles?.some((assigned) => assigned.id === role.id)).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><button className="device-button primary" disabled={busy || !roleId || !roles.some((role) => role.id === roleId && role.isActive !== false && !selected.roles?.some((assigned) => assigned.id === role.id))}>Asignar</button></form> : <p className="admin-rbac-hint">Tu cuenta puede consultar roles, pero no modificarlos.</p>}
          </div>
        </> : canWriteUsers ? <form className="admin-rbac-form admin-user-form" onSubmit={(event) => void saveUser(event)}><p className="admin-rbac-hint">Crea una cuenta con una contraseña inicial. La API enviará el correo de verificación.</p><label>Correo<input type="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Contraseña inicial<input type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><div className="admin-users-name-fields"><label>Nombre<input required maxLength={100} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label><label>Apellido<input required maxLength={100} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label></div><label>Teléfono<input maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><div><button className="device-button primary" disabled={busy}>{busy ? 'Creando…' : 'Crear usuario'}</button><button type="button" className="device-button secondary" disabled={busy} onClick={() => { const firstUser = users[0]; setSelectedId(firstUser?.id ?? ''); setForm(emptyForm); }}>Cancelar</button></div></form> : <p className="admin-rbac-hint">No tienes permiso para crear usuarios. Selecciona una cuenta para consultar sus datos.</p>}
      </section>
    </div>
  </section>;
}
