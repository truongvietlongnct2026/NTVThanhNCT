import { isPointInsideSpec } from './geometryBuilder';
import {
  ChamferOp,
  FeatureOp,
  GradingResult,
  HoleCylOp,
  HoleRectOp,
  PartFeedbackItem,
  PartSpec,
  SlotOp,
  StepCutOp,
  TSlotOp,
} from '../types/cad';

export function gradeStudentModel(
  student: PartSpec,
  target: PartSpec,
): GradingResult {
  const { w, h, d } = target.base;
  const nx = 24;
  const ny = 16;
  const nz = 16;

  let intersection = 0;
  let union = 0;
  let targetCount = 0;
  let studentCount = 0;

  for (let ix = 0; ix < nx; ix++) {
    const x = ((ix + 0.5) / nx) * w;
    for (let iy = 0; iy < ny; iy++) {
      const y = ((iy + 0.5) / ny) * h;
      for (let iz = 0; iz < nz; iz++) {
        const z = ((iz + 0.5) / nz) * d;
        const inTarget = isPointInsideSpec(target, x, y, z);
        const inStudent = isPointInsideSpec(student, x, y, z);
        if (inTarget) targetCount++;
        if (inStudent) studentCount++;
        if (inTarget && inStudent) intersection++;
        if (inTarget || inStudent) union++;
      }
    }
  }

  const iou = union > 0 ? intersection / union : 1;
  const iouPercent = Math.round(iou * 100);
  const baseMatch =
    student.base.w === target.base.w &&
    student.base.h === target.base.h &&
    student.base.d === target.base.d;

  const passed = baseMatch && iou >= 0.975;

  const feedbackItems: PartFeedbackItem[] = [];

  // 1. Check base dimensions
  if (baseMatch) {
    feedbackItems.push({
      partName: 'Kích thước bao ngoài (Phôi gốc)',
      status: 'correct',
      detail: `Đúng kích thước Rộng ${w} × Cao ${h} × Sâu ${d} đơn vị.`,
    });
  } else {
    feedbackItems.push({
      partName: 'Kích thước bao ngoài (Phôi gốc)',
      status: 'partial',
      detail: `Phôi hiện tại là ${student.base.w}×${student.base.h}×${student.base.d}, trong khi bản vẽ 2D yêu cầu ${w}×${h}×${d}.`,
    });
  }

  // 2. Analyze target features against active student features
  const activeStudent = student.features.filter((f) => f.enabled);
  const activeTarget = target.features.filter((f) => f.enabled);
  const matchedStudentIds = new Set<string>();

  for (const tf of activeTarget) {
    const matchRes = findBestFeatureMatch(tf, activeStudent);
    if (matchRes.matchedId) {
      matchedStudentIds.add(matchRes.matchedId);
    }
    feedbackItems.push(matchRes.feedback);
  }

  // 3. Check for extra unneeded features added by student (when not passed)
  if (!passed) {
    for (const sf of activeStudent) {
      if (!matchedStudentIds.has(sf.id)) {
        feedbackItems.push({
          partName: describeFeatureShort(sf),
          status: 'extra',
          detail: `Chi tiết "${describeFeatureShort(sf)}" không khớp với nét vẽ nào trên bản vẽ 2D mẫu (hoặc bị thừa/sai loại).`,
        });
      }
    }
  }

  let summaryMessage = '';
  if (passed) {
    summaryMessage =
      'Chính xác tuyệt đối! Mô hình 3D bạn dựng khớp hoàn toàn với cả 3 hình chiếu vuông góc.';
  } else if (iou >= 0.85) {
    summaryMessage = `Rất gần đúng (${iouPercent}%). Hãy kiểm tra lại vị trí hoặc kích thước của một vài nét khoét còn lệch.`;
  } else if (iou >= 0.6) {
    summaryMessage = `Đã đúng phần khung cơ bản (${iouPercent}%). Cần đối chiếu kỹ nét liền đậm và nét đứt mảnh để hoàn thiện chi tiết bên trong.`;
  } else {
    summaryMessage = `Mô hình hiện tại mới đạt ${iouPercent}% độ trùng khớp. Hãy quan sát lại tương quan giữa Hình chiếu đứng, bằng và cạnh hoặc xem Gợi ý.`;
  }

  return {
    passed,
    iouPercent,
    matchPercent: iouPercent,
    feedbackItems,
    summaryMessage,
  };
}

function describeFeatureShort(f: FeatureOp): string {
  switch (f.type) {
    case 'step_cut':
      return f.label || 'Cắt bậc tạo dáng';
    case 'slot':
      return f.label || (f.axis === 'x' ? 'Rãnh ngang (trục X)' : 'Rãnh dọc (trục Z)');
    case 't_slot':
      return f.label || 'Rãnh chữ T';
    case 'hole_rect':
      return f.label || 'Lỗ khoét chữ nhật';
    case 'hole_cyl':
      return f.label || 'Lỗ trụ tròn';
    case 'chamfer':
      return f.label || 'Mặt vát nghiêng';
  }
}

function findBestFeatureMatch(
  tf: FeatureOp,
  studentFeatures: FeatureOp[],
): { matchedId: string | null; feedback: PartFeedbackItem } {
  const name = describeFeatureShort(tf);

  if (tf.type === 'step_cut') {
    const cands = studentFeatures.filter((s): s is StepCutOp => s.type === 'step_cut');
    const sameCorner = cands.find((c) => c.corner === tf.corner);
    if (!sameCorner) {
      return {
        matchedId: null,
        feedback: {
          partName: name,
          status: 'missing',
          detail: `Chưa có phần cắt bậc ở góc ${translateCorner(tf.corner)} (rộng ${tf.width}, cao ${tf.height}).`,
        },
      };
    }
    const dw = Math.abs(sameCorner.width - tf.width);
    const dh = Math.abs(sameCorner.height - tf.height);
    if (dw <= 0.15 && dh <= 0.15) {
      return {
        matchedId: sameCorner.id,
        feedback: {
          partName: name,
          status: 'correct',
          detail: `Đã cắt đúng bậc góc ${translateCorner(tf.corner)} (${tf.width} × ${tf.height}).`,
        },
      };
    }
    return {
      matchedId: sameCorner.id,
      feedback: {
        partName: name,
        status: 'partial',
        detail: `Đúng hướng bậc góc ${translateCorner(tf.corner)}, nhưng kích thước đang là ${sameCorner.width}×${sameCorner.height} (cần ${tf.width}×${tf.height}).`,
      },
    };
  }

  if (tf.type === 'slot') {
    const cands = studentFeatures.filter((s): s is SlotOp => s.type === 'slot');
    const sameAxis = cands.find((c) => c.axis === tf.axis && c.face === tf.face);
    if (!sameAxis) {
      return {
        matchedId: null,
        feedback: {
          partName: name,
          status: 'missing',
          detail: `Thiếu rãnh chạy dọc trục ${tf.axis.toUpperCase()} trên mặt ${tf.face === 'top' ? 'trên' : 'dưới'}.`,
        },
      };
    }
    const dc = Math.abs(sameAxis.center - tf.center);
    const dw = Math.abs(sameAxis.width - tf.width);
    const dd = Math.abs(sameAxis.depth - tf.depth);
    const s0Diff = Math.abs((sameAxis.spanStart ?? 0) - (tf.spanStart ?? 0));
    const s1Diff = Math.abs((sameAxis.spanEnd ?? 6) - (tf.spanEnd ?? 6));
    if (dc <= 0.15 && dw <= 0.15 && dd <= 0.15 && s0Diff <= 0.25 && s1Diff <= 0.25) {
      return {
        matchedId: sameAxis.id,
        feedback: {
          partName: name,
          status: 'correct',
          detail: `Đúng vị trí tâm (${tf.center}), bề rộng (${tf.width}) và chiều sâu (${tf.depth}).`,
        },
      };
    }
    return {
      matchedId: sameAxis.id,
      feedback: {
        partName: name,
        status: 'partial',
        detail: `Đúng hướng rãnh trên mặt ${tf.face === 'top' ? 'trên' : 'dưới'}, nhưng cần chỉnh lại tâm (${tf.center}), rộng (${tf.width}) hoặc độ sâu (${tf.depth}).`,
      },
    };
  }

  if (tf.type === 't_slot') {
    const cands = studentFeatures.filter((s): s is TSlotOp => s.type === 't_slot');
    const sameAxis = cands.find((c) => c.axis === tf.axis);
    if (!sameAxis) {
      return {
        matchedId: null,
        feedback: {
          partName: name,
          status: 'missing',
          detail: `Thiếu rãnh chữ T chạy dọc trục ${tf.axis.toUpperCase()} (nhận biết qua miệng hẹp nét liền và bụng rộng nét đứt trên Hình chiếu bằng).`,
        },
      };
    }
    const ok =
      Math.abs(sameAxis.center - tf.center) <= 0.15 &&
      Math.abs(sameAxis.neckWidth - tf.neckWidth) <= 0.15 &&
      Math.abs(sameAxis.headWidth - tf.headWidth) <= 0.15 &&
      Math.abs(sameAxis.neckDepth - tf.neckDepth) <= 0.15 &&
      Math.abs(sameAxis.headDepth - tf.headDepth) <= 0.15;
    if (ok) {
      return {
        matchedId: sameAxis.id,
        feedback: {
          partName: name,
          status: 'correct',
          detail: `Đúng rãnh chữ T (cổ rộng ${tf.neckWidth}, bụng rộng ${tf.headWidth}).`,
        },
      };
    }
    return {
      matchedId: sameAxis.id,
      feedback: {
        partName: name,
        status: 'partial',
        detail: `Đã có rãnh chữ T trục ${tf.axis.toUpperCase()}, hãy cân chỉnh lại bề rộng cổ (${tf.neckWidth}), bụng (${tf.headWidth}) và chiều sâu.`,
      },
    };
  }

  if (tf.type === 'hole_cyl') {
    const cands = studentFeatures.filter((s): s is HoleCylOp => s.type === 'hole_cyl');
    const sameAxis = cands.find((c) => c.axis === tf.axis);
    if (!sameAxis) {
      const hasRect = studentFeatures.some((s) => s.type === 'hole_rect' && s.axis === tf.axis);
      return {
        matchedId: null,
        feedback: {
          partName: name,
          status: 'missing',
          detail: hasRect
            ? `Bạn đang dùng lỗ chữ nhật, nhưng bản vẽ có đường tròn + đường tâm vuông góc nên đây là lỗ trụ tròn xuyên trục ${tf.axis.toUpperCase()}.`
            : `Thiếu lỗ trụ tròn xuyên theo trục ${tf.axis.toUpperCase()} (tâm ${tf.uCenter}, ${tf.vCenter}, bán kính ${tf.radius}).`,
        },
      };
    }
    const ok =
      Math.abs(sameAxis.uCenter - tf.uCenter) <= 0.15 &&
      Math.abs(sameAxis.vCenter - tf.vCenter) <= 0.15 &&
      Math.abs(sameAxis.radius - tf.radius) <= 0.15;
    if (ok) {
      return {
        matchedId: sameAxis.id,
        feedback: {
          partName: name,
          status: 'correct',
          detail: `Đúng lỗ trụ tròn xuyên trục ${tf.axis.toUpperCase()} với bán kính R=${tf.radius}.`,
        },
      };
    }
    return {
      matchedId: sameAxis.id,
      feedback: {
        partName: name,
        status: 'partial',
        detail: `Đúng lỗ trụ trục ${tf.axis.toUpperCase()}, cần chỉnh tọa độ tâm (${tf.uCenter}, ${tf.vCenter}) hoặc bán kính R=${tf.radius}.`,
      },
    };
  }

  if (tf.type === 'hole_rect') {
    const cands = studentFeatures.filter((s): s is HoleRectOp => s.type === 'hole_rect');
    const sameAxis = cands.find((c) => c.axis === tf.axis);
    if (!sameAxis) {
      return {
        matchedId: null,
        feedback: {
          partName: name,
          status: 'missing',
          detail: `Thiếu lỗ khoét chữ nhật xuyên theo trục ${tf.axis.toUpperCase()} (tạo nét khuất trên hình chiếu vuông góc).`,
        },
      };
    }
    const ok =
      Math.abs(sameAxis.uCenter - tf.uCenter) <= 0.15 &&
      Math.abs(sameAxis.vCenter - tf.vCenter) <= 0.15 &&
      Math.abs(sameAxis.uSize - tf.uSize) <= 0.15 &&
      Math.abs(sameAxis.vSize - tf.vSize) <= 0.15;
    if (ok) {
      return {
        matchedId: sameAxis.id,
        feedback: {
          partName: name,
          status: 'correct',
          detail: `Đúng lỗ khoét chữ nhật ${tf.uSize}×${tf.vSize} xuyên trục ${tf.axis.toUpperCase()}.`,
        },
      };
    }
    return {
      matchedId: sameAxis.id,
      feedback: {
        partName: name,
        status: 'partial',
        detail: `Đúng hướng lỗ trục ${tf.axis.toUpperCase()}, hãy kiểm tra lại tâm (${tf.uCenter}, ${tf.vCenter}) và kích thước (${tf.uSize}×${tf.vSize}).`,
      },
    };
  }

  // Chamfer
  const cands = studentFeatures.filter((s): s is ChamferOp => s.type === 'chamfer');
  const sameEdge = cands.find((c) => c.edge === tf.edge);
  if (!sameEdge) {
    return {
      matchedId: null,
      feedback: {
        partName: name,
        status: 'missing',
        detail: `Thiếu mặt vát nghiêng ở cạnh ${translateCorner(tf.edge)}.`,
      },
    };
  }
  if (Math.abs(sameEdge.run - tf.run) <= 0.15 && Math.abs(sameEdge.drop - tf.drop) <= 0.15) {
    return {
      matchedId: sameEdge.id,
      feedback: {
        partName: name,
        status: 'correct',
        detail: `Đúng mặt vát nghiêng cạnh ${translateCorner(tf.edge)} (ngang ${tf.run}, cao ${tf.drop}).`,
      },
    };
  }
  return {
    matchedId: sameEdge.id,
    feedback: {
      partName: name,
      status: 'partial',
      detail: `Đúng cạnh vát ${translateCorner(tf.edge)}, hãy chỉnh lại độ vát ngang (${tf.run}) và chiều cao vát (${tf.drop}).`,
    },
  };
}

function translateCorner(c: string): string {
  switch (c) {
    case 'top-right':
      return 'Trên - Phải';
    case 'top-left':
      return 'Trên - Trái';
    case 'top-front':
      return 'Trên - Trước';
    case 'top-back':
      return 'Trên - Sau';
    default:
      return c;
  }
}
