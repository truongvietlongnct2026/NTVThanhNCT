import { CSGPolygon, CSGSolid, Vec3, dot3, len3, sub3 } from './csg';

export interface SolidEdge {
  a: Vec3;
  b: Vec3;
  normals: Vec3[];
  tags: string[];
}

function q(n: number): number {
  return Math.round(n * 1000);
}

function vKey(v: Vec3): string {
  return `${q(v.x)},${q(v.y)},${q(v.z)}`;
}

function planeKey(p: CSGPolygon): string {
  return `${q(p.normal.x)},${q(p.normal.y)},${q(p.normal.z)}|${q(p.w)}`;
}

function pointOnOpenSegment(p: Vec3, a: Vec3, b: Vec3): number | null {
  const ab = sub3(b, a);
  const abLenSq = dot3(ab, ab);
  if (abLenSq < 1e-8) return null;
  const ap = sub3(p, a);
  const t = dot3(ap, ab) / abLenSq;
  if (t <= 1e-4 || t >= 1 - 1e-4) return null;
  const proj = {
    x: a.x + ab.x * t,
    y: a.y + ab.y * t,
    z: a.z + ab.z * t,
  };
  if (len3(sub3(p, proj)) < 1e-4) {
    return t;
  }
  return null;
}

/**
 * Extracts clean geometric boundary edges from a CSGSolid by merging
 * coplanar BSP fragments and resolving T-junctions per plane group.
 */
export function extractSolidEdges(solid: CSGSolid): SolidEdge[] {
  // 1. Group polygons by exact plane (normal + w)
  const planeGroups = new Map<string, CSGPolygon[]>();
  for (const poly of solid.polygons) {
    if (poly.vertices.length < 3) continue;
    const pk = planeKey(poly);
    let grp = planeGroups.get(pk);
    if (!grp) {
      grp = [];
      planeGroups.set(pk, grp);
    }
    grp.push(poly);
  }

  // 2. Within each coplanar group, split edges at T-junction vertices & cancel opposite pairs
  interface GlobalEdgeRec {
    a: Vec3;
    b: Vec3;
    normals: Vec3[];
    tags: string[];
  }
  const globalEdgeMap = new Map<string, GlobalEdgeRec>();

  for (const polys of planeGroups.values()) {
    const repNormal = polys[0].normal;
    // Collect unique vertices in this plane group
    const vertMap = new Map<string, Vec3>();
    for (const poly of polys) {
      for (const v of poly.vertices) {
        const k = vKey(v);
        if (!vertMap.has(k)) vertMap.set(k, v);
      }
    }
    const allVerts = Array.from(vertMap.values());

    // Split every directed edge at any collinear vertex in this plane
    interface DirEdge {
      a: Vec3;
      b: Vec3;
      tag: string;
    }
    const dirEdges = new Map<string, { edge: DirEdge; count: number }>();

    for (const poly of polys) {
      const verts = poly.vertices;
      for (let i = 0; i < verts.length; i++) {
        const va = verts[i];
        const vb = verts[(i + 1) % verts.length];
        if (len3(sub3(vb, va)) < 1e-4) continue;

        // Find interior vertices on segment (va, vb)
        const splits: { t: number; v: Vec3 }[] = [];
        for (const p of allVerts) {
          const t = pointOnOpenSegment(p, va, vb);
          if (t !== null) splits.push({ t, v: p });
        }
        splits.sort((x, y) => x.t - y.t);

        const chain: Vec3[] = [va];
        for (const s of splits) {
          if (len3(sub3(s.v, chain[chain.length - 1])) > 1e-4) {
            chain.push(s.v);
          }
        }
        if (len3(sub3(vb, chain[chain.length - 1])) > 1e-4) {
          chain.push(vb);
        }

        for (let k = 0; k < chain.length - 1; k++) {
          const sa = chain[k];
          const sb = chain[k + 1];
          const fwdKey = `${vKey(sa)}->${vKey(sb)}`;
          const revKey = `${vKey(sb)}->${vKey(sa)}`;

          const revEntry = dirEdges.get(revKey);
          if (revEntry && revEntry.count > 0) {
            revEntry.count--;
            if (revEntry.count === 0) dirEdges.delete(revKey);
          } else {
            const existing = dirEdges.get(fwdKey);
            if (existing) existing.count++;
            else dirEdges.set(fwdKey, { edge: { a: sa, b: sb, tag: poly.tag }, count: 1 });
          }
        }
      }
    }

    // Add remaining true boundary edges of this coplanar face to globalEdgeMap
    for (const { edge } of dirEdges.values()) {
      const ka = vKey(edge.a);
      const kb = vKey(edge.b);
      const uKey = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      let rec = globalEdgeMap.get(uKey);
      if (!rec) {
        rec = { a: edge.a, b: edge.b, normals: [], tags: [] };
        globalEdgeMap.set(uKey, rec);
      }
      rec.normals.push(repNormal);
      rec.tags.push(edge.tag);
    }
  }

  return Array.from(globalEdgeMap.values());
}
