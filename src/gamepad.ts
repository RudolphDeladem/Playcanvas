// Gamepad support: one place that reads every connected controller through the browser's Gamepad API and turns it
// into named inputs (sticks, triggers, face buttons by position) for the rest of the game. The ride code asks for
// actions (steer, pedal, brake, look, ...) through PAD_ACTIONS and never sees raw button indices, so a remap or a new
// layout changes only this file.
//
// Layout: the PS5 DualSense's arrangement is the reference for which control does what; the labels shown to the
// player follow the controller in use (PlayStation symbols, Xbox letters, or plain position names when the model is
// unknown). Controllers that report the W3C "standard" mapping use it directly; others fall back to the same indices
// (most generic pads follow them) and can be remapped in the pause menu's Controller panel.

/** a control by its position on a standard layout */
export type PadControl =
  | 'south' | 'east' | 'west' | 'north'
  | 'l1' | 'r1' | 'l2' | 'r2'
  | 'select' | 'start' | 'l3' | 'r3'
  | 'up' | 'down' | 'left' | 'right' | 'home';

/** the standard mapping's button index for each control */
const STANDARD: Record<PadControl, number> = {
  south: 0, east: 1, west: 2, north: 3, l1: 4, r1: 5, l2: 6, r2: 7,
  select: 8, start: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15, home: 16,
};

/** the game's actions and the control each one sits on (the PS5-inspired default; one table to change) */
export const PAD_ACTIONS = {
  pedal: 'r2',
  brake: 'l2',
  camera: 'north',
  recover: 'east',
  bell: 'west',
  confirm: 'south',
  lookBack: 'l1',
  boost: 'r1',
  recenter: 'r3',
  map: 'select',
  pause: 'start',
} as const satisfies Record<string, PadControl>;
export type PadAction = keyof typeof PAD_ACTIONS;

export type PadFamily = 'playstation' | 'xbox' | 'generic';

/** what each control is called on each family of controller */
const LABELS: Record<PadFamily, Record<PadControl, string>> = {
  playstation: { south: 'Cross', east: 'Circle', west: 'Square', north: 'Triangle', l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', select: 'Create', start: 'Options', l3: 'L3', r3: 'R3', up: 'D-pad up', down: 'D-pad down', left: 'D-pad left', right: 'D-pad right', home: 'PS' },
  xbox: { south: 'A', east: 'B', west: 'X', north: 'Y', l1: 'LB', r1: 'RB', l2: 'LT', r2: 'RT', select: 'View', start: 'Menu', l3: 'LS', r3: 'RS', up: 'D-pad up', down: 'D-pad down', left: 'D-pad left', right: 'D-pad right', home: 'Xbox' },
  generic: { south: 'Bottom button', east: 'Right button', west: 'Left button', north: 'Top button', l1: 'Left shoulder', r1: 'Right shoulder', l2: 'Left trigger', r2: 'Right trigger', select: 'Select / Back', start: 'Start / Menu', l3: 'Left stick press', r3: 'Right stick press', up: 'D-pad up', down: 'D-pad down', left: 'D-pad left', right: 'D-pad right', home: 'Home' },
};
export const padLabel = (family: PadFamily, c: PadControl) => LABELS[family][c];
/** the name of a button index (by its place on the standard layout) */
const indexLabel = (family: PadFamily, i: number) => {
  const c = (Object.keys(STANDARD) as PadControl[]).find((k) => STANDARD[k] === i);
  return c ? LABELS[family][c] : `Button ${i}`;
};
/** what the player presses for an action on the controller in use (after any remap) */
export const padActionLabel = (family: PadFamily, a: PadAction) => {
  const id = pad.activeId;
  return id ? indexLabel(family, indexFor(id, controlFor(a))) : padLabel(family, controlFor(a));
};

/** the family from the id the browser reports (vendor 054c is Sony, 045e Microsoft); unknown stays generic */
export function padFamily(id: string): PadFamily {
  const s = id.toLowerCase();
  // Xbox first: Chrome names it "Xbox Wireless Controller", and Sony's pads report a bare "Wireless Controller"
  if (/045e|xbox|xinput|x-box/.test(s)) return 'xbox';
  if (/054c|dualsense|dualshock|playstation|ps[345]\b|wireless controller/.test(s)) return 'playstation';
  return 'generic';
}

// ---------- settings ----------
export interface PadSettings {
  /** left stick dead zone (0..0.5) */
  deadLeft: number;
  /** right stick dead zone */
  deadRight: number;
  /** steering sensitivity (0.5..1.5): how far a part-tilt turns */
  steer: number;
  /** camera look sensitivity */
  look: number;
  /** invert the right stick's vertical look */
  invertY: boolean;
  /** invert the right stick's horizontal look */
  invertX: boolean;
  /** seconds the brake must be held at a standstill before the bike rolls backwards */
  reverseDelay: number;
  /** trigger travel ignored as noise */
  triggerDead: number;
  /** steering smoothing (0: none .. 0.9: heavy): how gently the bars follow the stick */
  smooth: number;
}
const SETTINGS_KEY = 'legonrush.pad';
export const PAD_DEFAULTS: PadSettings = { deadLeft: 0.15, deadRight: 0.15, steer: 1, look: 1, invertY: false, invertX: false, reverseDelay: 0.45, triggerDead: 0.06, smooth: 0.35 };
function loadSettings(): PadSettings {
  try { return { ...PAD_DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }; } catch { return { ...PAD_DEFAULTS }; }
}
export const padSettings: PadSettings = loadSettings();
export function savePadSettings(p: Partial<PadSettings>) {
  Object.assign(padSettings, p);
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(padSettings)); } catch { /* private mode */ }
}

// ---------- remapping (per controller id; the standard mapping otherwise) ----------
const REMAP_KEY = 'legonrush.padmap';
type Remap = Record<string, Partial<Record<PadControl, number>>>;
let remaps: Remap = (() => { try { return JSON.parse(localStorage.getItem(REMAP_KEY) ?? '{}'); } catch { return {}; } })();
/** the action's control (actions never change control; a remap changes which button index the control is) */
function controlFor(a: PadAction): PadControl { return PAD_ACTIONS[a]; }
const indexFor = (id: string, c: PadControl) => remaps[id]?.[c] ?? STANDARD[c];
/** assigns a control of this controller to a button index */
export function remapControl(id: string, c: PadControl, index: number) {
  // the control that had this button takes the moved control's old one, so no button does two things
  const m = (remaps[id] ??= {}), was = indexFor(id, c);
  const other = (Object.keys(STANDARD) as PadControl[]).find((d) => d !== c && indexFor(id, d) === index);
  if (other) m[other] = was;
  m[c] = index;
  try { localStorage.setItem(REMAP_KEY, JSON.stringify(remaps)); } catch { /* ignore */ }
}
export function resetRemap(id: string) {
  delete remaps[id];
  try { localStorage.setItem(REMAP_KEY, JSON.stringify(remaps)); } catch { /* ignore */ }
}
export const isRemapped = (id: string) => !!remaps[id] && Object.keys(remaps[id]).length > 0;
/** for tests */
export function _clearRemaps() { remaps = {}; }

// ---------- reading a controller ----------
/** one frame of the active controller, cleaned up */
export interface PadFrame {
  id: string;
  family: PadFamily;
  standard: boolean;
  /** left stick after the dead zone and response curve, -1..1 (x right, y down) */
  lx: number; ly: number;
  /** right stick after the dead zone, -1..1 */
  rx: number; ry: number;
  /** analog trigger travel after the trigger dead zone, 0..1 (1 or 0 on a digital trigger) */
  l2: number; r2: number;
  /** held controls */
  held: (c: PadControl) => boolean;
  /** pressed since the previous frame (one-shot actions use these, so holding never repeats) */
  pressed: (c: PadControl) => boolean;
  /** released since the previous frame */
  released: (c: PadControl) => boolean;
  /** an action's control, held / pressed */
  act: (a: PadAction) => boolean;
  actPressed: (a: PadAction) => boolean;
  /** any button index pressed this frame (for remapping) */
  anyPressed: number | null;
}

/** a stick axis through the dead zone, scaled so the edge of the dead zone is 0 and full tilt 1 */
export const deadZone = (v: number, dz: number) => (Math.abs(v) <= dz ? 0 : (Math.sign(v) * (Math.abs(v) - dz)) / (1 - dz));
/** a part-tilt gives gentle steering, more tilt progressively more (the sign kept) */
export const steerCurve = (v: number, sens = 1) => Math.max(-1, Math.min(1, Math.sign(v) * Math.pow(Math.abs(v), 1.6) * sens));

type Listener = (f: PadFrame | null, dt: number) => void;
type ModeListener = (mode: 'pad' | 'keys', family: PadFamily) => void;

class PadInput {
  private listeners = new Set<Listener>();
  private modeListeners = new Set<ModeListener>();
  private prev = new Map<string, boolean[]>();
  /** the id of the controller in use (null: none) */
  activeId: string | null = null;
  /** set while the Controller panel waits for a button to remap: menus and rides ignore the controller */
  capturing = false;
  private running = false;
  private last = 0;
  /** the last kind of input the player used: the on-screen guide follows it */
  mode: 'pad' | 'keys' = 'keys';
  family: PadFamily = 'generic';

  constructor() {
    if (typeof window === 'undefined') return;
    addEventListener('gamepadconnected', () => this.start());
    addEventListener('gamepaddisconnected', (e) => {
      const id = (e as GamepadEvent).gamepad?.id;
      this.prev.delete(id ?? '');
      if (id && id === this.activeId) this.drop();
    });
    // keyboard or pointer use hands the guide back to the keys
    const keys = () => { if (this.mode !== 'keys') { this.mode = 'keys'; this.emitMode(); } };
    addEventListener('keydown', keys, true);
    addEventListener('pointerdown', keys, true);
    // a controller plugged in before the page loaded shows up on the first poll (some browsers only report it after
    // a button press)
    this.start();
  }

  /** every connected controller, as the browser reports them */
  pads(): Gamepad[] {
    try { return (navigator.getGamepads?.() ?? []).filter((p): p is Gamepad => !!p && p.connected !== false); } catch { return []; }
  }
  get connected() { return this.pads().length > 0; }
  get active(): Gamepad | null { return this.pads().find((p) => p.id === this.activeId) ?? null; }

  /** a short rumble on the controller in use: the browser's dual-rumble effect (Chrome and Edge drive the DualSense,
   *  the DualShock 4 and Xbox pads with it), else a pulse of the first haptic actuator (Firefox); silent elsewhere */
  rumble(strong: number, weak: number, ms: number) {
    if (this.mode !== 'pad') return;
    const p = this.active ?? this.pads()[0] as (Gamepad & { hapticActuators?: { pulse?: (v: number, ms: number) => unknown }[] }) | undefined;
    if (!p) return;
    try {
      const va = (p as Gamepad & { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }).vibrationActuator;
      if (va?.playEffect) void va.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
      else (p as Gamepad & { hapticActuators?: { pulse?: (v: number, ms: number) => unknown }[] }).hapticActuators?.[0]?.pulse?.(Math.max(strong, weak), ms);
    } catch { /* not supported */ }
  }

  onFrame(fn: Listener) { this.listeners.add(fn); this.start(); return () => { this.listeners.delete(fn); }; }
  onMode(fn: ModeListener) { this.modeListeners.add(fn); return () => { this.modeListeners.delete(fn); }; }

  private emitMode() { for (const fn of this.modeListeners) fn(this.mode, this.family); }
  /** the active controller went away: every listener gets one empty frame so nothing stays held */
  private drop() {
    this.activeId = null;
    for (const fn of this.listeners) fn(null, 0);
    if (this.mode === 'pad') { this.mode = 'keys'; this.emitMode(); }
  }
  private start() {
    if (this.running || typeof requestAnimationFrame === 'undefined') return;
    this.running = true;
    this.last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.1, (t - this.last) / 1000);
      this.last = t;
      this.poll(dt);
      // keeps polling while anyone listens or a controller is connected; a later connection restarts it
      if (this.listeners.size || this.connected) requestAnimationFrame(tick);
      else this.running = false;
    };
    requestAnimationFrame(tick);
  }

  private poll(dt: number) {
    const pads = this.pads();
    if (!pads.length) { if (this.activeId) this.drop(); return; }
    // several controllers: the one used most recently drives (any button or a stick past the dead zone)
    for (const p of pads) {
      const used = p.buttons.some((b) => b.pressed || b.value > 0.5) || p.axes.slice(0, 4).some((a) => Math.abs(a) > 0.5);
      if (used && p.id !== this.activeId) this.activeId = p.id;
      if (used && this.mode !== 'pad') { this.mode = 'pad'; this.family = padFamily(p.id); this.emitMode(); }
    }
    if (this.activeId && !pads.some((p) => p.id === this.activeId)) this.drop();
    const p = this.active ?? pads[0];
    if (!this.activeId) this.activeId = p.id;
    this.family = padFamily(p.id);
    const frame = this.frame(p);
    for (const fn of this.listeners) fn(frame, dt);
  }

  private frame(p: Gamepad): PadFrame {
    const S = padSettings, std = p.mapping === 'standard';
    const btn = (i: number) => p.buttons[i];
    const isOn = (i: number) => { const b = btn(i); return !!b && (b.pressed || b.value > 0.5); };
    const now = p.buttons.map((_, i) => isOn(i));
    const before = this.prev.get(p.id) ?? now.map(() => false);
    this.prev.set(p.id, now);
    const idx = (c: PadControl) => indexFor(p.id, c);
    // the d-pad: buttons on the standard mapping; some generic pads report it as a hat on axes 6/7 (or 9)
    const hat = (c: PadControl) => {
      if (std || btn(idx(c))) return false;
      const ax = p.axes.length > 7 ? [p.axes[6], p.axes[7]] : [0, 0];
      return c === 'left' ? ax[0] < -0.5 : c === 'right' ? ax[0] > 0.5 : c === 'up' ? ax[1] < -0.5 : c === 'down' ? ax[1] > 0.5 : false;
    };
    const held = (c: PadControl) => now[idx(c)] || hat(c);
    const pressed = (c: PadControl) => (now[idx(c)] && !before[idx(c)]);
    const released = (c: PadControl) => (!now[idx(c)] && !!before[idx(c)]);
    // triggers: analog where the controller reports a value, else on/off
    const trig = (c: 'l2' | 'r2') => {
      const b = btn(idx(c));
      const v = b ? (b.value > 0 ? b.value : b.pressed ? 1 : 0) : 0;
      return v <= S.triggerDead ? 0 : Math.min(1, (v - S.triggerDead) / (1 - S.triggerDead));
    };
    const ax = (i: number) => p.axes[i] ?? 0;
    let anyPressed: number | null = null;
    now.forEach((on, i) => { if (on && !before[i] && anyPressed === null) anyPressed = i; });
    return {
      id: p.id, family: padFamily(p.id), standard: std,
      lx: deadZone(ax(0), S.deadLeft), ly: deadZone(ax(1), S.deadLeft),
      rx: deadZone(ax(2), S.deadRight), ry: deadZone(ax(3), S.deadRight),
      l2: trig('l2'), r2: trig('r2'),
      held, pressed, released,
      act: (a) => held(controlFor(a)),
      actPressed: (a) => pressed(controlFor(a)),
      anyPressed,
    };
  }
}

/** the one controller reader for the whole game */
export const pad = new PadInput();

// ---------- development diagnostic: ?paddebug shows what the browser reports ----------
if (typeof location !== 'undefined' && /[?&]paddebug\b/.test(location.search)) {
  const el = document.createElement('pre');
  el.style.cssText = 'position:fixed;right:6px;bottom:6px;z-index:99999;max-width:46vw;max-height:60vh;overflow:auto;margin:0;padding:8px;font:11px/1.35 monospace;background:rgba(0,0,0,.78);color:#9f9;border-radius:8px;pointer-events:none';
  if (document.body) document.body.appendChild(el); else addEventListener('DOMContentLoaded', () => document.body.appendChild(el));
  pad.onFrame((f) => {
    const ps = pad.pads();
    el.textContent = ps.length ? ps.map((p) => `${p.id === f?.id ? '▶ ' : '  '}${p.index}: ${p.id}\n   mapping: ${p.mapping || '(none)'} · family: ${padFamily(p.id)}${isRemapped(p.id) ? ' · remapped' : ''}\n   axes: ${p.axes.map((a) => a.toFixed(2)).join(' ')}\n   buttons: ${p.buttons.map((b, i) => (b.pressed || b.value > 0.05 ? `${i}:${b.value.toFixed(2)}` : '')).filter(Boolean).join(' ') || '-'}`).join('\n') + `\n   mode: ${pad.mode}${f ? `\n   left ${f.lx.toFixed(2)},${f.ly.toFixed(2)} right ${f.rx.toFixed(2)},${f.ry.toFixed(2)} L2 ${f.l2.toFixed(2)} R2 ${f.r2.toFixed(2)}` : ''}` : 'no controller detected (press a button on it)';
  });
}
