import { AutoLiveBox } from '../../streaming/ui/AutoLiveBox';

export function MyDevicePage() {
  return (
    <section className="module-page user-page">
      <header className="page-header user-page-header">
        <div>
          <h1>Monitoreo</h1>
          <p>Estado del sistema y vista en vivo de tu dispositivo.</p>
        </div>
      </header>
      <AutoLiveBox />
    </section>
  );
}
