import { useEffect, useState, type FormEvent } from 'react';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';
import {
  assignRoleFeatureAdminApi, assignUserRoleAdminApi, createFeatureAdminApi, createRoleAdminApi, deleteFeatureAdminApi, deleteRoleAdminApi,
  listFeaturesAdminApi, listModuleFeaturesAdminApi, listModulesAdminApi, listRolesAdminApi, removeRoleFeatureAdminApi, removeUserRoleAdminApi, updateFeatureAdminApi, updateRoleAdminApi,
  type AdminModule, type Feature, type Role,
} from '../api/admin-rbac.api';

type EditRole = Role | null;
type EditFeature = Feature | null;

export function RolesPage() {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingRole, setEditingRole] = useState<EditRole>(null);
  const [editingFeature, setEditingFeature] = useState<EditFeature>(null);
  const [roleCode, setRoleCode] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [featureModuleId, setFeatureModuleId] = useState('');
  const [featureCode, setFeatureCode] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [grantRoleId, setGrantRoleId] = useState('');
  const [grantModuleId, setGrantModuleId] = useState('');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [moduleFeatures, setModuleFeatures] = useState<Feature[]>([]);
  const [userId, setUserId] = useState('');
  const [userRoleId, setUserRoleId] = useState('');
  const [relationId, setRelationId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [r, f, m] = await Promise.all([listRolesAdminApi(), listFeaturesAdminApi(), listModulesAdminApi()]);
      setRoles(Array.isArray(r) ? r : []); setFeatures(Array.isArray(f) ? f : []); setModules(Array.isArray(m) ? m : []);
      if (!featureModuleId && m[0]) setFeatureModuleId(m[0].id);
      if (!grantModuleId && m[0]) setGrantModuleId(m[0].id);
      if (!grantRoleId && r[0]) setGrantRoleId(r[0].id);
    } catch (error) { toast({ type: 'error', title: 'No se pudo cargar seguridad', msg: getUserMessage(error) }); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!grantModuleId) { setModuleFeatures([]); return; }
    let cancelled = false;
    void listModuleFeaturesAdminApi(grantModuleId).then((result) => {
      if (!cancelled) {
        setModuleFeatures(Array.isArray(result) ? result : []);
        setSelectedFeatureIds([]);
      }
    }).catch((error) => { if (!cancelled) toast({ type: 'error', title: 'No se pudieron cargar los permisos del módulo', msg: getUserMessage(error) }); });
    return () => { cancelled = true; };
  }, [grantModuleId, toast]);

  const resetRole = () => { setEditingRole(null); setRoleCode(''); setRoleName(''); setRoleDescription(''); };
  const resetFeature = () => { setEditingFeature(null); setFeatureCode(''); setFeatureName(''); setFeatureDescription(''); };
  const editRole = (role: Role) => { setEditingRole(role); setRoleCode(role.code); setRoleName(role.name); setRoleDescription(role.description ?? ''); };
  const editFeature = (feature: Feature) => { setEditingFeature(feature); setFeatureModuleId(feature.moduleId); setFeatureCode(feature.code); setFeatureName(feature.name); setFeatureDescription(feature.description ?? ''); };

  const saveRole = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = { code: roleCode.trim(), name: roleName.trim(), description: roleDescription.trim() };
      if (editingRole) await updateRoleAdminApi(editingRole.id, body); else await createRoleAdminApi(body);
      toast({ type: 'success', title: 'Rol guardado', msg: editingRole ? 'Se actualizaron los datos del rol.' : 'Se creó el rol.' });
      resetRole(); await load();
    } catch (error) { toast({ type: 'error', title: 'No se pudo guardar el rol', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };

  const saveFeature = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = { moduleId: featureModuleId, code: featureCode.trim(), name: featureName.trim(), description: featureDescription.trim() };
      if (editingFeature) await updateFeatureAdminApi(editingFeature.id, body); else await createFeatureAdminApi(body);
      toast({ type: 'success', title: 'Funcionalidad guardada', msg: editingFeature ? 'Se actualizaron los datos.' : 'Se creó la funcionalidad.' });
      resetFeature(); await load();
    } catch (error) { toast({ type: 'error', title: 'No se pudo guardar la funcionalidad', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };

  const removeRole = async (role: Role) => {
    if (!window.confirm(`¿Eliminar el rol ${role.name}?`)) return;
    try { await deleteRoleAdminApi(role.id); toast({ type: 'success', title: 'Rol eliminado', msg: role.name }); await load(); }
    catch (error) { toast({ type: 'error', title: 'No se pudo eliminar', msg: getUserMessage(error) }); }
  };
  const removeFeature = async (feature: Feature) => {
    if (!window.confirm(`¿Eliminar la funcionalidad ${feature.name}?`)) return;
    try { await deleteFeatureAdminApi(feature.id); toast({ type: 'success', title: 'Funcionalidad eliminada', msg: feature.name }); await load(); }
    catch (error) { toast({ type: 'error', title: 'No se pudo eliminar', msg: getUserMessage(error) }); }
  };

  const assignFeature = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const results = await Promise.allSettled(selectedFeatureIds.map((featureId) => assignRoleFeatureAdminApi(grantRoleId, featureId)));
      const successful = results.filter((result) => result.status === 'fulfilled');
      const firstRelation = successful.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<Record<string, unknown>> | undefined;
      if (firstRelation?.value.id) setRelationId(String(firstRelation.value.id));
      const failed = results.length - successful.length;
      if (failed === 0) {
        toast({ type: 'success', title: 'Permisos asignados', msg: `Se asignaron ${successful.length} funcionalidades al rol.` });
        setSelectedFeatureIds([]);
      } else {
        setSelectedFeatureIds(results.flatMap((result, index) => result.status === 'rejected' ? [selectedFeatureIds[index]] : []));
        toast({ type: 'error', title: 'Asignación parcial', msg: `${successful.length} asignadas y ${failed} no se pudieron guardar. Revisa e intenta con las pendientes.` });
      }
    } catch (error) { toast({ type: 'error', title: 'No se pudo asignar la funcionalidad', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };
  const removeFeatureAssignment = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await removeRoleFeatureAdminApi(relationId.trim()); setRelationId(''); toast({ type: 'success', title: 'Vínculo eliminado', msg: 'Se retiró la funcionalidad del rol.' }); }
    catch (error) { toast({ type: 'error', title: 'No se pudo retirar el vínculo', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };
  const assignUserRole = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await assignUserRoleAdminApi(userId.trim(), userRoleId); toast({ type: 'success', title: 'Rol asignado', msg: 'Se asignó el rol al UUID indicado.' }); }
    catch (error) { toast({ type: 'error', title: 'No se pudo asignar el rol', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };
  const removeUserRole = async () => {
    setBusy(true);
    try { await removeUserRoleAdminApi(userId.trim(), userRoleId); toast({ type: 'success', title: 'Rol retirado', msg: 'Se quitó el rol del usuario.' }); }
    catch (error) { toast({ type: 'error', title: 'No se pudo retirar el rol', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };

  return (
    <section className="admin-rbac-page">
      <header className="page-header"><div><span className="eyebrow">SEGURIDAD</span><h1>Roles y permisos</h1><p>Administra roles, funcionalidades y asignaciones disponibles en la API.</p></div></header>
      <div className="admin-rbac-refresh"><button className="device-button secondary" onClick={() => void load()} disabled={loading}>Actualizar</button></div>
      <div className="admin-rbac-columns">
        <section className="admin-rbac-card"><div className="admin-rbac-card-title"><div><span>CONTROL DE ACCESO</span><h2>Roles</h2></div><small>{roles.length} registrados</small></div>
          <form className="admin-rbac-form" onSubmit={(e) => void saveRole(e)}>
            <label>Código<input required maxLength={50} value={roleCode} onChange={(e) => setRoleCode(e.target.value)} placeholder="Ej. SUPERVISOR" /></label>
            <label>Nombre<input required maxLength={100} value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Nombre del rol" /></label>
            <label>Descripción<input maxLength={500} value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} placeholder="Descripción opcional" /></label>
            <div><button className="device-button primary" disabled={busy}>{editingRole ? 'Guardar cambios' : 'Crear rol'}</button>{editingRole ? <button type="button" className="device-button secondary" onClick={resetRole}>Cancelar</button> : null}</div>
          </form>
          <div className="admin-rbac-list">{loading ? <p>Cargando roles…</p> : null}{roles.map((role) => <article key={role.id}><div><strong>{role.name}</strong><span>{role.code} · {role.isActive === false ? 'Inactivo' : 'Activo'}</span><small>{role.description || role.id}</small></div><div><button onClick={() => editRole(role)}>Editar</button><button className="danger" onClick={() => void removeRole(role)}>Eliminar</button></div></article>)}</div>
        </section>

        <section className="admin-rbac-card"><div className="admin-rbac-card-title"><div><span>PERMISOS DEL SISTEMA</span><h2>Funcionalidades</h2></div><small>{features.length} registradas</small></div>
          <form className="admin-rbac-form" onSubmit={(e) => void saveFeature(e)}>
            <label>Módulo<select required value={featureModuleId} onChange={(e) => setFeatureModuleId(e.target.value)}><option value="">Selecciona módulo</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.name} · {module.code}</option>)}</select></label>
            <label>Código<input required maxLength={50} value={featureCode} onChange={(e) => setFeatureCode(e.target.value)} placeholder="Ej. device.read" /></label>
            <label>Nombre<input required maxLength={100} value={featureName} onChange={(e) => setFeatureName(e.target.value)} placeholder="Nombre del permiso" /></label>
            <label>Descripción<input value={featureDescription} onChange={(e) => setFeatureDescription(e.target.value)} /></label>
            <div><button className="device-button primary" disabled={busy || !modules.length}>{editingFeature ? 'Guardar cambios' : 'Crear funcionalidad'}</button>{editingFeature ? <button type="button" className="device-button secondary" onClick={resetFeature}>Cancelar</button> : null}</div>
          </form>
          <div className="admin-rbac-list">{features.map((feature) => <article key={feature.id}><div><strong>{feature.name}</strong><span>{feature.code} · {modules.find((module) => module.id === feature.moduleId)?.name ?? feature.moduleId}</span><small>{feature.description || feature.id}</small></div><div><button onClick={() => editFeature(feature)}>Editar</button><button className="danger" onClick={() => void removeFeature(feature)}>Eliminar</button></div></article>)}</div>
        </section>
      </div>
      <div className="admin-rbac-columns secondary">
        <section className="admin-rbac-card"><div className="admin-rbac-card-title"><div><span>ASIGNACIÓN</span><h2>Funcionalidad a rol</h2></div></div>
          <form className="admin-rbac-form" onSubmit={(e) => void assignFeature(e)}><label>Rol<select required value={grantRoleId} onChange={(e) => setGrantRoleId(e.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label>Módulo<select required value={grantModuleId} onChange={(e) => setGrantModuleId(e.target.value)}>{modules.map((module) => <option key={module.id} value={module.id}>{module.name}</option>)}</select></label><div className="admin-feature-checklist"><div className="admin-feature-checklist-head"><strong>Funcionalidades del módulo</strong><button type="button" onClick={() => setSelectedFeatureIds(selectedFeatureIds.length === moduleFeatures.length ? [] : moduleFeatures.map((feature) => feature.id))} disabled={!moduleFeatures.length}>{selectedFeatureIds.length === moduleFeatures.length ? 'Quitar selección' : 'Seleccionar todas'}</button></div>{moduleFeatures.length ? moduleFeatures.map((feature) => <label className="admin-feature-checkbox" key={feature.id}><input type="checkbox" checked={selectedFeatureIds.includes(feature.id)} onChange={(e) => setSelectedFeatureIds((current) => e.target.checked ? [...current, feature.id] : current.filter((id) => id !== feature.id))} /><span><strong>{feature.name}</strong><small>{feature.code}{feature.description ? ` · ${feature.description}` : ''}</small></span></label>) : <p className="admin-rbac-hint">No hay funcionalidades disponibles para este módulo.</p>}</div><button className="device-button primary" disabled={busy || !roles.length || !selectedFeatureIds.length}>{busy ? 'Asignando…' : `Asignar ${selectedFeatureIds.length || ''} funcionalidad${selectedFeatureIds.length === 1 ? '' : 'es'}`}</button></form>
          <form className="admin-rbac-form inline" onSubmit={(e) => void removeFeatureAssignment(e)}><label>ID del vínculo para retirar<input required value={relationId} onChange={(e) => setRelationId(e.target.value)} placeholder="UUID devuelto al asignar" /></label><button className="device-button secondary" disabled={busy}>Retirar vínculo</button></form>
          <p className="admin-rbac-hint">La API no incluye una consulta para listar vínculos rol-funcionalidad; el UUID se obtiene en la respuesta de asignación.</p>
        </section>
        <section className="admin-rbac-card"><div className="admin-rbac-card-title"><div><span>ASIGNACIÓN</span><h2>Rol a usuario</h2></div></div>
          <form className="admin-rbac-form" onSubmit={(e) => void assignUserRole(e)}><label>UUID del usuario<input required value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label><label>Rol<select required value={userRoleId} onChange={(e) => setUserRoleId(e.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><div><button className="device-button primary" disabled={busy || !roles.length}>Asignar rol</button><button type="button" className="device-button secondary" disabled={busy || !userId || !userRoleId} onClick={() => void removeUserRole()}>Quitar rol</button></div></form>
          <p className="admin-rbac-hint">No hay endpoint de listado/búsqueda de usuarios en el contrato. La asignación y retiro requieren un UUID conocido.</p>
        </section>
      </div>
    </section>
  );
}
