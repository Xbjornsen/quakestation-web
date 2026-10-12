"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { labelRegistry, type LabelEntry, type LabelState } from "@/lib/labelLayout";

// Re-run the (relatively costly) collision pass every few frames; per-frame
// work is just the facing fade.
const LAYOUT_EVERY = 3;
// HUD rects change rarely (panel open/close), so re-measure them sparingly.
const AVOID_REFRESH_MS = 250;
// Breathing room between labels, in CSS px.
const PAD = 2;
// Facing (surface normal · direction to camera) below which a label is
// hidden, and the band over which it fades in. Hiding slightly *before* the
// horizon stops labels floating off the limb above the planet's edge.
const FACING_HIDE = 0.12;
const FACING_FADE = 0.22;
// A label already on screen gets a small priority boost so near-ties don't
// flicker back and forth as the globe turns.
const STICKY_BONUS = 0.3;

type Rect = LabelState["rect"];

const overlaps = (a: Rect, b: Rect) =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

export function LabelLayout() {
  const { gl } = useThree();
  const frame = useRef(0);
  const avoid = useRef<{ t: number; rects: Rect[] }>({ t: -Infinity, rects: [] });
  const scratch = useRef({
    v: new THREE.Vector3(),
    toCam: new THREE.Vector3(),
    cands: [] as LabelEntry[],
    placed: [] as Rect[],
  });

  useFrame(({ camera, size }) => {
    const { v, toCam, cands, placed } = scratch.current;

    const now = performance.now();
    if (now - avoid.current.t > AVOID_REFRESH_MS) {
      const c = gl.domElement.getBoundingClientRect();
      const rects: Rect[] = [];
      document.querySelectorAll<HTMLElement>("[data-label-avoid]").forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        rects.push({ x0: r.left - c.left, y0: r.top - c.top, x1: r.right - c.left, y1: r.bottom - c.top });
      });
      avoid.current = { t: now, rects };
    }

    const doLayout = frame.current++ % LAYOUT_EVERY === 0;
    if (doLayout) cands.length = 0;

    for (const e of labelRegistry.values()) {
      const s = e.state;
      toCam.subVectors(camera.position, e.anchor).normalize();
      const facing = e.dir.dot(toCam);
      s.alpha = THREE.MathUtils.clamp((facing - FACING_HIDE) / FACING_FADE, 0, 1);
      if (!doLayout) continue;
      if (s.alpha <= 0) {
        s.visible = false;
        continue;
      }
      if (!s.w) {
        s.w = e.el.offsetWidth;
        s.h = e.el.offsetHeight;
      }
      v.copy(e.anchor).project(camera);
      if (v.z > 1) {
        s.visible = false;
        continue;
      }
      const cx = ((v.x + 1) / 2) * size.width;
      const cy = ((1 - v.y) / 2) * size.height + (e.offsetY ?? 0);
      s.rect.x0 = cx - s.w / 2 - PAD;
      s.rect.x1 = cx + s.w / 2 + PAD;
      s.rect.y0 = cy - s.h / 2 - PAD;
      s.rect.y1 = cy + s.h / 2 + PAD;
      // Never show a label clipped by the edge of the viewport.
      if (s.rect.x0 < 0 || s.rect.y0 < 0 || s.rect.x1 > size.width || s.rect.y1 > size.height) {
        s.visible = false;
        continue;
      }
      s.score = e.priority + (s.visible ? STICKY_BONUS : 0);
      cands.push(e);
    }

    if (doLayout) {
      // Greedy placement, biggest quakes first.
      cands.sort((a, b) => b.state.score - a.state.score);
      placed.length = 0;
      for (const e of cands) {
        const r = e.state.rect;
        let ok = true;
        for (const a of avoid.current.rects) {
          if (overlaps(r, a)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          for (const p of placed) {
            if (overlaps(r, p)) {
              ok = false;
              break;
            }
          }
        }
        e.state.visible = ok;
        if (ok) placed.push(r);
      }
    }

    for (const e of labelRegistry.values()) {
      const s = e.state;
      const op = s.visible ? Math.round(s.alpha * 100) / 100 : 0;
      if (op !== s.lastOpacity) {
        e.el.style.opacity = String(op);
        e.el.style.visibility = op > 0 ? "visible" : "hidden";
        s.lastOpacity = op;
      }
    }
  });

  return null;
}
