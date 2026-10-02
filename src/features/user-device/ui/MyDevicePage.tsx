import { DeviceLivePanel } from '../../streaming/ui/DeviceLivePanel';

export function MyDevicePage() {
  return (
    <section className="module-page">
      <div className="page-heading compact"><span className="eyebrow">USER / MY DEVICE</span><h1>Mi dispositivo</h1><p>Vista específica del usuario final.</p></div>
      <DeviceLivePanel title="SomnGuard Device en vivo" />
    </section>
  );
}
