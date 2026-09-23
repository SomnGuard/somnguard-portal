import { useEffect, useRef } from 'react';

const CX = 50;
const CY = 50;
const ALTO = 24;
const RADIO = 12;
const LX = 16;
const LY = 4;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOutQuad(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function rand(a: number, b: number) { return Math.random() * (b - a) + a; }
function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

type LogoSet = { svg: SVGSVGElement; pupil: SVGCircleElement; pill: SVGRectElement; pillClip: SVGRectElement; mouth: SVGPathElement };

/**
 * Anima solo el logo del hero (el del header es estático).
 * Copia fiel del motor original pero sin sincronización header->hero.
 */
export function useSoloLogoAnimation(heroId = 'heroLogo') {
  const runningRef = useRef(true);

  useEffect(() => {
    runningRef.current = true;

    const getSet = (svg: SVGSVGElement): LogoSet | null => {
      let pupil: SVGCircleElement | null = null;
      let pill: SVGRectElement | null = null;
      let pillClip: SVGRectElement | null = null;
      let mouth: SVGPathElement | null = null;
      const allWithId = Array.from(svg.querySelectorAll('[id]')) as HTMLElement[];
      for (const el of allWithId) {
        const low = el.id.toLowerCase();
        if (low.endsWith('pupil')) pupil = el as unknown as SVGCircleElement;
        else if (low.endsWith('pillclip')) pillClip = el as unknown as SVGRectElement;
        else if (low.endsWith('pill')) pill = el as unknown as SVGRectElement;
        else if (low.endsWith('mouth')) mouth = el as unknown as SVGPathElement;
      }
      if (!pupil) pupil = svg.querySelector('circle') as SVGCircleElement | null;
      if (!pill) pill = svg.querySelector(':scope > rect') as SVGRectElement | null;
      if (!pillClip) pillClip = svg.querySelector('clipPath rect') as SVGRectElement | null;
      if (!mouth) {
        const paths = svg.querySelectorAll('path');
        mouth = (paths.length > 1 ? paths[1] : paths[0]) as SVGPathElement | null;
      }
      if (!pupil || !pill || !pillClip || !mouth) return null;
      return { svg, pupil, pill, pillClip, mouth };
    };

    const heroSvg = document.getElementById(heroId) as unknown as SVGSVGElement | null;
    if (!heroSvg) {
      const t = setTimeout(() => {
        const retry = document.getElementById(heroId) as unknown as SVGSVGElement | null;
        if (!retry) return;
        const set = getSet(retry);
        if (!set) return;
        startLoop(set);
      }, 80);
      return () => { clearTimeout(t); runningRef.current = false; };
    }

    const set = getSet(heroSvg);
    if (!set) return () => { runningRef.current = false; };
    let started = false;
    const startLoop = (logoSet: LogoSet) => {
      if (started) return;
      started = true;

      const animateValue = (cb: (v: number) => void, from: number, to: number, duration: number): Promise<void> => {
        const start = Date.now();
        return new Promise((resolve) => {
          const tick = () => {
            if (!runningRef.current) { resolve(); return; }
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeInOutQuad(progress);
            const value = lerp(from, to, eased);
            cb(value);
            if (progress < 1) requestAnimationFrame(tick);
            else resolve();
          };
          tick();
        });
      };

      const movePupil = async (tx: number, ty: number, duration: number) => {
        const startX = parseFloat(logoSet.pupil.getAttribute('cx') || String(CX));
        const startY = parseFloat(logoSet.pupil.getAttribute('cy') || String(CY));
        await Promise.all([
          animateValue((v) => logoSet.pupil.setAttribute('cx', String(v)), startX, tx, duration),
          animateValue((v) => logoSet.pupil.setAttribute('cy', String(v)), startY, ty, duration),
        ]);
      };
      const animatePill = async (newHeight: number, duration: number) => {
        const startHeight = parseFloat(logoSet.pill.getAttribute('height') || String(ALTO));
        const startY = parseFloat(logoSet.pill.getAttribute('y') || String(CY - ALTO / 2));
        const startRx = parseFloat(logoSet.pill.getAttribute('rx') || String(RADIO));
        const newY = CY - newHeight / 2;
        const newRx = Math.min(RADIO, newHeight / 2);
        await Promise.all([
          animateValue((v) => { logoSet.pill.setAttribute('height', String(v)); logoSet.pillClip.setAttribute('height', String(v)); }, startHeight, newHeight, duration),
          animateValue((v) => { logoSet.pill.setAttribute('y', String(v)); logoSet.pillClip.setAttribute('y', String(v)); }, startY, newY, duration),
          animateValue((v) => { logoSet.pill.setAttribute('rx', String(v)); logoSet.pill.setAttribute('ry', String(v)); logoSet.pillClip.setAttribute('rx', String(v)); logoSet.pillClip.setAttribute('ry', String(v)); }, startRx, newRx, duration),
        ]);
      };
      const animateMouth = async (targetCY: number, duration: number) => {
        const startCY = 78;
        await animateValue((v) => { const d = `M41 73 Q50 ${v} 59 73`; logoSet.mouth.setAttribute('d', d); }, startCY, targetCY, duration);
      };
      const randPos = () => ({ x: CX + rand(-LX, LX), y: CY + rand(-LY, LY) });
      const vigilar = async () => {
        animateMouth(78, 500);
        const n = Math.floor(rand(2, 5));
        for (let i = 0; i < n; i++) { if (!runningRef.current) return; const d = randPos(); await movePupil(d.x, d.y, rand(400, 800)); await sleep(rand(300, 900)); }
      };
      const parpadear = async () => { animateMouth(81, 200); await animatePill(3, 120); await sleep(80); await animatePill(ALTO, 160); };
      const sospechar = async () => {
        animateMouth(65, 300); await animatePill(10, 200); await sleep(100);
        const lx = Math.random() > 0.5 ? CX + 13 : CX - 13;
        await movePupil(lx, CY, rand(600, 1000)); await sleep(rand(400, 900));
        await movePupil(CX, CY, 400); await sleep(150); await Promise.all([animatePill(ALTO, 250), animateMouth(78, 350)]);
      };
      const alerta = async () => {
        animateMouth(86, 150); const n = Math.floor(rand(3, 6));
        for (let i = 0; i < n; i++) { if (!runningRef.current) return; const d = randPos(); await movePupil(d.x, d.y, rand(80, 200)); await sleep(rand(50, 150)); }
        await movePupil(CX, CY, 300); animateMouth(78, 400);
      };
      const centrar = async () => { animateMouth(73, 400); await movePupil(CX, CY, 400); await sleep(rand(200, 600)); animateMouth(78, 500); };
      const pickBehavior = (): (() => Promise<void>) => {
        const behaviors = [{ fn: vigilar, w: 40 }, { fn: parpadear, w: 25 }, { fn: sospechar, w: 20 }, { fn: alerta, w: 10 }, { fn: centrar, w: 5 }];
        const totalW = behaviors.reduce((s, b) => s + b.w, 0);
        let pt = rand(0, totalW);
        for (const b of behaviors) { pt -= b.w; if (pt <= 0) return b.fn; }
        return behaviors[0].fn;
      };
      (async () => { while (runningRef.current) { await pickBehavior()(); await sleep(rand(200, 800)); } })();
    };

    startLoop(set);

    return () => { runningRef.current = false; };
  }, [heroId]);
}
