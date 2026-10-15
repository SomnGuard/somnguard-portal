import { LegalNote } from './LegalNote';

/**
 * Versión portal de docs/16-legal/politica-de-privacidad.md (somnguard-docs).
 * Si cambia el documento, actualizar esta página.
 */
export function PrivacyPage() {
  return (
    <article className="legal-page">
      <p className="legal-draft">Borrador — pendiente de revisión legal antes de su publicación definitiva. Elaborada conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Colombia).</p>
      <h1>Política de Privacidad y Tratamiento de Datos — SomnGuard</h1>
      <LegalNote />
      <h2>1. Responsable</h2>
      <p>Razón social, NIT y domicilio: por definir. Soporte operativo: soporte@somnguard.tech (por confirmar).</p>
      <h2>2. Datos que tratamos</h2>
      <p>Identificación y contacto (nombre, apellido, correo, teléfono); credenciales protegidas; dispositivo (serie, firmware, estado, IP reciente, vinculación y último contacto); eventos (tipo, severidad, fecha); evidencia multimedia en imagen; notificaciones y preferencias (canales, zona horaria, severidad mínima); datos técnicos de sesión y tokens push.</p>
      <h2>3. Finalidades</h2>
      <p>Solo para prestar el monitoreo, generar alertas, historial y evidencias, administrar sus dispositivos, gestionar su cuenta y soporte, garantizar la seguridad y cumplir la ley.</p>
      <h2>4. Quién puede ver sus datos</h2>
      <p><strong>Su evidencia solo es visible para su cuenta y los administradores</strong>, siempre con autenticación; nunca se expone públicamente. El acceso interno está limitado por roles.</p>
      <h2>5. Sus derechos</h2>
      <p>Conocer, actualizar, rectificar, suprimir y revocar la autorización (habeas data, Ley 1581 de 2012). Ejerza sus derechos en Mi cuenta y Seguridad del portal, o escriba al correo del responsable indicando nombre, correo registrado y solicitud concreta.</p>
      <h2>6. Supresión y retención</h2>
      <p>Al eliminar su cuenta se desactiva por 30 días y se revocan sus sesiones. Mientras su cuenta esté activa conservamos los datos necesarios para el servicio.</p>
      <h2>7. Seguridad</h2>
      <p>Medidas técnicas y administrativas razonables: tokens de corta vigencia, autorización por roles y controles de acceso a la evidencia. Ante un incidente que lo afecte, lo informaremos por sus canales registrados.</p>
      <h2>8. Almacenamiento local</h2>
      <p>El portal guarda su sesión en el almacenamiento de su navegador, además de tema e idioma. Sin rastreadores de terceros con fines publicitarios. La app puede registrar tokens push para enviarle alertas.</p>
      <h2>9. Cambios</h2>
      <p>Publicaremos las actualizaciones en el portal con su fecha de vigencia. Versión 1.0 — 2026-10-15 (borrador).</p>
    </article>
  );
}
