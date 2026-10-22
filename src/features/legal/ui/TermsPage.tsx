import { LegalNote } from './LegalNote';

/**
 * Versión portal de docs/16-legal/terminos-y-condiciones.md (somnguard-docs).
 * Si cambia el documento, actualizar esta página.
 */
export function TermsPage() {
  return (
    <article className="legal-page">
      <p className="legal-draft">Borrador — pendiente de revisión legal antes de su publicación definitiva.</p>
      <h1>Términos y Condiciones de uso — SomnGuard</h1>
      <LegalNote />
      <h2>1. Objeto</h2>
      <p>SomnGuard es una plataforma de apoyo a la conducción segura (dispositivo de monitoreo, aplicación móvil y portal web). Monitorea signos de somnolencia y distracción y genera alertas, historial de eventos y evidencia multimedia.</p>
      <p><strong>SomnGuard es una herramienta de apoyo: no sustituye la atención del conductor ni garantiza evitar accidentes.</strong> El conductor mantiene en todo momento la responsabilidad de conducir de forma segura.</p>
      <h2>2. Cuenta de usuario</h2>
      <p>Debe registrarse con nombre, apellido, correo, teléfono y contraseña. El correo se verifica con un código de 6 dígitos vigente por 15 minutos. Sus credenciales son personales e intransferibles. Puede actualizar sus datos en Mi cuenta y cambiar su correo con verificación de su contraseña actual en Seguridad.</p>
      <h2>3. Dispositivo</h2>
      <p>El dispositivo se vincula con el código entregado por el administrador. Mientras tenga un dispositivo vinculado, el formulario de vinculación no se muestra; para vincular otro equipo primero debe desvincular el actual. No manipule el equipo y manténgalo energizado y conectado.</p>
      <h2>4. Monitoreo, video y detección</h2>
      <p>El portal y la app ofrecen vista en vivo y controles para encender/apagar la cámara y pausar/reanudar la detección. <strong>La detección pausada no se reanuda sola.</strong> Los eventos se clasifican por severidad (Informativa, Advertencia, Alta y Crítica).</p>
      <h2>5. Evidencia multimedia</h2>
      <p>Algunos eventos incluyen imagen, visible únicamente para el titular de la cuenta y los administradores, siempre con autenticación; no se expone públicamente.</p>
      <h2>6. Uso aceptable</h2>
      <p>Se prohíbe compartir credenciales o códigos con terceros no autorizados, interferir con el servicio o dispositivos ajenos, usarlo con fines ilícitos o intentar vulnerar su seguridad.</p>
      <h2>7. Disponibilidad</h2>
      <p>Servicio bajo mejor esfuerzo: depende de que el dispositivo esté encendido, conectado y reportando. Cortes de energía, conectividad o mantenimientos pueden interrumpirlo.</p>
      <h2>8. Limitación de responsabilidad</h2>
      <p>En la máxima medida permitida por la ley, SomnGuard no responde por accidentes o daños derivados de la conducción, incluso si el sistema no detectó un evento o no emitió una alerta.</p>
      <h2>9. Terminación y eliminación</h2>
      <p>Puede desvincular su dispositivo en Mi cuenta y eliminar su cuenta en Seguridad: se desactiva por 30 días y se revocan sus sesiones.</p>
      <h2>10. Modificaciones y ley aplicable</h2>
      <p>Podremos actualizar estos términos e informaremos los cambios relevantes en el portal. Se rigen por las leyes de la República de Colombia. Contacto y datos del responsable: ver la Política de Privacidad.</p>
    </article>
  );
}
