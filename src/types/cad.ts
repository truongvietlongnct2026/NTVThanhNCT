export type DifficultyLevel = 'Cơ bản' | 'Khá' | 'Nâng cao';

export type Axis3D = 'x' | 'y' | 'z';

export type StepCorner = 'top-right' | 'top-left' | 'top-front' | 'top-back';

export type ChamferEdge = 'top-right' | 'top-left' | 'top-front' | 'top-back';

export interface StepCutOp {
  id: string;
  type: 'step_cut';
  enabled: boolean;
  label?: string;
  corner: StepCorner;
  width: number;  // cut extent along X (for left/right) or Z (for front/back)
  height: number; // cut extent downward from Y=H
}

export interface SlotOp {
  id: string;
  type: 'slot';
  enabled: boolean;
  label?: string;
  axis: 'x' | 'z';       // 'x' = rãnh ngang (chạy theo X), 'z' = rãnh dọc (chạy theo Z)
  face: 'top' | 'bottom';
  center: number;        // position along Z (if axis==='x') or X (if axis==='z')
  width: number;         // width of the slot
  depth: number;         // vertical depth of the slot
  spanStart?: number;    // optional start along axis (defaults to 0)
  spanEnd?: number;      // optional end along axis (defaults to W or D)
}

export interface TSlotOp {
  id: string;
  type: 't_slot';
  enabled: boolean;
  label?: string;
  axis: 'x' | 'z';
  center: number;
  neckWidth: number;
  neckDepth: number;
  headWidth: number;
  headDepth: number;
}

export interface HoleRectOp {
  id: string;
  type: 'hole_rect';
  enabled: boolean;
  label?: string;
  axis: Axis3D;          // 'y' (đứng), 'x' (ngang), 'z' (trước-sau)
  uCenter: number;       // y->x, x->z, z->x
  vCenter: number;       // y->z, x->y, z->y
  uSize: number;
  vSize: number;
}

export interface HoleCylOp {
  id: string;
  type: 'hole_cyl';
  enabled: boolean;
  label?: string;
  axis: Axis3D;          // 'y' (đứng), 'x' (ngang), 'z' (trước-sau)
  uCenter: number;       // y->x, x->z, z->x
  vCenter: number;       // y->z, x->y, z->y
  radius: number;
}

export interface ChamferOp {
  id: string;
  type: 'chamfer';
  enabled: boolean;
  label?: string;
  edge: ChamferEdge;
  run: number;           // horizontal cut distance from edge
  drop: number;          // vertical cut distance from top
}

export type FeatureOp =
  | StepCutOp
  | SlotOp
  | TSlotOp
  | HoleRectOp
  | HoleCylOp
  | ChamferOp;

export interface PartSpec {
  base: {
    w: number;
    h: number;
    d: number;
  };
  features: FeatureOp[];
}

export type View2DKey = 'front' | 'top' | 'left';

export interface HintHighlightBox {
  view: View2DKey;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  caption: string;
}

export interface ExerciseHintStep {
  title: string;
  explanation: string;
  highlights: HintHighlightBox[];
}

export interface Exercise {
  id: string;
  number: number;
  title: string;
  difficulty: DifficultyLevel;
  summary: string;
  target: PartSpec;
  hints: ExerciseHintStep[];
  completionExplanation: string;
  projectionRelations: string[];
}

export interface PartFeedbackItem {
  partName: string;
  status: 'correct' | 'partial' | 'missing' | 'extra';
  detail: string;
}

export interface GradingResult {
  passed: boolean;
  iouPercent: number;
  matchPercent: number;
  feedbackItems: PartFeedbackItem[];
  summaryMessage: string;
}
