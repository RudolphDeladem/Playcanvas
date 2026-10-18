// Menus with a controller: the D-pad (or a flick of the left stick) moves the focus between the buttons, links and
// fields of whatever menu is open, the bottom face button presses the focused one (or the menu's main button when
// nothing is focused yet), the right face button steps back as the phone's back button does; on a focused slider,
// left and right change its value. While the rider is riding with no menu open it stays out of the way, so the
// D-pad never steers, teleports or changes destinations.
import { pad, type PadControl } from './gamepad';

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const visible = (el: HTMLElement) => {
  if ((el as HTMLButtonElement).disabled || el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden';
};

/**
 * Starts menu navigation. `container` names the menu the controller works in right now (null: none, the ride has
 * the controller); `back` steps back.
 */
export function padMenus(container: () => HTMLElement | null, back: () => void) {
  let repeatDir: PadControl | null = null, repeatT = 0;
  const move = (root: HTMLElement, dir: 'up' | 'down' | 'left' | 'right') => {
    const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
    if (!items.length) return;
    const cur = document.activeElement instanceof HTMLElement && items.includes(document.activeElement) ? document.activeElement : null;
    // a focused slider: left and right change it
    if (cur instanceof HTMLInputElement && cur.type === 'range' && (dir === 'left' || dir === 'right')) {
      const step = Number(cur.step) || (Number(cur.max) - Number(cur.min)) / 20 || 1;
      cur.value = String(Math.min(Number(cur.max), Math.max(Number(cur.min), Number(cur.value) + (dir === 'right' ? step : -step))));
      cur.dispatchEvent(new Event('input', { bubbles: true }));
      cur.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (!cur) return focus(items.find((e) => e.classList.contains('btn-primary')) ?? items[0]);
    const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const [dx, dy] = dir === 'up' ? [0, -1] : dir === 'down' ? [0, 1] : dir === 'left' ? [-1, 0] : [1, 0];
    let best: HTMLElement | null = null, bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect(), bx = b.left + b.width / 2 - ax, by = b.top + b.height / 2 - ay;
      const along = bx * dx + by * dy, across = Math.abs(bx * dy - by * dx);
      if (along <= 2) continue;
      const score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) focus(best);
  };
  const focus = (el: HTMLElement) => {
    document.querySelectorAll('.pad-focus').forEach((e) => e.classList.remove('pad-focus'));
    el.classList.add('pad-focus');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  pad.onFrame((f, dt) => {
    if (!f || pad.capturing) return;
    const root = container();
    if (!root) { repeatDir = null; return; }
    // the d-pad, or the left stick pushed most of the way: one step, then repeating while held
    const stick: PadControl | null = f.lx < -0.7 ? 'left' : f.lx > 0.7 ? 'right' : f.ly < -0.7 ? 'up' : f.ly > 0.7 ? 'down' : null;
    const dpad = (['up', 'down', 'left', 'right'] as const).find((d) => f.held(d)) ?? null;
    const dir = dpad ?? stick;
    if (dir !== repeatDir) { repeatDir = dir; repeatT = 0.4; if (dir) move(root, dir as 'up'); }
    else if (dir) { repeatT -= dt; if (repeatT <= 0) { repeatT = 0.14; move(root, dir as 'up'); } }
    if (f.actPressed('confirm')) {
      const cur = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) && visible(document.activeElement) ? document.activeElement : null;
      const target = cur ?? [...root.querySelectorAll<HTMLElement>('.btn-primary')].find(visible) ?? null;
      if (target && !(target instanceof HTMLInputElement && target.type === 'range')) {
        target.click();
        // a menu that redraws itself (the arrival card's Drone view, Learn more): the highlight stays on the same button
        if (!target.isConnected && target.id) { const again = root.querySelector<HTMLElement>('#' + CSS.escape(target.id)); if (again && visible(again)) focus(again); }
      }
    }
    if (f.pressed('east')) back();
  });
}
