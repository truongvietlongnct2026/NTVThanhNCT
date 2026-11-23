export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CSGPolygon {
  vertices: Vec3[];
  normal: Vec3;
  w: number;
  tag: string;
}

const EPS = 1e-5;

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale3(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function len3(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function normalize3(a: Vec3): Vec3 {
  const l = len3(a);
  if (l < 1e-12) return { x: 0, y: 1, z: 0 };
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function makePolygon(vertices: Vec3[], tag = 'base'): CSGPolygon {
  const n = normalize3(cross3(sub3(vertices[1], vertices[0]), sub3(vertices[2], vertices[0])));
  return {
    vertices: vertices.map((v) => ({ ...v })),
    normal: n,
    w: dot3(n, vertices[0]),
    tag,
  };
}

function clonePolygon(p: CSGPolygon): CSGPolygon {
  return {
    vertices: p.vertices.map((v) => ({ ...v })),
    normal: { ...p.normal },
    w: p.w,
    tag: p.tag,
  };
}

function flipPolygon(p: CSGPolygon): CSGPolygon {
  return {
    vertices: [...p.vertices].reverse().map((v) => ({ ...v })),
    normal: scale3(p.normal, -1),
    w: -p.w,
    tag: p.tag,
  };
}

const COPLANAR = 0;
const FRONT = 1;
const BACK = 2;
const SPANNING = 3;

function splitPolygon(
  planeNormal: Vec3,
  planeW: number,
  polygon: CSGPolygon,
  coplanarFront: CSGPolygon[],
  coplanarBack: CSGPolygon[],
  front: CSGPolygon[],
  back: CSGPolygon[],
): void {
  let polygonType = 0;
  const types: number[] = [];

  for (let i = 0; i < polygon.vertices.length; i++) {
    const t = dot3(planeNormal, polygon.vertices[i]) - planeW;
    const type = t < -EPS ? BACK : t > EPS ? FRONT : COPLANAR;
    polygonType |= type;
    types.push(type);
  }

  switch (polygonType) {
    case COPLANAR: {
      if (dot3(planeNormal, polygon.normal) > 0) {
        coplanarFront.push(polygon);
      } else {
        coplanarBack.push(polygon);
      }
      break;
    }
    case FRONT: {
      front.push(polygon);
      break;
    }
    case BACK: {
      back.push(polygon);
      break;
    }
    case SPANNING: {
      const f: Vec3[] = [];
      const b: Vec3[] = [];
      for (let i = 0; i < polygon.vertices.length; i++) {
        const j = (i + 1) % polygon.vertices.length;
        const ti = types[i];
        const tj = types[j];
        const vi = polygon.vertices[i];
        const vj = polygon.vertices[j];
        if (ti !== BACK) f.push(vi);
        if (ti !== FRONT) b.push(vi);
        if ((ti | tj) === SPANNING) {
          const denom = dot3(planeNormal, sub3(vj, vi));
          const t = Math.abs(denom) > 1e-12 ? (planeW - dot3(planeNormal, vi)) / denom : 0.5;
          const v = lerp3(vi, vj, Math.max(0, Math.min(1, t)));
          f.push(v);
          b.push(v);
        }
      }
      if (f.length >= 3) {
        front.push({
          vertices: deduplicateLoop(f),
          normal: { ...polygon.normal },
          w: polygon.w,
          tag: polygon.tag,
        });
      }
      if (b.length >= 3) {
        back.push({
          vertices: deduplicateLoop(b),
          normal: { ...polygon.normal },
          w: polygon.w,
          tag: polygon.tag,
        });
      }
      break;
    }
  }
}

function deduplicateLoop(verts: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < verts.length; i++) {
    const cur = verts[i];
    const prev = out[out.length - 1];
    if (!prev || len3(sub3(cur, prev)) > 1e-6) {
      out.push(cur);
    }
  }
  if (out.length > 2 && len3(sub3(out[0], out[out.length - 1])) <= 1e-6) {
    out.pop();
  }
  return out;
}

class BSPNode {
  planeNormal: Vec3 | null = null;
  planeW = 0;
  front: BSPNode | null = null;
  back: BSPNode | null = null;
  polygons: CSGPolygon[] = [];

  constructor(polygons?: CSGPolygon[]) {
    if (polygons && polygons.length > 0) {
      this.build(polygons);
    }
  }

  clone(): BSPNode {
    const node = new BSPNode();
    node.planeNormal = this.planeNormal ? { ...this.planeNormal } : null;
    node.planeW = this.planeW;
    node.polygons = this.polygons.map(clonePolygon);
    node.front = this.front ? this.front.clone() : null;
    node.back = this.back ? this.back.clone() : null;
    return node;
  }

  invert(): void {
    for (let i = 0; i < this.polygons.length; i++) {
      this.polygons[i] = flipPolygon(this.polygons[i]);
    }
    if (this.planeNormal) {
      this.planeNormal = scale3(this.planeNormal, -1);
      this.planeW = -this.planeW;
    }
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    const temp = this.front;
    this.front = this.back;
    this.back = temp;
  }

  clipPolygons(polygons: CSGPolygon[]): CSGPolygon[] {
    if (!this.planeNormal) return polygons.slice();
    let front: CSGPolygon[] = [];
    let back: CSGPolygon[] = [];
    for (let i = 0; i < polygons.length; i++) {
      splitPolygon(this.planeNormal, this.planeW, polygons[i], front, back, front, back);
    }
    if (this.front) front = this.front.clipPolygons(front);
    if (this.back) back = this.back.clipPolygons(back);
    else back = [];
    return front.concat(back);
  }

  clipTo(bsp: BSPNode): void {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back) this.back.clipTo(bsp);
  }

  allPolygons(): CSGPolygon[] {
    let list = this.polygons.slice();
    if (this.front) list = list.concat(this.front.allPolygons());
    if (this.back) list = list.concat(this.back.allPolygons());
    return list;
  }

  build(polygons: CSGPolygon[]): void {
    if (polygons.length === 0) return;
    if (!this.planeNormal) {
      this.planeNormal = { ...polygons[0].normal };
      this.planeW = polygons[0].w;
    }
    const front: CSGPolygon[] = [];
    const back: CSGPolygon[] = [];
    for (let i = 0; i < polygons.length; i++) {
      splitPolygon(
        this.planeNormal,
        this.planeW,
        polygons[i],
        this.polygons,
        this.polygons,
        front,
        back,
      );
    }
    if (front.length > 0) {
      if (!this.front) this.front = new BSPNode();
      this.front.build(front);
    }
    if (back.length > 0) {
      if (!this.back) this.back = new BSPNode();
      this.back.build(back);
    }
  }
}

export class CSGSolid {
  polygons: CSGPolygon[];

  constructor(polygons: CSGPolygon[]) {
    this.polygons = polygons.filter((p) => p.vertices.length >= 3);
  }

  clone(): CSGSolid {
    return new CSGSolid(this.polygons.map(clonePolygon));
  }

  subtract(other: CSGSolid): CSGSolid {
    const a = new BSPNode(this.clone().polygons);
    const b = new BSPNode(other.clone().polygons);
    a.invert();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    a.invert();
    return new CSGSolid(a.allPolygons());
  }

  union(other: CSGSolid): CSGSolid {
    const a = new BSPNode(this.clone().polygons);
    const b = new BSPNode(other.clone().polygons);
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    return new CSGSolid(a.allPolygons());
  }
}

export function createBoxSolid(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  tag = 'base',
): CSGSolid {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const minZ = Math.min(z0, z1);
  const maxZ = Math.max(z0, z1);

  const v = [
    vec3(minX, minY, minZ), // 0: L-B-Back
    vec3(maxX, minY, minZ), // 1: R-B-Back
    vec3(maxX, maxY, minZ), // 2: R-T-Back
    vec3(minX, maxY, minZ), // 3: L-T-Back
    vec3(minX, minY, maxZ), // 4: L-B-Front
    vec3(maxX, minY, maxZ), // 5: R-B-Front
    vec3(maxX, maxY, maxZ), // 6: R-T-Front
    vec3(minX, maxY, maxZ), // 7: L-T-Front
  ];

  // Outward-facing CCW winding
  return new CSGSolid([
    makePolygon([v[4], v[5], v[6], v[7]], tag), // +Z Front
    makePolygon([v[1], v[0], v[3], v[2]], tag), // -Z Back
    makePolygon([v[5], v[1], v[2], v[6]], tag), // +X Right
    makePolygon([v[0], v[4], v[7], v[3]], tag), // -X Left
    makePolygon([v[7], v[6], v[2], v[3]], tag), // +Y Top
    makePolygon([v[0], v[1], v[5], v[4]], tag), // -Y Bottom
  ]);
}

// Extrude a CCW 2D polygon in XY along Z from z0 to z1
export function createPrismExtrudeZ(
  ptsXY: [number, number][],
  z0: number,
  z1: number,
  tag = 'chamfer',
): CSGSolid {
  const minZ = Math.min(z0, z1);
  const maxZ = Math.max(z0, z1);
  const polys: CSGPolygon[] = [];
  const frontPts = ptsXY.map(([x, y]) => vec3(x, y, maxZ));
  const backPts = [...ptsXY].reverse().map(([x, y]) => vec3(x, y, minZ));
  polys.push(makePolygon(frontPts, tag));
  polys.push(makePolygon(backPts, tag));

  const n = ptsXY.length;
  for (let i = 0; i < n; i++) {
    const [xA, yA] = ptsXY[i];
    const [xB, yB] = ptsXY[(i + 1) % n];
    polys.push(
      makePolygon(
        [vec3(xA, yA, maxZ), vec3(xA, yA, minZ), vec3(xB, yB, minZ), vec3(xB, yB, maxZ)],
        tag,
      ),
    );
  }
  return new CSGSolid(polys);
}

// Extrude a CCW 2D polygon in ZY (u=z, v=y) along X from x0 to x1
export function createPrismExtrudeX(
  ptsZY: [number, number][],
  x0: number,
  x1: number,
  tag = 'chamfer',
): CSGSolid {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const polys: CSGPolygon[] = [];
  // Looking from +X towards -X, +Z points left, +Y points up -> CCW in (z,y) becomes CW from +X, so flip accordingly
  const rightPts = [...ptsZY].reverse().map(([z, y]) => vec3(maxX, y, z));
  const leftPts = ptsZY.map(([z, y]) => vec3(minX, y, z));
  polys.push(makePolygon(rightPts, tag));
  polys.push(makePolygon(leftPts, tag));

  const n = ptsZY.length;
  for (let i = 0; i < n; i++) {
    const [zA, yA] = ptsZY[i];
    const [zB, yB] = ptsZY[(i + 1) % n];
    polys.push(
      makePolygon(
        [vec3(minX, yA, zA), vec3(minX, yB, zB), vec3(maxX, yB, zB), vec3(maxX, yA, zA)],
        tag,
      ),
    );
  }
  return new CSGSolid(polys);
}

export function createCylinderSolid(
  axis: 'x' | 'y' | 'z',
  uCenter: number,
  vCenter: number,
  radius: number,
  minSpan: number,
  maxSpan: number,
  segments = 32,
  tag = 'cyl',
): CSGSolid {
  const polys: CSGPolygon[] = [];
  const topCap: Vec3[] = [];
  const botCap: Vec3[] = [];

  const toPoint = (u: number, v: number, s: number): Vec3 => {
    if (axis === 'y') return vec3(u, s, v);
    if (axis === 'x') return vec3(s, v, u);
    return vec3(u, v, s);
  };

  // Build ring vertices with exact angles so 0, 90, 180, 270 deg align on vertices
  const ringTop: Vec3[] = [];
  const ringBot: Vec3[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const u = uCenter + Math.cos(angle) * radius;
    const v = vCenter + Math.sin(angle) * radius;
    ringTop.push(toPoint(u, v, maxSpan));
    ringBot.push(toPoint(u, v, minSpan));
  }

  // Ensure outward normals depending on axis handedness
  // For y-axis: (u=x, v=z, s=y), cross((x,0,z) tangent) -> angle increasing goes +x -> +z -> -x -> -z (CW when viewed from +Y!)
  // Let's compute outward winding explicitly by checking signed normal!
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    let quad = [ringBot[i], ringBot[next], ringTop[next], ringTop[i]];
    const poly = makePolygon(quad, tag);
    const mid = scale3(add3(ringBot[i], ringTop[next]), 0.5);
    const center = toPoint(uCenter, vCenter, (minSpan + maxSpan) * 0.5);
    if (dot3(poly.normal, sub3(mid, center)) < 0) {
      quad = quad.reverse();
    }
    polys.push(makePolygon(quad, tag));
  }

  for (let i = 0; i < segments; i++) {
    topCap.push(ringTop[i]);
    botCap.push(ringBot[i]);
  }

  const topPoly = makePolygon(topCap, `${tag}:cap`);
  const axisDir = axis === 'y' ? vec3(0, 1, 0) : axis === 'x' ? vec3(1, 0, 0) : vec3(0, 0, 1);
  if (dot3(topPoly.normal, axisDir) < 0) {
    polys.push(makePolygon([...topCap].reverse(), `${tag}:cap`));
    polys.push(makePolygon(botCap, `${tag}:cap`));
  } else {
    polys.push(topPoly);
    polys.push(makePolygon([...botCap].reverse(), `${tag}:cap`));
  }

  return new CSGSolid(polys);
}
