import { useEffect, useRef } from 'react';

type LogoSet = {
  svg: SVGSVGElement;
  pupil: SVGCircleElement;
  pill: SVGRectElement;
  pillClip: SVGRectElement;
  mouth: SVGPathElement;
};

const CX = 50;
const CY = 50;
const ALTO = 24;
const RADIO = 12;
const LX = 16;
const LY = 4;

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}
function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function rand(a: number, b: number) {
  return Math.random() * (b - a) + a;
}
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

const IMITATION_DELAY_MS = 75;

/**
 * Motor sincronizado fiel al original (js/app.js).
 * - Usa mismos valores CX/CY/ALTO/RADIO/LX/LY, mismas curvas easeInOutQuad y mismos comportamientos ponderados.
 * - El header es líder y el hero lo imita con delay configurable (70-80ms se ve natural).
 * - Si el hero no está montado (dashboard), el header sigue animando solo y retoma sync cuando el hero vuelve.
 * - Query case-insensitive (i flag) para soportar ids `pupil`/`headerPupil` etc sin bug de mayúsculas.
 */
export function useSyncedLogoAnimation(headerId = 'headerLogo', heroId = 'heroLogo', opts?: { imitationDelayMs?: number }) {
  const delay = opts?.imitationDelayMs ?? IMITATION_DELAY_MS;
  const runningRef = useRef(true);

  useEffect(() => {
    runningRef.current = true;

    const getSet = (svg: SVGSVGElement): LogoSet | null => {
      // Búsqueda robusta case-insensitive (sin depender del flag CSS `i`) + fallback por estructura
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
      // Fallbacks estructurales si algún id no matchea (por si cambias ids en el futuro)
      if (!pupil) pupil = svg.querySelector('circle') as SVGCircleElement | null;
      if (!pill) pill = svg.querySelector(':scope > rect') as SVGRectElement | null;
      if (!pillClip) pillClip = svg.querySelector('clipPath rect') as SVGRectElement | null;
      if (!mouth) {
        const paths = svg.querySelectorAll('path');
        // mouth es el segundo path (el primero es el escudo)
        mouth = (paths.length > 1 ? paths[1] : paths[0]) as SVGPathElement | null;
      }
      if (!pupil || !pill || !pillClip || !mouth) return null;
      return { svg, pupil, pill, pillClip, mouth };
    };

    const getCurrentSets = (): { headerSet: LogoSet | null; heroSet: LogoSet | null } => {
      const headerSvg = document.getElementById(headerId) as SVGSVGElement | null;
      const heroSvg = document.getElementById(heroId) as SVGSVGElement | null;
      const headerSet = headerSvg ? getSet(headerSvg) : null;
      const heroSet = heroSvg ? getSet(heroSvg) : null;
      return { headerSet, heroSet };
    };

    // si no hay header, no hay nada que animar
    const initial = getCurrentSets();
    if (!initial.headerSet) {
      // header puede tardar un tick en montar (React), reintenta una vez
      const t = setTimeout(() => {
        const retry = getCurrentSets();
        if (!retry.headerSet) return;
        startLoop();
      }, 80);
      return () => { clearTimeout(t); runningRef.current = false; };
    }

    let loopStarted = false;
    const startLoop = () => {
      if (loopStarted) return;
      loopStarted = true;

      const animateValue = (callback: (v: number) => void, from: number, to: number, duration: number): Promise<void> => {
        const start = Date.now();
        return new Promise((resolve) => {
          const tick = () => {
            if (!runningRef.current) { resolve(); return; }
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeInOutQuad(progress);
            const value = lerp(from, to, eased);
            callback(value);
            if (progress < 1) requestAnimationFrame(tick);
            else resolve();
          };
          tick();
        });
      };

      const movePupil = async (tx: number, ty: number, duration: number) => {
        const { headerSet, heroSet } = getCurrentSets();
        if (!headerSet) return;
        const startX = parseFloat(headerSet.pupil.getAttribute('cx') || String(CX));
        const startY = parseFloat(headerSet.pupil.getAttribute('cy') || String(CY));
        const headerX = animateValue((v) => headerSet.pupil.setAttribute('cx', String(v)), startX, tx, duration);
        const headerY = animateValue((v) => headerSet.pupil.setAttribute('cy', String(v)), startY, ty, duration);

        if (!heroSet) {
          await Promise.all([headerX, headerY]);
          return;
        }

        const heroStartX = parseFloat(heroSet.pupil.getAttribute('cx') || String(CX));
        const heroStartY = parseFloat(heroSet.pupil.getAttribute('cy') || String(CY));
        const heroAnimate = async () => {
          if (delay > 0) await sleep(delay);
          if (!runningRef.current) return;
          // re-query hero en caso de remount durante el delay
          const cur = getCurrentSets().heroSet;
          if (!cur) return;
          const curStartX = parseFloat(cur.pupil.getAttribute('cx') || String(heroStartX));
          const curStartY = parseFloat(cur.pupil.getAttribute('cy') || String(heroStartY));
          await Promise.all([
            animateValue((v) => cur.pupil.setAttribute('cx', String(v)), curStartX, tx, duration),
            animateValue((v) => cur.pupil.setAttribute('cy', String(v)), curStartY, ty, duration),
          ]);
        };

        if (delay <= 0) {
          const heroX = animateValue((v) => heroSet.pupil.setAttribute('cx', String(v)), heroStartX, tx, duration);
          const heroY = animateValue((v) => heroSet.pupil.setAttribute('cy', String(v)), heroStartY, ty, duration);
          await Promise.all([headerX, headerY, heroX, heroY]);
        } else {
          await Promise.all([Promise.all([headerX, headerY]), heroAnimate()]);
        }
      };

      const animatePill = async (newHeight: number, duration: number) => {
        const { headerSet, heroSet } = getCurrentSets();
        if (!headerSet) return;
        const startHeight = parseFloat(headerSet.pill.getAttribute('height') || String(ALTO));
        const startY = parseFloat(headerSet.pill.getAttribute('y') || String(CY - ALTO / 2));
        const startRx = parseFloat(headerSet.pill.getAttribute('rx') || String(RADIO));
        const newY = CY - newHeight / 2;
        const newRx = Math.min(RADIO, newHeight / 2);

        const headerP = Promise.all([
          animateValue((v) => { headerSet.pill.setAttribute('height', String(v)); headerSet.pillClip.setAttribute('height', String(v)); }, startHeight, newHeight, duration),
          animateValue((v) => { headerSet.pill.setAttribute('y', String(v)); headerSet.pillClip.setAttribute('y', String(v)); }, startY, newY, duration),
          animateValue((v) => { headerSet.pill.setAttribute('rx', String(v)); headerSet.pill.setAttribute('ry', String(v)); headerSet.pillClip.setAttribute('rx', String(v)); headerSet.pillClip.setAttribute('ry', String(v)); }, startRx, newRx, duration),
        ]);

        if (!heroSet) {
          await headerP;
          return;
        }

        const heroStartHeight = parseFloat(heroSet.pill.getAttribute('height') || String(ALTO));
        const heroStartY = parseFloat(heroSet.pill.getAttribute('y') || String(CY - ALTO / 2));
        const heroStartRx = parseFloat(heroSet.pill.getAttribute('rx') || String(RADIO));
        const heroP = (async () => {
          if (delay > 0) await sleep(delay);
          if (!runningRef.current) return;
          const cur = getCurrentSets().heroSet;
          if (!cur) return;
          const cH = parseFloat(cur.pill.getAttribute('height') || String(heroStartHeight));
          const cY = parseFloat(cur.pill.getAttribute('y') || String(heroStartY));
          const cR = parseFloat(cur.pill.getAttribute('rx') || String(heroStartRx));
          await Promise.all([
            animateValue((v) => { cur.pill.setAttribute('height', String(v)); cur.pillClip.setAttribute('height', String(v)); }, cH, newHeight, duration),
            animateValue((v) => { cur.pill.setAttribute('y', String(v)); cur.pillClip.setAttribute('y', String(v)); }, cY, newY, duration),
            animateValue((v) => { cur.pill.setAttribute('rx', String(v)); cur.pill.setAttribute('ry', String(v)); cur.pillClip.setAttribute('rx', String(v)); cur.pillClip.setAttribute('ry', String(v)); }, cR, newRx, duration),
          ]);
        })();

        await Promise.all([headerP, heroP]);
      };

      const animateMouth = async (targetCY: number, duration: number) => {
        const { headerSet, heroSet } = getCurrentSets();
        if (!headerSet) return;
        const startCY = 78;
        const headerAnim = animateValue((v) => {
          const d = `M41 73 Q50 ${v} 59 73`;
          headerSet.mouth.setAttribute('d', d);
        }, startCY, targetCY, duration);

        if (!heroSet) {
          await headerAnim;
          return;
        }

        const heroAnim = (async () => {
          if (delay > 0) await sleep(delay);
          if (!runningRef.current) return;
          const cur = getCurrentSets().heroSet;
          if (!cur) return;
          await animateValue((v) => {
            const d = `M41 73 Q50 ${v} 59 73`;
            cur.mouth.setAttribute('d', d);
          }, startCY, targetCY, duration);
        })();

        await Promise.all([headerAnim, heroAnim]);
      };

      const randPos = () => ({
        x: CX + rand(-LX, LX),
        y: CY + rand(-LY, LY),
      });

      const vigilar = async () => {
        animateMouth(78, 500);
        const n = Math.floor(rand(2, 5));
        for (let i = 0; i < n; i++) {
          if (!runningRef.current) return;
          const d = randPos();
          await movePupil(d.x, d.y, rand(400, 800));
          await sleep(rand(300, 900));
        }
      };

      const parpadear = async () => {
        animateMouth(81, 200);
        await animatePill(3, 120);
        await sleep(80);
        await animatePill(ALTO, 160);
      };

      const sospechar = async () => {
        animateMouth(65, 300);
        await animatePill(10, 200);
        await sleep(100);
        const lx = Math.random() > 0.5 ? CX + 13 : CX - 13;
        await movePupil(lx, CY, rand(600, 1000));
        await sleep(rand(400, 900));
        await movePupil(CX, CY, 400);
        await sleep(150);
        await Promise.all([animatePill(ALTO, 250), animateMouth(78, 350)]);
      };

      const alerta = async () => {
        animateMouth(86, 150);
        const n = Math.floor(rand(3, 6));
        for (let i = 0; i < n; i++) {
          if (!runningRef.current) return;
          const d = randPos();
          await movePupil(d.x, d.y, rand(80, 200));
          await sleep(rand(50, 150));
        }
        await movePupil(CX, CY, 300);
        animateMouth(78, 400);
      };

      const centrar = async () => {
        animateMouth(73, 400);
        await movePupil(CX, CY, 400);
        await sleep(rand(200, 600));
        animateMouth(78, 500);
      };

      const pickBehavior = (): (() => Promise<void>) => {
        const behaviors = [
          { fn: vigilar, w: 40 },
          { fn: parpadear, w: 25 },
          { fn: sospechar, w: 20 },
          { fn: alerta, w: 10 },
          { fn: centrar, w: 5 },
        ];
        const totalW = behaviors.reduce((s, b) => s + b.w, 0);
        let pt = rand(0, totalW);
        for (const b of behaviors) {
          pt -= b.w;
          if (pt <= 0) return b.fn;
        }
        return behaviors[0].fn;
      };

      (async () => {
        while (runningRef.current) {
          await pickBehavior()();
          await sleep(rand(200, 800));
        }
      })();
    };

    startLoop();

    return () => {
      runningRef.current = false;
    };
  }, [headerId, heroId, delay]);
}
