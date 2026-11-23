import * as THREE from 'three';
import {
  CSGSolid,
  createBoxSolid,
  createCylinderSolid,
  createPrismExtrudeX,
  createPrismExtrudeZ,
  dot3,
} from './csg';
import { extractSolidEdges } from './edgeExtractor';
import { FeatureOp, PartSpec } from '../types/cad';

export function buildSolidFromSpec(spec: PartSpec): CSGSolid {
  const { w, h, d } = spec.base;
  let solid = createBoxSolid(0, 0, 0, w, h, d, 'base');

  for (const feat of spec.features) {
    if (!feat.enabled) continue;
    const tool = createFeatureToolSolid(feat, w, h, d);
    if (tool) {
      solid = solid.subtract(tool);
    }
  }
  return solid;
}

function createFeatureToolSolid(
  feat: FeatureOp,
  w: number,
  h: number,
  d: number,
): CSGSolid | null {
  const pad = 0.25;

  switch (feat.type) {
    case 'step_cut': {
      const cw = Math.max(0.1, Math.min(feat.width, feat.corner.includes('left') || feat.corner.includes('right') ? w - 0.1 : d - 0.1));
      const ch = Math.max(0.1, Math.min(feat.height, h - 0.1));
      if (feat.corner === 'top-right') {
        return createBoxSolid(w - cw, h - ch, -pad, w + pad, h + pad, d + pad, `step:${feat.id}`);
      }
      if (feat.corner === 'top-left') {
        return createBoxSolid(-pad, h - ch, -pad, cw, h + pad, d + pad, `step:${feat.id}`);
      }
      if (feat.corner === 'top-front') {
        return createBoxSolid(-pad, h - ch, d - cw, w + pad, h + pad, d + pad, `step:${feat.id}`);
      }
      return createBoxSolid(-pad, h - ch, -pad, w + pad, h + pad, cw, `step:${feat.id}`);
    }

    case 'slot': {
      const halfW = Math.max(0.2, feat.width / 2);
      const depth = Math.max(0.2, Math.min(feat.depth, h - 0.1));
      const y0 = feat.face === 'top' ? h - depth : -pad;
      const y1 = feat.face === 'top' ? h + pad : depth;

      if (feat.axis === 'x') {
        const sStart = feat.spanStart !== undefined ? feat.spanStart : 0;
        const sEnd = feat.spanEnd !== undefined ? feat.spanEnd : w;
        const x0 = sStart <= 0.01 ? -pad : sStart;
        const x1 = sEnd >= w - 0.01 ? w + pad : sEnd;
        if (x1 - x0 < 0.05) return null;
        return createBoxSolid(
          x0,
          y0,
          feat.center - halfW,
          x1,
          y1,
          feat.center + halfW,
          `slot:${feat.id}`,
        );
      } else {
        const sStart = feat.spanStart !== undefined ? feat.spanStart : 0;
        const sEnd = feat.spanEnd !== undefined ? feat.spanEnd : d;
        const z0 = sStart <= 0.01 ? -pad : sStart;
        const z1 = sEnd >= d - 0.01 ? d + pad : sEnd;
        if (z1 - z0 < 0.05) return null;
        return createBoxSolid(
          feat.center - halfW,
          y0,
          z0,
          feat.center + halfW,
          y1,
          z1,
          `slot:${feat.id}`,
        );
      }
    }

    case 't_slot': {
      const neckHalf = Math.max(0.15, feat.neckWidth / 2);
      const headHalf = Math.max(neckHalf + 0.1, feat.headWidth / 2);
      const neckD = Math.max(0.2, feat.neckDepth);
      const headD = Math.max(0.2, feat.headDepth);
      const totalD = Math.min(neckD + headD, h - 0.1);
      const neckTop = h + pad;
      const neckBot = h - neckD;
      const headBot = h - totalD;

      if (feat.axis === 'z') {
        const neck = createBoxSolid(
          feat.center - neckHalf,
          neckBot - 0.05,
          -pad,
          feat.center + neckHalf,
          neckTop,
          d + pad,
          `tslot:${feat.id}`,
        );
        const head = createBoxSolid(
          feat.center - headHalf,
          headBot,
          -pad,
          feat.center + headHalf,
          neckBot,
          d + pad,
          `tslot:${feat.id}`,
        );
        return neck.union(head);
      } else {
        const neck = createBoxSolid(
          -pad,
          neckBot - 0.05,
          feat.center - neckHalf,
          w + pad,
          neckTop,
          feat.center + neckHalf,
          `tslot:${feat.id}`,
        );
        const head = createBoxSolid(
          -pad,
          headBot,
          feat.center - headHalf,
          w + pad,
          neckBot,
          feat.center + headHalf,
          `tslot:${feat.id}`,
        );
        return neck.union(head);
      }
    }

    case 'hole_rect': {
      const hu = Math.max(0.2, feat.uSize / 2);
      const hv = Math.max(0.2, feat.vSize / 2);
      if (feat.axis === 'y') {
        return createBoxSolid(
          feat.uCenter - hu,
          -pad,
          feat.vCenter - hv,
          feat.uCenter + hu,
          h + pad,
          feat.vCenter + hv,
          `hrect:${feat.id}`,
        );
      }
      if (feat.axis === 'x') {
        return createBoxSolid(
          -pad,
          feat.vCenter - hv,
          feat.uCenter - hu,
          w + pad,
          feat.vCenter + hv,
          feat.uCenter + hu,
          `hrect:${feat.id}`,
        );
      }
      return createBoxSolid(
        feat.uCenter - hu,
        feat.vCenter - hv,
        -pad,
        feat.uCenter + hu,
        feat.vCenter + hv,
        d + pad,
        `hrect:${feat.id}`,
      );
    }

    case 'hole_cyl': {
      const r = Math.max(0.2, feat.radius);
      const maxSpan = feat.axis === 'y' ? h : feat.axis === 'x' ? w : d;
      return createCylinderSolid(
        feat.axis,
        feat.uCenter,
        feat.vCenter,
        r,
        -pad,
        maxSpan + pad,
        32,
        `cyl:${feat.id}`,
      );
    }

    case 'chamfer': {
      const run = Math.max(0.2, feat.run);
      const drop = Math.max(0.2, Math.min(feat.drop, h - 0.1));
      if (feat.edge === 'top-right') {
        const clampedRun = Math.min(run, w - 0.1);
        return createPrismExtrudeZ(
          [
            [w - clampedRun, h],
            [w, h - drop],
            [w + pad, h - drop],
            [w + pad, h + pad],
            [w - clampedRun, h + pad],
          ],
          -pad,
          d + pad,
          `chamfer:${feat.id}`,
        );
      }
      if (feat.edge === 'top-left') {
        const clampedRun = Math.min(run, w - 0.1);
        return createPrismExtrudeZ(
          [
            [clampedRun, h],
            [clampedRun, h + pad],
            [-pad, h + pad],
            [-pad, h - drop],
            [0, h - drop],
          ],
          -pad,
          d + pad,
          `chamfer:${feat.id}`,
        );
      }
      if (feat.edge === 'top-front') {
        const clampedRun = Math.min(run, d - 0.1);
        return createPrismExtrudeX(
          [
            [d - clampedRun, h],
            [d, h - drop],
            [d + pad, h - drop],
            [d + pad, h + pad],
            [d - clampedRun, h + pad],
          ],
          -pad,
          w + pad,
          `chamfer:${feat.id}`,
        );
      }
      const clampedRun = Math.min(run, d - 0.1);
      return createPrismExtrudeX(
        [
          [clampedRun, h],
          [clampedRun, h + pad],
          [-pad, h + pad],
          [-pad, h - drop],
          [0, h - drop],
        ],
        -pad,
        w + pad,
        `chamfer:${feat.id}`,
      );
    }
  }
}

export function isPointInsideSpec(spec: PartSpec, x: number, y: number, z: number): boolean {
  const { w, h, d } = spec.base;
  if (x < 0 || x > w || y < 0 || y > h || z < 0 || z > d) return false;

  for (const feat of spec.features) {
    if (!feat.enabled) continue;
    if (isPointInsideFeature(feat, w, h, d, x, y, z)) {
      return false;
    }
  }
  return true;
}

function isPointInsideFeature(
  feat: FeatureOp,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): boolean {
  switch (feat.type) {
    case 'step_cut': {
      if (feat.corner === 'top-right') return x >= w - feat.width && y >= h - feat.height;
      if (feat.corner === 'top-left') return x <= feat.width && y >= h - feat.height;
      if (feat.corner === 'top-front') return z >= d - feat.width && y >= h - feat.height;
      return z <= feat.width && y >= h - feat.height;
    }
    case 'slot': {
      const hw = feat.width / 2;
      const inY = feat.face === 'top' ? y >= h - feat.depth : y <= feat.depth;
      if (!inY) return false;
      if (feat.axis === 'x') {
        const s0 = feat.spanStart ?? 0;
        const s1 = feat.spanEnd ?? w;
        return x >= s0 && x <= s1 && Math.abs(z - feat.center) <= hw;
      } else {
        const s0 = feat.spanStart ?? 0;
        const s1 = feat.spanEnd ?? d;
        return z >= s0 && z <= s1 && Math.abs(x - feat.center) <= hw;
      }
    }
    case 't_slot': {
      const coord = feat.axis === 'z' ? x : z;
      const neckTop = h;
      const neckBot = h - feat.neckDepth;
      const headBot = h - (feat.neckDepth + feat.headDepth);
      if (y >= neckBot && y <= neckTop && Math.abs(coord - feat.center) <= feat.neckWidth / 2) {
        return true;
      }
      if (y >= headBot && y <= neckBot && Math.abs(coord - feat.center) <= feat.headWidth / 2) {
        return true;
      }
      return false;
    }
    case 'hole_rect': {
      const hu = feat.uSize / 2;
      const hv = feat.vSize / 2;
      if (feat.axis === 'y') {
        return Math.abs(x - feat.uCenter) <= hu && Math.abs(z - feat.vCenter) <= hv;
      }
      if (feat.axis === 'x') {
        return Math.abs(z - feat.uCenter) <= hu && Math.abs(y - feat.vCenter) <= hv;
      }
      return Math.abs(x - feat.uCenter) <= hu && Math.abs(y - feat.vCenter) <= hv;
    }
    case 'hole_cyl': {
      const r2 = feat.radius * feat.radius;
      if (feat.axis === 'y') {
        const dx = x - feat.uCenter;
        const dz = z - feat.vCenter;
        return dx * dx + dz * dz <= r2;
      }
      if (feat.axis === 'x') {
        const dz = z - feat.uCenter;
        const dy = y - feat.vCenter;
        return dz * dz + dy * dy <= r2;
      }
      const dx = x - feat.uCenter;
      const dy = y - feat.vCenter;
      return dx * dx + dy * dy <= r2;
    }
    case 'chamfer': {
      if (feat.edge === 'top-right') {
        const t = (x - (w - feat.run)) / Math.max(0.01, feat.run);
        return x >= w - feat.run && y >= h - feat.drop * t;
      }
      if (feat.edge === 'top-left') {
        const t = (feat.run - x) / Math.max(0.01, feat.run);
        return x <= feat.run && y >= h - feat.drop * t;
      }
      if (feat.edge === 'top-front') {
        const t = (z - (d - feat.run)) / Math.max(0.01, feat.run);
        return z >= d - feat.run && y >= h - feat.drop * t;
      }
      const t = (feat.run - z) / Math.max(0.01, feat.run);
      return z <= feat.run && y >= h - feat.drop * t;
    }
  }
}

export function solidToThreeGeometry(
  solid: CSGSolid,
  base: { w: number; h: number; d: number },
): {
  meshGeometry: THREE.BufferGeometry;
  edgeGeometry: THREE.BufferGeometry;
} {
  const ox = -base.w / 2;
  const oy = 0;
  const oz = -base.d / 2;

  const positions: number[] = [];
  const normals: number[] = [];

  for (const poly of solid.polygons) {
    const verts = poly.vertices;
    if (verts.length < 3) continue;

    const v0 = verts[0];
    for (let i = 1; i < verts.length - 1; i++) {
      const v1 = verts[i];
      const v2 = verts[i + 1];
      positions.push(
        v0.x + ox, v0.y + oy, v0.z + oz,
        v1.x + ox, v1.y + oy, v1.z + oz,
        v2.x + ox, v2.y + oy, v2.z + oz,
      );
      normals.push(
        poly.normal.x, poly.normal.y, poly.normal.z,
        poly.normal.x, poly.normal.y, poly.normal.z,
        poly.normal.x, poly.normal.y, poly.normal.z,
      );
    }
  }

  const meshGeometry = new THREE.BufferGeometry();
  meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  meshGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  meshGeometry.computeBoundingBox();
  meshGeometry.computeBoundingSphere();

  const solidEdges = extractSolidEdges(solid);
  const edgePositions: number[] = [];
  for (const rec of solidEdges) {
    let keep = false;
    if (rec.normals.length === 1) {
      keep = true;
    } else if (rec.normals.length >= 2) {
      let minDot = 1;
      for (let i = 0; i < rec.normals.length; i++) {
        for (let j = i + 1; j < rec.normals.length; j++) {
          minDot = Math.min(minDot, dot3(rec.normals[i], rec.normals[j]));
        }
      }
      const sameCyl =
        rec.tags.length === 2 &&
        rec.tags[0].startsWith('cyl:') &&
        rec.tags[0] === rec.tags[1];
      if (sameCyl) {
        keep = minDot < 0.85;
      } else {
        keep = minDot < 0.998;
      }
    }

    if (keep) {
      edgePositions.push(
        rec.a.x + ox, rec.a.y + oy, rec.a.z + oz,
        rec.b.x + ox, rec.b.y + oy, rec.b.z + oz,
      );
    }
  }

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  edgeGeometry.computeBoundingSphere();

  return { meshGeometry, edgeGeometry };
}
