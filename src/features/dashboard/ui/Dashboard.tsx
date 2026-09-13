import { useEffect, useRef } from 'react';

const SOMNOLENCE_WEEK = [32, 38, 29, 45, 41, 36, 34];
const ALERTS_MONTH = [4, 7, 3, 5];
const HISTORY = [
  { text: 'Nivel de somnolencia moderado', date: 'Hoy, 10:30', level: 'Medio' },
  { text: 'Monitoreo iniciado correctamente', date: 'Ayer, 08:15', level: 'Info' },
  { text: 'Nivel de somnolencia bajo', date: 'Lun, 16:45', level: 'Bajo' },
];

function getVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, margin: number) {
  ctx.strokeStyle = getVar('--border');
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;
  const rows = 4;
  for (let i = 0; i <= rows; i++) {
    const y = margin + ((height - margin * 2) / rows) * i;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawLineChart(canvas: HTMLCanvasElement | null, labels: string[], values: number[]) {
  if (!canvas) return;
  const resized = resizeCanvas(canvas);
  if (!resized) return;
  const { ctx, width, height } = resized;
  const margin = 34;
  const accent = getVar('--accent');
  const accentLight = getVar('--accent-light');
  const textMuted = getVar('--text-muted');
  const bg = getVar('--bg-surface');

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, width, height, margin);

  const max = Math.max(...values, 1);
  const stepX = (width - margin * 2) / (values.length - 1);
  const points = values.map((value, index) => ({
    x: margin + stepX * index,
    y: height - margin - ((height - margin * 2) * value) / max,
    value,
  }));

  ctx.beginPath();
  ctx.moveTo(points[0].x, height - margin);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, height - margin);
  ctx.closePath();
  ctx.fillStyle = accentLight;
  ctx.fill();

  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();

  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${p.value}%`, p.x, p.y - 10);
  });

  ctx.fillStyle = textMuted;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((label, index) => {
    const x = margin + stepX * index;
    ctx.fillText(label, x, height - 10);
  });
}

function drawBarChart(canvas: HTMLCanvasElement | null, labels: string[], values: number[]) {
  if (!canvas) return;
  const resized = resizeCanvas(canvas);
  if (!resized) return;
  const { ctx, width, height } = resized;
  const margin = 34;
  const accent = getVar('--accent');
  const accentLight = getVar('--accent-light');
  const textMuted = getVar('--text-muted');
  const bg = getVar('--bg-surface');

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, width, height, margin);

  const max = Math.max(...values, 1);
  const innerW = width - margin * 2;
  const innerH = height - margin * 2;
  const gap = 14;
  const barWidth = (innerW - gap * (values.length - 1)) / values.length;

  values.forEach((value, index) => {
    const barH = (innerH * value) / max;
    const x = margin + index * (barWidth + gap);
    const y = height - margin - barH;
    ctx.fillStyle = accentLight;
    ctx.fillRect(x, y, barWidth, barH);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barH);
    ctx.fillStyle = accent;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${value}`, x + barWidth / 2, y - 8);
    ctx.fillStyle = textMuted;
    ctx.fillText(labels[index], x + barWidth / 2, height - 10);
  });
}

export function Dashboard({ user }: { user: { name: string; email: string } }) {
  const sleepRef = useRef<HTMLCanvasElement>(null);
  const alertsRef = useRef<HTMLCanvasElement>(null);

  const avg = Math.round(SOMNOLENCE_WEEK.reduce((a, b) => a + b, 0) / SOMNOLENCE_WEEK.length);
  const totalAlerts = ALERTS_MONTH.reduce((a, b) => a + b, 0);

  useEffect(() => {
    const render = () => {
      drawLineChart(sleepRef.current, ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], SOMNOLENCE_WEEK);
      drawBarChart(alertsRef.current, ['S1', 'S2', 'S3', 'S4'], ALERTS_MONTH);
    };
    render();
    const onResize = () => render();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <section id="dashboardSection" className="dashboard">
      <div className="dashboard-container">
        <aside className="dashboard-sidebar">
          <div className="dashboard-user">
            <h2 id="dashboardUserName">Bienvenido, {user.name}</h2>
            <p id="dashboardUserEmail">{user.email}</p>
          </div>
        </aside>

        <div className="dashboard-panel">
          <h2 style={{ color: 'var(--text)', fontSize: 28 }}>Panel principal</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Aquí va tu contenido principal después de iniciar sesión.</p>

          <div className="dashboard-cards">
            <div className="dashboard-card">
              <h3>Estado del sistema</h3>
              <p>Conectado y listo para monitorear la somnolencia.</p>
            </div>
            <div className="dashboard-card">
              <h3>Alertas activas</h3>
              <p>Sin alertas pendientes por ahora.</p>
            </div>
            <div className="dashboard-card">
              <h3>Sesión</h3>
              <p>Acceso autorizado correctamente.</p>
            </div>
          </div>

          <div className="dashboard-stats" id="dashboardStatsSection">
            <div className="summary-row">
              <div className="summary-item">
                <span>Somnolencia promedio</span>
                <strong id="avgSleep">{avg}%</strong>
              </div>
              <div className="summary-item">
                <span>Alertas del mes</span>
                <strong id="monthAlerts">{totalAlerts}</strong>
              </div>
              <div className="summary-item">
                <span>Eventos registrados</span>
                <strong id="sessionCount">12</strong>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stats-card">
                <h3>Somnolencia semanal</h3>
                <p>Promedio diario de somnolencia detectada durante los últimos 7 días.</p>
                <div className="chart-wrap">
                  <canvas ref={sleepRef} id="somnolenceChart" className="chart-canvas"></canvas>
                </div>
              </div>

              <div className="stats-card">
                <h3>Alertas del mes</h3>
                <p>Resumen de alertas acumuladas en las últimas semanas.</p>
                <div className="chart-wrap">
                  <canvas ref={alertsRef} id="alertsChart" className="chart-canvas"></canvas>
                </div>
              </div>
            </div>

            <div className="history-card">
              <h3>Historial reciente</h3>
              <p>Últimos eventos generados por el monitoreo web.</p>
              <div className="history-list" id="historyList">
                {HISTORY.map((item, i) => (
                  <div key={i} className="history-item">
                    <div className="history-meta">
                      <strong>{item.text}</strong>
                      <span>{item.date}</span>
                    </div>
                    <div className="badge">{item.level}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
