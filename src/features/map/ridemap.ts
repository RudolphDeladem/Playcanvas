// The campus map full screen during a ride (the pause menu's "View map"): the same map as the Map tab, with where the
// rider is and which way they face, the ride's route and its destination. Dragging, pinching, the wheel and the zoom
// buttons look around; closing it goes back to the paused ride exactly where it was (the ride itself never stops or
// restarts). Nothing on it starts another ride.
import { icons } from '../../ui/icons';
import { H, esc } from '../host';
import { MapView } from './canvas';
import { campusMap } from './campus';
import './map.css';

export interface RideMapOpts {
  /** where the rider is now and the heading (radians; 0 faces -z, as Game.yaw) */
  you: { x: number; z: number; yaw: number };
  /** the ride's route line, if it has one */
  route?: [number, number][];
  /** where the ride goes */
  dest?: { x: number; z: number; name: string };
  /** called once the map is closed */
  onClose: () => void;
}
export interface RideMap { close: () => void; zoom: (f: number) => void; pan: (dx: number, dy: number) => void; recenter: () => void }

/** Opens the full-screen map over the paused ride. */
export function openRideMap(host: HTMLElement, o: RideMapOpts): RideMap {
  const map = campusMap(H().settings.campus);
  const el = document.createElement('div');
  el.className = 'ride-map mp fade-in';
  el.id = 'rideMap';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Campus map');
  el.innerHTML = `
    <canvas class="mp-canvas" id="rmCanvas" tabindex="0" aria-label="Map of ${esc(map.title)}. Drag to move, pinch or scroll to zoom."></canvas>
    <div class="rm-top">
      <b>${o.dest ? `To ${esc(o.dest.name)}` : 'Map'}</b>
      <button class="btn btn-primary btn-sm" id="rmClose">${icons.close} <span>Back to ride</span></button>
    </div>
    <div class="mp-ctrls rm-ctrls">
      <div class="mp-zoom"><button class="mp-btn" id="rmIn" aria-label="Zoom in">${icons.plus}</button><button class="mp-btn" id="rmOut" aria-label="Zoom out">${icons.minus}</button></div>
      <button class="mp-btn mp-locate on" id="rmMe" aria-label="Back to where you are">${icons.locate}</button>
    </div>
    <p class="mp-attrib">${esc(map.attribution)}</p>`;
  host.appendChild(el);
  const canvas = el.querySelector<HTMLCanvasElement>('#rmCanvas')!;
  const view = new MapView(canvas, map, ['The Balme Library', 'Great Hall', 'Legon Main Entrance', 'Night Market', ...map.halls.map((h) => h.place.name)]);
  view.labels = true;
  view.onDraw = (ctx) => {
    // the route: a white casing under the blue line
    if (o.route && o.route.length > 1) {
      ctx.save();
      ctx.lineCap = ctx.lineJoin = 'round';
      for (const [w, col] of [[9, '#ffffff'], [5, '#1a73e8']] as [number, string][]) {
        ctx.beginPath();
        o.route.forEach(([x, z], i) => { const [sx, sy] = view.toScreen(x, z); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
        ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
      }
      ctx.restore();
    }
    // the destination: a red pin
    if (o.dest) {
      const [sx, sy] = view.toScreen(o.dest.x, o.dest.z);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy - 18, 10, Math.PI * 0.75, Math.PI * 2.25); ctx.closePath();
      ctx.fillStyle = '#ea4335'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy - 18, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.restore();
    }
    // the rider: a yellow arrow along the heading, in a soft halo
    const [sx, sy] = view.toScreen(o.you.x, o.you.z);
    // (the heading as the mini map reads it: forward is (-sin yaw, -cos yaw), the arrow drawn pointing up)
    const a = -o.you.yaw + view.rot;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(26,115,232,0.18)'; ctx.fill();
    ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10, 11); ctx.lineTo(0, 5); ctx.lineTo(-10, 11); ctx.closePath();
    ctx.fillStyle = '#ffd21f'; ctx.lineWidth = 3; ctx.strokeStyle = '#0b1530'; ctx.stroke(); ctx.fill();
    ctx.restore();
  };
  const desk = () => el.clientWidth >= 900;
  const recenter = () => view.focus(o.you.x, o.you.z, desk() ? 1.1 : 0.85);
  view.set({ cx: o.you.x, cz: o.you.z, scale: desk() ? 1.1 : 0.85 });
  canvas.focus();
  let closed = false;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === '+' || e.key === '=') view.zoomAt(1.3);
    else if (e.key === '-' || e.key === '_') view.zoomAt(1 / 1.3);
  };
  // (capturing, ahead of the ride's own keys: Escape here closes the map, not the pause menu)
  addEventListener('keydown', onKey, true);
  const close = () => {
    if (closed) return;
    closed = true;
    removeEventListener('keydown', onKey, true);
    view.destroy();
    el.remove();
    o.onClose();
  };
  el.querySelector('#rmClose')!.addEventListener('click', close);
  el.querySelector('#rmIn')!.addEventListener('click', () => view.zoomAt(1.4));
  el.querySelector('#rmOut')!.addEventListener('click', () => view.zoomAt(1 / 1.4));
  el.querySelector('#rmMe')!.addEventListener('click', recenter);
  return {
    close,
    zoom: (f) => view.zoomAt(f),
    pan: (dx, dy) => { const [x, z] = view.toWorld(view.w / 2 + dx, view.h / 2 + dy); view.set({ cx: x, cz: z }); },
    recenter,
  };
}
