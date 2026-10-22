import { useEffect, useState, type FormEvent } from 'react';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';
import { createCatalogItemApi, deleteCatalogItemApi, listCatalogApi, updateCatalogItemApi, type CatalogKey } from '../api/catalogs.api';

type Field = { key: string; label: string; type?: 'text' | 'number' | 'boolean' | 'json' | 'pattern' | 'category' | 'severity' | 'sound'; required?: boolean; min?: number; maxLength?: number };
const CATALOGS: Array<{ key: CatalogKey; label: string; hint: string; fields: Field[] }> = [
  { key: 'event-categories', label: 'Categorías', hint: 'Agrupan los tipos de eventos.', fields: [{ key: 'code', label: 'Código', required: true, maxLength: 30 }, { key: 'name', label: 'Nombre', required: true, maxLength: 100 }, { key: 'description', label: 'Descripción' }, { key: 'sortOrder', label: 'Orden', type: 'number', min: 0 }, { key: 'isActive', label: 'Activo', type: 'boolean' }] },
  { key: 'event-types', label: 'Tipos de evento', hint: 'Relaciona cada tipo con una categoría, severidad y patrón sonoro.', fields: [{ key: 'code', label: 'Código', required: true, maxLength: 30 }, { key: 'name', label: 'Nombre', required: true, maxLength: 100 }, { key: 'eventCategoryId', label: 'Categoría', type: 'category', required: true }, { key: 'defaultSeverityId', label: 'Severidad predeterminada', type: 'severity', required: true }, { key: 'defaultSoundPatternId', label: 'Patrón sonoro', type: 'sound', required: true }, { key: 'thresholdConfig', label: 'Configuración de umbrales (JSON)', type: 'json' }, { key: 'status', label: 'Estado' }, { key: 'statusCategory', label: 'Categoría del estado' }, { key: 'isActive', label: 'Activo', type: 'boolean' }] },
  { key: 'severities', label: 'Severidades', hint: 'Define niveles de severidad y prioridad.', fields: [{ key: 'code', label: 'Código', required: true, maxLength: 20 }, { key: 'name', label: 'Nombre', required: true, maxLength: 50 }, { key: 'priority', label: 'Prioridad', type: 'number', required: true, min: 1 }, { key: 'isActive', label: 'Activo', type: 'boolean' }] },
  { key: 'sound-patterns', label: 'Patrones sonoros', hint: 'Configura frecuencia, duración y repetición de alertas.', fields: [{ key: 'code', label: 'Código', required: true, maxLength: 30 }, { key: 'description', label: 'Descripción', required: true }, { key: 'frequencyHz', label: 'Frecuencia (Hz)', type: 'number', required: true, min: 1 }, { key: 'durationMs', label: 'Duración (ms)', type: 'number', required: true, min: 1 }, { key: 'repetitions', label: 'Repeticiones', type: 'number', min: 0 }, { key: 'patternType', label: 'Tipo de patrón', type: 'pattern' }, { key: 'intervalMs', label: 'Intervalo (ms)', type: 'number', min: 1 }, { key: 'isActive', label: 'Activo', type: 'boolean' }] },
  { key: 'media-types', label: 'Tipos de medio', hint: 'Define MIME y tamaño máximo para evidencias.', fields: [{ key: 'code', label: 'Código', required: true, maxLength: 20 }, { key: 'name', label: 'Nombre', required: true, maxLength: 50 }, { key: 'mimeType', label: 'MIME type', required: true, maxLength: 50 }, { key: 'maxSizeMb', label: 'Tamaño máximo (MB)', type: 'number', min: 1 }, { key: 'isActive', label: 'Activo', type: 'boolean' }] },
];

function defaults(catalog: typeof CATALOGS[number], item?: Record<string, unknown>) {
  const result: Record<string, string> = {};
  for (const field of catalog.fields) {
    const value = item?.[field.key];
    if (value !== undefined && value !== null) result[field.key] = field.type === 'json' ? JSON.stringify(value, null, 2) : String(value);
    else if (field.type === 'json') result[field.key] = '{}';
    else if (field.type === 'boolean') result[field.key] = 'true';
    else if (field.type === 'number') result[field.key] = field.min !== undefined ? String(field.min) : '';
    else result[field.key] = '';
  }
  return result;
}

function makePayload(catalog: typeof CATALOGS[number], form: Record<string, string>, editing: boolean) {
  const body: Record<string, unknown> = {};
  for (const field of catalog.fields) {
    if (field.key === 'isActive' && !editing) continue;
    const value = form[field.key] ?? '';
    if (!value && !field.required) continue;
    if (field.type === 'number') { if (value) body[field.key] = Number(value); }
    else if (field.type === 'boolean') body[field.key] = value === 'true';
    else if (field.type === 'json') { if (value) body[field.key] = JSON.parse(value); }
    else body[field.key] = value;
  }
  return body;
}

export function CatalogsPage() {
  const toast = useToast();
  const [catalogKey, setCatalogKey] = useState<CatalogKey>('event-categories');
  const catalog = CATALOGS.find((item) => item.key === catalogKey)!;
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => defaults(CATALOGS[0]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [references, setReferences] = useState<Record<'category' | 'severity' | 'sound', Record<string, unknown>[]>>({ category: [], severity: [], sound: [] });

  const load = async (key = catalogKey) => {
    setLoading(true); setError('');
    try { const rows = await listCatalogApi(key); setItems(Array.isArray(rows) ? rows : []); }
    catch (reason) { setItems([]); setError(getUserMessage(reason)); }
    finally { setLoading(false); }
  };

  useEffect(() => { setSelected(null); setForm(defaults(catalog)); void load(catalogKey); }, [catalogKey]);

  useEffect(() => {
    if (catalogKey !== 'event-types') return;
    let cancelled = false;
    void Promise.all([listCatalogApi('event-categories'), listCatalogApi('severities'), listCatalogApi('sound-patterns')]).then(([category, severity, sound]) => {
      if (!cancelled) setReferences({ category, severity, sound });
    }).catch((reason) => { if (!cancelled) toast({ type: 'error', title: 'No se pudieron cargar las referencias', msg: getUserMessage(reason) }); });
    return () => { cancelled = true; };
  }, [catalogKey, toast]);

  const selectItem = (item: Record<string, unknown>) => { setSelected(item); setForm(defaults(catalog, item)); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = makePayload(catalog, form, Boolean(selected));
      if (selected) await updateCatalogItemApi(catalogKey, String(selected.id), body);
      else await createCatalogItemApi(catalogKey, body);
      toast({ type: 'success', title: 'Catálogo actualizado', msg: selected ? 'Se guardaron los cambios.' : 'Se creó el registro.' });
      setSelected(null); setForm(defaults(catalog)); await load(catalogKey);
    } catch (reason) { toast({ type: 'error', title: 'No se pudo guardar', msg: reason instanceof SyntaxError ? 'El campo JSON no tiene una estructura válida.' : getUserMessage(reason) }); }
    finally { setSaving(false); }
  };
  const remove = async (item: Record<string, unknown>) => {
    if (!window.confirm(`¿Eliminar ${String(item.name ?? item.code ?? item.id)}?`)) return;
    try { await deleteCatalogItemApi(catalogKey, String(item.id)); toast({ type: 'success', title: 'Registro eliminado', msg: String(item.code ?? item.name ?? '') }); await load(catalogKey); }
    catch (reason) { toast({ type: 'error', title: 'No se pudo eliminar', msg: getUserMessage(reason) }); }
  };

  return (
    <section className="admin-catalog-page">
      <header className="page-header"><div><span className="eyebrow">PARAMETRIZACIÓN</span><h1>Catálogos del sistema</h1><p>Administra los valores que utiliza el registro y clasificación de eventos.</p></div></header>
      <div className="admin-catalog-layout">
        <section className="admin-catalog-list panel"><div className="admin-catalog-head"><label>Catálogo<select value={catalogKey} onChange={(e) => setCatalogKey(e.target.value as CatalogKey)}>{CATALOGS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label><button className="device-button secondary" onClick={() => void load()} disabled={loading}>Actualizar</button></div><p className="admin-catalog-hint">{catalog.hint}</p>
          {error ? <div className="admin-events-error">{error}</div> : null}
          <div className="admin-catalog-rows">{loading ? <p className="admin-events-empty">Cargando catálogo…</p> : null}{!loading && !items.length && !error ? <p className="admin-events-empty">Este catálogo no tiene registros todavía.</p> : null}{items.map((item) => <article key={String(item.id)} className={selected?.id === item.id ? 'selected' : ''}><button className="admin-catalog-row-main" onClick={() => selectItem(item)}><strong>{String(item.name ?? item.code ?? '(sin nombre)')}</strong><span>{String(item.code ?? '')}{item.isActive === false ? ' · Inactivo' : ''}</span></button><button className="admin-catalog-delete" title="Eliminar" onClick={() => void remove(item)}>Eliminar</button></article>)}</div>
        </section>
        <section className="admin-catalog-editor panel"><div className="admin-catalog-editor-head"><div><span className="eyebrow">{selected ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}</span><h2>{selected ? String(selected.name ?? selected.code ?? 'Registro') : `Crear · ${catalog.label}`}</h2></div>{selected ? <button className="device-button secondary" onClick={() => { setSelected(null); setForm(defaults(catalog)); }}>Nuevo</button> : null}</div>
          <form className="admin-catalog-form" onSubmit={(e) => void submit(e)}>{catalog.fields.filter((field) => Boolean(selected) || field.key !== 'isActive').map((field) => <label key={field.key}>{field.label}{field.type === 'boolean' ? <select value={form[field.key] ?? 'true'} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}><option value="true">Activo</option><option value="false">Inactivo</option></select> : field.type === 'json' ? <textarea rows={5} value={form[field.key] ?? '{}'} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} spellCheck={false} /> : field.type === 'pattern' ? <select required={field.required} value={form[field.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}><option value="">Selecciona un tipo</option>{['beep', 'continuous', 'intermittent', 'escalating'].map((value) => <option key={value}>{value}</option>)}</select> : ['category', 'severity', 'sound'].includes(field.type ?? '') ? <select required={field.required} value={form[field.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}><option value="">Selecciona {field.label.toLowerCase()}</option>{references[field.type as 'category' | 'severity' | 'sound'].map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name ?? item.code ?? item.id)} · {String(item.code ?? '')}</option>)}</select> : <input required={field.required} maxLength={field.maxLength} type={field.type === 'number' ? 'number' : 'text'} min={field.min} value={form[field.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} />}</label>)}
            <button className="device-button primary" disabled={saving || loading}>{saving ? 'Guardando…' : selected ? 'Guardar cambios' : 'Crear registro'}</button>
          </form>
        </section>
      </div>
    </section>
  );
}
