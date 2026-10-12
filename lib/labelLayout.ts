import * as THREE from "three";

// Shared registry for the floating magnitude labels (loose quakes and swarm
// towers). Each label registers its DOM node plus where it sits on the globe;
// <LabelLayout /> (inside the Canvas) then decides every few frames which
// labels are shown: far-side and limb labels are hidden, overlapping labels
// keep only the highest-priority one, and labels that would sit under the HUD
// (anything marked `data-label-avoid`) are hidden.

export interface LabelSpec {
  // World-space point the label is pinned to.
  anchor: THREE.Vector3;
  // Unit surface normal under the label, for the far-side test.
  dir: THREE.Vector3;
  // Higher wins a collision (we use magnitude).
  priority: number;
  // Vertical CSS offset applied to the label element (e.g. -translate-y-3).
  offsetY?: number;
}

export interface LabelState {
  w: number;
  h: number;
  alpha: number;
  visible: boolean;
  lastOpacity: number;
  score: number;
  rect: { x0: number; y0: number; x1: number; y1: number };
}

export interface LabelEntry extends LabelSpec {
  el: HTMLElement;
  state: LabelState;
}

export const labelRegistry = new Map<string, LabelEntry>();

// Layout state lives on the element (not the registry entry) so it survives
// the unregister/register cycle inline ref callbacks go through each render.
const states = new WeakMap<HTMLElement, LabelState>();

function stateFor(el: HTMLElement): LabelState {
  let s = states.get(el);
  if (!s) {
    s = {
      w: 0,
      h: 0,
      alpha: 0,
      visible: false,
      lastOpacity: -1,
      score: 0,
      rect: { x0: 0, y0: 0, x1: 0, y1: 0 },
    };
    states.set(el, s);
  }
  return s;
}

// Ref-callback helper: `ref={labelRef("q:" + id, spec)}`. Returns a React 19
// cleanup so the label unregisters when it unmounts.
export function labelRef(id: string, spec: LabelSpec) {
  return (el: HTMLElement | null) => {
    if (!el) return;
    labelRegistry.set(id, { ...spec, el, state: stateFor(el) });
    return () => {
      if (labelRegistry.get(id)?.el === el) labelRegistry.delete(id);
    };
  };
}
