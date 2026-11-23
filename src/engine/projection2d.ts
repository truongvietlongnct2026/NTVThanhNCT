import { CSGPolygon, CSGSolid, Vec3, dot3 } from './csg';
import { extractSolidEdges } from './edgeExtractor';
import { PartSpec, View2DKey } from '../types/cad';

export interface Segment2D {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface Circle2D {
  cu: number;
  cv: number;
  r: number;
  style: 'visible' | 'hidden';
}

export interface ViewProjection2D {
  view: View2DKey;
  width: number;
  height: number;
  visibleLines: Segment2D[];
  hiddenLines: Segment2D[];
  centerLines: Segment2D[];
  circles: Circle2D[];
}

export interface Drawing2DData {
  front: ViewProjection2D;
  top: ViewProjection2D;
  left: ViewProjection2D;
}

interface ProjPoint {
  u: number;
  v: number;
  depth: number; // larger = closer to viewer
}

interface Poly2DOccluder {
  pts: { u: number; v: number }[];
  // depth(u, v) = a*u + b*v + c
  a: number;
  b: number;
  c: number;
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
}

const EPS = 1e-4;

function getViewConfig(view: View2DKey, base: { w: number; h: number; d: number }) {
  if (view === 'front') {
    return {
      width: base.w,
      height: base.h,
      viewDir: { x: 0, y: 0, z: 1 },
      viewAxis: 'z' as const,
      project: (p: Vec3): ProjPoint => ({ u: p.x, v: p.y, depth: p.z }),
      planeDepthCoeffs: (poly: CSGPolygon) => {
        const { x: nx, y: ny, z: nz } = poly.normal;
        if (Math.abs(nz) < 1e-4) return null;
        // nx*u + ny*v + nz*depth = w => depth = (w - nx*u - ny*v)/nz
        return { a: -nx / nz, b: -ny / nz, c: poly.w / nz };
      },
    };
  }
  if (view === 'top') {
    return {
      width: base.w,
      height: base.d,
      viewDir: { x: 0, y: 1, z: 0 },
      viewAxis: 'y' as const,
      project: (p: Vec3): ProjPoint => ({ u: p.x, v: base.d - p.z, depth: p.y }),
      planeDepthCoeffs: (poly: CSGPolygon) => {
        const { x: nx, y: ny, z: nz } = poly.normal;
        if (Math.abs(ny) < 1e-4) return null;
        // nx*u + ny*depth + nz*(D - v) = w => depth = (w - nz*D - nx*u + nz*v)/ny
        return {
          a: -nx / ny,
          b: nz / ny,
          c: (poly.w - nz * base.d) / ny,
        };
      },
    };
  }
  // 'left' view: looking from -X toward +X; +Z goes right (u=z), +Y goes up (v=y)
  return {
    width: base.d,
    height: base.h,
    viewDir: { x: -1, y: 0, z: 0 },
    viewAxis: 'x' as const,
    project: (p: Vec3): ProjPoint => ({ u: p.z, v: p.y, depth: -p.x }),
    planeDepthCoeffs: (poly: CSGPolygon) => {
      const { x: nx, y: ny, z: nz } = poly.normal;
      if (Math.abs(nx) < 1e-4) return null;
      // nx*(-depth) + ny*v + nz*u = w => depth = (nz*u + ny*v - w)/nx
      return { a: nz / nx, b: ny / nx, c: -poly.w / nx };
    },
  };
}

function polygonArea2D(pts: { u: number; v: number }[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].u * pts[j].v - pts[j].u * pts[i].v;
  }
  return area * 0.5;
}

function buildOccluders(
  solid: CSGSolid,
  view: View2DKey,
  base: { w: number; h: number; d: number },
): Poly2DOccluder[] {
  const cfg = getViewConfig(view, base);
  const occluders: Poly2DOccluder[] = [];

  for (const poly of solid.polygons) {
    if (dot3(poly.normal, cfg.viewDir) <= 1e-4) continue;
    const coeffs = cfg.planeDepthCoeffs(poly);
    if (!coeffs) continue;

    let pts = poly.vertices.map((v) => {
      const p = cfg.project(v);
      return { u: p.u, v: p.v };
    });
    const area = polygonArea2D(pts);
    if (Math.abs(area) < 1e-6) continue;
    // Ensure CCW order in 2D (u, v) for Cyrus-Beck clipping
    if (area < 0) {
      pts = pts.slice().reverse();
    }

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of pts) {
      if (p.u < minU) minU = p.u;
      if (p.u > maxU) maxU = p.u;
      if (p.v < minV) minV = p.v;
      if (p.v > maxV) maxV = p.v;
    }

    occluders.push({
      pts,
      a: coeffs.a,
      b: coeffs.b,
      c: coeffs.c,
      minU,
      maxU,
      minV,
      maxV,
    });
  }

  return occluders;
}

// Clip segment P(t) = P0 + t*(P1 - P0), t in [0, 1], against a CCW convex 2D polygon
function clipSegmentToConvexPoly(
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  poly: Poly2DOccluder,
): [number, number] | null {
  const du = u1 - u0;
  const dv = v1 - v0;
  let tEnter = 0;
  let tLeave = 1;

  const n = poly.pts.length;
  for (let i = 0; i < n; i++) {
    const a = poly.pts[i];
    const b = poly.pts[(i + 1) % n];
    const eu = b.u - a.u;
    const ev = b.v - a.v;
    // Inward normal for CCW polygon is (-ev, eu)
    const nu = -ev;
    const nv = eu;
    const num = nu * (u0 - a.u) + nv * (v0 - a.v);
    const den = nu * du + nv * dv;

    if (Math.abs(den) < 1e-9) {
      if (num < -1e-6) return null;
    } else {
      const t = -num / den;
      if (den > 0) {
        if (t > tEnter) tEnter = t;
      } else {
        if (t < tLeave) tLeave = t;
      }
      if (tEnter > tLeave - 1e-6) return null;
    }
  }

  if (tLeave - tEnter <= 1e-5) return null;
  return [tEnter, tLeave];
}

function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = intervals
    .map(([a, b]) => [Math.max(0, a), Math.min(1, b)] as [number, number])
    .filter(([a, b]) => b - a > 1e-5)
    .sort((x, y) => x[0] - y[0]);

  if (sorted.length === 0) return [];
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur[0] <= prev[1] + 1e-4) {
      prev[1] = Math.max(prev[1], cur[1]);
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

function classifySegment(
  u0: number,
  v0: number,
  d0: number,
  u1: number,
  v1: number,
  d1: number,
  occluders: Poly2DOccluder[],
): { visible: Segment2D[]; hidden: Segment2D[] } {
  const minSegU = Math.min(u0, u1);
  const maxSegU = Math.max(u0, u1);
  const minSegV = Math.min(v0, v1);
  const maxSegV = Math.max(v0, v1);

  const occludedIntervals: [number, number][] = [];

  for (const poly of occluders) {
    if (
      maxSegU < poly.minU - EPS ||
      minSegU > poly.maxU + EPS ||
      maxSegV < poly.minV - EPS ||
      minSegV > poly.maxV + EPS
    ) {
      continue;
    }

    const span = clipSegmentToConvexPoly(u0, v0, u1, v1, poly);
    if (!span) continue;

    const [ta, tb] = span;
    const depthAt = (t: number) => d0 + t * (d1 - d0);
    const polyDepthAt = (t: number) => {
      const u = u0 + t * (u1 - u0);
      const v = v0 + t * (v1 - v0);
      return poly.a * u + poly.b * v + poly.c;
    };

    const diffA = polyDepthAt(ta) - depthAt(ta);
    const diffB = polyDepthAt(tb) - depthAt(tb);

    if (diffA > EPS && diffB > EPS) {
      occludedIntervals.push([ta, tb]);
    } else if (diffA <= EPS && diffB <= EPS) {
      // Not occluded
    } else {
      // Linear crossing
      const denom = diffB - diffA;
      const frac = Math.abs(denom) > 1e-9 ? -diffA / denom : 0.5;
      const tCross = ta + Math.max(0, Math.min(1, frac)) * (tb - ta);
      if (diffA > EPS) {
        if (tCross - ta > 1e-5) occludedIntervals.push([ta, tCross]);
      } else {
        if (tb - tCross > 1e-5) occludedIntervals.push([tCross, tb]);
      }
    }
  }

  const hiddenIntervals = mergeIntervals(occludedIntervals);
  const visibleIntervals: [number, number][] = [];
  let cursor = 0;
  for (const [ha, hb] of hiddenIntervals) {
    if (ha - cursor > 1e-5) {
      visibleIntervals.push([cursor, ha]);
    }
    cursor = Math.max(cursor, hb);
  }
  if (1 - cursor > 1e-5) {
    visibleIntervals.push([cursor, 1]);
  }

  const makeSeg = ([a, b]: [number, number]): Segment2D => ({
    u0: u0 + a * (u1 - u0),
    v0: v0 + a * (v1 - v0),
    u1: u0 + b * (u1 - u0),
    v1: v0 + b * (v1 - v0),
  });

  return {
    visible: visibleIntervals.map(makeSeg),
    hidden: hiddenIntervals.map(makeSeg),
  };
}

function mergeCollinearSegments(segments: Segment2D[]): Segment2D[] {
  const cleaned = segments.filter((s) => Math.hypot(s.u1 - s.u0, s.v1 - s.v0) > 1e-4);
  if (cleaned.length <= 1) return cleaned;

  interface LineGroup {
    nx: number;
    ny: number;
    d: number;
    dx: number;
    dy: number;
    spans: [number, number][];
  }

  const groups: LineGroup[] = [];
  for (const s of cleaned) {
    const len = Math.hypot(s.u1 - s.u0, s.v1 - s.v0);
    let dx = (s.u1 - s.u0) / len;
    let dy = (s.v1 - s.v0) / len;
    if (dx < -1e-6 || (Math.abs(dx) <= 1e-6 && dy < 0)) {
      dx = -dx;
      dy = -dy;
    }
    const nx = -dy;
    const ny = dx;
    const d = nx * s.u0 + ny * s.v0;
    const t0 = dx * s.u0 + dy * s.v0;
    const t1 = dx * s.u1 + dy * s.v1;
    const lo = Math.min(t0, t1);
    const hi = Math.max(t0, t1);

    let matched: LineGroup | undefined;
    for (const g of groups) {
      if (
        Math.abs(g.dx * dx + g.dy * dy - 1) < 1e-4 &&
        Math.abs(g.d - d) < 1e-3
      ) {
        matched = g;
        break;
      }
    }
    if (!matched) {
      matched = { nx, ny, d, dx, dy, spans: [] };
      groups.push(matched);
    }
    matched.spans.push([lo, hi]);
  }

  const out: Segment2D[] = [];
  for (const g of groups) {
    g.spans.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [g.spans[0]];
    for (let i = 1; i < g.spans.length; i++) {
      const prev = merged[merged.length - 1];
      const cur = g.spans[i];
      if (cur[0] <= prev[1] + 1e-3) {
        prev[1] = Math.max(prev[1], cur[1]);
      } else {
        merged.push(cur);
      }
    }
    for (const [lo, hi] of merged) {
      if (hi - lo < 1e-4) continue;
      out.push({
        u0: g.nx * g.d + g.dx * lo,
        v0: g.ny * g.d + g.dy * lo,
        u1: g.nx * g.d + g.dx * hi,
        v1: g.ny * g.d + g.dy * hi,
      });
    }
  }
  return out;
}

function subtractVisibleFromHidden(
  hidden: Segment2D[],
  visible: Segment2D[],
): Segment2D[] {
  const out: Segment2D[] = [];
  for (const h of hidden) {
    const hLen = Math.hypot(h.u1 - h.u0, h.v1 - h.v0);
    if (hLen < 1e-4) continue;
    const dx = (h.u1 - h.u0) / hLen;
    const dy = (h.v1 - h.v0) / hLen;
    const blocked: [number, number][] = [];

    for (const v of visible) {
      const vLen = Math.hypot(v.u1 - v.u0, v.v1 - v.v0);
      if (vLen < 1e-4) continue;
      const vdx = (v.u1 - v.u0) / vLen;
      const vdy = (v.v1 - v.v0) / vLen;
      if (Math.abs(Math.abs(dx * vdx + dy * vdy) - 1) > 1e-4) continue;

      // Perpendicular distance from v.u0,v.v0 to line of h
      const perp = Math.abs(-(h.v1 - h.v0) * (v.u0 - h.u0) + (h.u1 - h.u0) * (v.v0 - h.v0)) / hLen;
      if (perp > 1e-3) continue;

      const t0 = ((v.u0 - h.u0) * dx + (v.v0 - h.v0) * dy) / hLen;
      const t1 = ((v.u1 - h.u0) * dx + (v.v1 - h.v0) * dy) / hLen;
      const lo = Math.max(0, Math.min(t0, t1));
      const hi = Math.min(1, Math.max(t0, t1));
      if (hi - lo > 1e-4) blocked.push([lo, hi]);
    }

    const mergedBlocked = mergeIntervals(blocked);
    let cursor = 0;
    for (const [ba, bb] of mergedBlocked) {
      if (ba - cursor > 1e-4) {
        out.push({
          u0: h.u0 + cursor * (h.u1 - h.u0),
          v0: h.v0 + cursor * (h.v1 - h.v0),
          u1: h.u0 + ba * (h.u1 - h.u0),
          v1: h.v0 + ba * (h.v1 - h.v0),
        });
      }
      cursor = Math.max(cursor, bb);
    }
    if (1 - cursor > 1e-4) {
      out.push({
        u0: h.u0 + cursor * (h.u1 - h.u0),
        v0: h.v0 + cursor * (h.v1 - h.v0),
        u1: h.u1,
        v1: h.v1,
      });
    }
  }
  return out;
}

function projectView(
  spec: PartSpec,
  solid: CSGSolid,
  view: View2DKey,
): ViewProjection2D {
  const cfg = getViewConfig(view, spec.base);
  const occluders = buildOccluders(solid, view, spec.base);

  // Identify axial cylindrical holes (which will be drawn as crisp SVG circles)
  const axialCylIds = new Set<string>();
  const circles: Circle2D[] = [];
  const centerLines: Segment2D[] = [];

  for (const feat of spec.features) {
    if (!feat.enabled) continue;

    if (feat.type === 'hole_cyl') {
      const ext = 0.35;
      if (feat.axis === cfg.viewAxis) {
        let cu = feat.uCenter;
        let cv = feat.vCenter;
        if (view === 'top') {
          cv = spec.base.d - feat.vCenter;
        }
        let visCount = 0;
        const samples = 16;
        const cylTag = `cyl:${feat.id}`;
        let maxAxisDepth = -Infinity;
        let hasCylPolys = false;
        for (const poly of solid.polygons) {
          if (poly.tag !== cylTag) continue;
          hasCylPolys = true;
          for (const vert of poly.vertices) {
            const p = cfg.project(vert);
            if (p.depth > maxAxisDepth) maxAxisDepth = p.depth;
          }
        }

        if (hasCylPolys) {
          axialCylIds.add(cylTag);
          for (let i = 0; i < samples; i++) {
            const ang = (i / samples) * Math.PI * 2;
            const su = cu + Math.cos(ang) * feat.radius * 0.99;
            const sv = cv + Math.sin(ang) * feat.radius * 0.99;
            let occluded = false;
            for (const occ of occluders) {
              let inside = true;
              for (let k = 0; k < occ.pts.length; k++) {
                const pa = occ.pts[k];
                const pb = occ.pts[(k + 1) % occ.pts.length];
                const cross = (pb.u - pa.u) * (sv - pa.v) - (pb.v - pa.v) * (su - pa.u);
                if (cross < -1e-4) {
                  inside = false;
                  break;
                }
              }
              if (inside) {
                const occDepth = occ.a * su + occ.b * sv + occ.c;
                if (occDepth > maxAxisDepth + 1e-3) {
                  occluded = true;
                  break;
                }
              }
            }
            if (!occluded) visCount++;
          }

          circles.push({
            cu,
            cv,
            r: feat.radius,
            style: visCount >= samples / 2 ? 'visible' : 'hidden',
          });

          centerLines.push(
            { u0: cu - feat.radius - ext, v0: cv, u1: cu + feat.radius + ext, v1: cv },
            { u0: cu, v0: cv - feat.radius - ext, u1: cu, v1: cv + feat.radius + ext },
          );
        }
      } else {
        const cylTag = `cyl:${feat.id}`;
        let minS = Infinity;
        let maxS = -Infinity;
        for (const poly of solid.polygons) {
          if (poly.tag !== cylTag) continue;
          for (const vert of poly.vertices) {
            const s = feat.axis === 'y' ? vert.y : feat.axis === 'x' ? vert.x : vert.z;
            if (s < minS) minS = s;
            if (s > maxS) maxS = s;
          }
        }
        if (maxS > minS) {
          const toWorld = (s: number): Vec3 => {
            if (feat.axis === 'y') return { x: feat.uCenter, y: s, z: feat.vCenter };
            if (feat.axis === 'x') return { x: s, y: feat.vCenter, z: feat.uCenter };
            return { x: feat.uCenter, y: feat.vCenter, z: s };
          };
          const p0 = cfg.project(toWorld(minS));
          const p1 = cfg.project(toWorld(maxS));
          const len = Math.hypot(p1.u - p0.u, p1.v - p0.v);
          if (len > 1e-3) {
            const du = (p1.u - p0.u) / len;
            const dv = (p1.v - p0.v) / len;
            centerLines.push({
              u0: p0.u - du * ext,
              v0: p0.v - dv * ext,
              u1: p1.u + du * ext,
              v1: p1.v + dv * ext,
            });
          }
        }
      }
    } else if (feat.type === 't_slot') {
      const ext = 0.3;
      if (feat.axis === 'z') {
        if (view === 'front') {
          centerLines.push({
            u0: feat.center,
            v0: spec.base.h - feat.neckDepth - feat.headDepth - ext,
            u1: feat.center,
            v1: spec.base.h + ext,
          });
        } else if (view === 'top') {
          centerLines.push({
            u0: feat.center,
            v0: -ext,
            u1: feat.center,
            v1: spec.base.d + ext,
          });
        }
      } else {
        if (view === 'left') {
          centerLines.push({
            u0: feat.center,
            v0: spec.base.h - feat.neckDepth - feat.headDepth - ext,
            u1: feat.center,
            v1: spec.base.h + ext,
          });
        } else if (view === 'top') {
          const cv = spec.base.d - feat.center;
          centerLines.push({
            u0: -ext,
            v0: cv,
            u1: spec.base.w + ext,
            v1: cv,
          });
        }
      }
    }
  }

  const solidEdges = extractSolidEdges(solid);
  const visibleRaw: Segment2D[] = [];
  const hiddenRaw: Segment2D[] = [];

  for (const rec of solidEdges) {
    const pa = cfg.project(rec.a);
    const pb = cfg.project(rec.b);
    if (Math.hypot(pb.u - pa.u, pb.v - pa.v) < 1e-4) continue;

    const isAxialCircleEdge = rec.tags.some((t) => axialCylIds.has(t));
    if (isAxialCircleEdge && Math.abs(pa.depth - pb.depth) < 1e-3) {
      continue;
    }

    const sameCyl =
      rec.tags.length === 2 &&
      rec.tags[0].startsWith('cyl:') &&
      rec.tags[0] === rec.tags[1];

    if (sameCyl) {
      const d0 = dot3(rec.normals[0], cfg.viewDir);
      const d1 = dot3(rec.normals[1], cfg.viewDir);
      const isSilhouette = (d0 >= -1e-4 && d1 <= 1e-4) || (d1 >= -1e-4 && d0 <= 1e-4);
      const notGrazingBothZero = Math.abs(d0) > 1e-3 || Math.abs(d1) > 1e-3;
      if (!isSilhouette || !notGrazingBothZero) continue;
    } else if (rec.normals.length >= 2) {
      let minDot = 1;
      for (let i = 0; i < rec.normals.length; i++) {
        for (let j = i + 1; j < rec.normals.length; j++) {
          minDot = Math.min(minDot, dot3(rec.normals[i], rec.normals[j]));
        }
      }
      if (minDot > 0.998) continue;
    }

    const { visible, hidden } = classifySegment(
      pa.u,
      pa.v,
      pa.depth,
      pb.u,
      pb.v,
      pb.depth,
      occluders,
    );
    visibleRaw.push(...visible);
    hiddenRaw.push(...hidden);
  }

  const visibleMerged = mergeCollinearSegments(visibleRaw);
  const hiddenMerged = subtractVisibleFromHidden(
    mergeCollinearSegments(hiddenRaw),
    visibleMerged,
  );

  return {
    view,
    width: cfg.width,
    height: cfg.height,
    visibleLines: visibleMerged,
    hiddenLines: hiddenMerged,
    centerLines,
    circles,
  };
}

export function projectSolidTo2D(spec: PartSpec, solid: CSGSolid): Drawing2DData {
  return {
    front: projectView(spec, solid, 'front'),
    top: projectView(spec, solid, 'top'),
    left: projectView(spec, solid, 'left'),
  };
}
