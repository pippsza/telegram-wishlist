import * as React from 'react';

// Ported from tg-claude-bot - MIUI/iOS-style liquid edge-swipe back gesture.
// Arms only when a touch starts within EDGE px of the left screen edge,
// follows the finger imperatively (no React state per move) so it stays smooth.

const EDGE = 100;
const THRESHOLD = 70;
const OFF_AXIS = 60;

const H = 190;
const W = 52;
const DEPTH_MIN = 14;
const DEPTH_MAX = 42;

function bumpPath(depth: number): string {
  return [
    'M0,0',
    `C0,${H * 0.22} ${depth},${H * 0.3} ${depth},${H * 0.5}`,
    `C${depth},${H * 0.7} 0,${H * 0.78} 0,${H}`,
    'Z',
  ].join(' ');
}

function hapticTap() {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
}

export function EdgeSwipeBack({ onBack, enabled }: { onBack: () => void; enabled: boolean }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const bumpRef = React.useRef<SVGPathElement>(null);
  const arrowRef = React.useRef<SVGGElement>(null);
  const onBackRef = React.useRef(onBack);
  onBackRef.current = onBack;

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const bump = bumpRef.current;
    const arrow = arrowRef.current;
    if (!enabled || !wrap || !bump || !arrow) return;

    let armed = false;
    let startX = 0;
    let startY = 0;
    let crossed = false;

    const hide = () => {
      wrap.style.transition = 'opacity .2s ease';
      wrap.style.opacity = '0';
      wrap.dataset.crossed = '0';
      bump.setAttribute('d', bumpPath(DEPTH_MIN));
      arrow.style.opacity = '0';
    };
    const draw = (dx: number, y: number) => {
      const prog = Math.max(0, Math.min(1, dx / THRESHOLD));
      const over = prog >= 1 ? Math.min(8, (dx - THRESHOLD) * 0.12) : 0;
      const depth = DEPTH_MIN + prog * (DEPTH_MAX - DEPTH_MIN) + over;
      wrap.style.transition = 'none';
      wrap.style.top = `${y}px`;
      wrap.style.opacity = String(Math.min(0.98, dx / 16));
      bump.setAttribute('d', bumpPath(depth));
      bump.style.fillOpacity = String(0.16 + prog * 0.34);
      arrow.setAttribute('transform', `translate(${depth * 0.46}, ${H / 2})`);
      arrow.style.opacity = String(Math.min(1, Math.max(0, (prog - 0.15) / 0.5)));
      wrap.dataset.crossed = prog >= 1 ? '1' : '0';
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      armed = !!t && t.clientX <= EDGE;
      crossed = false;
      if (t) {
        startX = t.clientX;
        startY = t.clientY;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!armed) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dy > OFF_AXIS && dx < THRESHOLD) {
        armed = false;
        hide();
        return;
      }
      if (dx <= 0) {
        hide();
        return;
      }
      draw(dx, t.clientY);
      const isCrossed = dx >= THRESHOLD;
      if (isCrossed && !crossed) {
        crossed = true;
        hapticTap();
      }
      if (!isCrossed) crossed = false;
    };
    const onEnd = (e: TouchEvent) => {
      const wasArmed = armed;
      armed = false;
      hide();
      if (!wasArmed) return;
      const t = e.changedTouches[0];
      const dx = t ? t.clientX - startX : 0;
      const dy = t ? Math.abs(t.clientY - startY) : 0;
      if (dx > THRESHOLD && dy < OFF_AXIS) onBackRef.current();
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      data-crossed="0"
      style={{ width: W, height: H, opacity: 0 }}
      className="pointer-events-none fixed left-0 top-1/2 z-[60] -translate-y-1/2
                 text-foreground/90 data-[crossed=1]:text-primary
                 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
        <path ref={bumpRef} d={bumpPath(DEPTH_MIN)} fill="currentColor" style={{ fillOpacity: 0.14 }} />
        <g ref={arrowRef} style={{ opacity: 0 }}>
          <polyline
            points="5,-7 -3,0 5,7"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}
