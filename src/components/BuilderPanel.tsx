import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lightbulb,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Axis3D,
  ChamferEdge,
  Exercise,
  FeatureOp,
  GradingResult,
  PartSpec,
  StepCorner,
} from '../types/cad';

interface BuilderPanelProps {
  spec: PartSpec;
  onChangeSpec: (next: PartSpec) => void;
  exercise: Exercise;
  activeHintIndex: number | null;
  onRequestHint: () => void;
  onClearHint: () => void;
  onCheckResult: () => void;
  onResetWork: () => void;
  gradingResult: GradingResult | null;
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`;
}

interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
}

const NumberStepper: React.FC<NumberStepperProps> = ({
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
}) => {
  const clamp = (v: number) =>
    Math.round(Math.max(min, Math.min(max, v)) * 10) / 10;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px] text-slate-600">
        <span>{label}</span>
        <span className="font-mono font-semibold text-slate-900 tabular-nums">
          {value}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer shrink-0"
          aria-label={`Giảm ${label}`}
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer h-1.5"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer shrink-0"
          aria-label={`Tăng ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
};

export const BuilderPanel: React.FC<BuilderPanelProps> = ({
  spec,
  onChangeSpec,
  exercise,
  activeHintIndex,
  onRequestHint,
  onClearHint,
  onCheckResult,
  onResetWork,
  gradingResult,
}) => {
  const { w, h, d } = spec.base;

  const addFeature = (type: FeatureOp['type']) => {
    let newFeat: FeatureOp;
    if (type === 'step_cut') {
      newFeat = {
        id: makeId('step'),
        type: 'step_cut',
        enabled: true,
        corner: 'top-right',
        width: 2,
        height: 2,
      };
    } else if (type === 'slot') {
      newFeat = {
        id: makeId('slot'),
        type: 'slot',
        enabled: true,
        axis: 'x',
        face: 'top',
        center: 2,
        width: 2,
        depth: 1,
      };
    } else if (type === 't_slot') {
      newFeat = {
        id: makeId('tslot'),
        type: 't_slot',
        enabled: true,
        axis: 'z',
        center: 3,
        neckWidth: 1,
        neckDepth: 1,
        headWidth: 2,
        headDepth: 1,
      };
    } else if (type === 'hole_cyl') {
      newFeat = {
        id: makeId('cyl'),
        type: 'hole_cyl',
        enabled: true,
        axis: 'y',
        uCenter: 3,
        vCenter: 2,
        radius: 1,
      };
    } else if (type === 'hole_rect') {
      newFeat = {
        id: makeId('hrect'),
        type: 'hole_rect',
        enabled: true,
        axis: 'z',
        uCenter: 3,
        vCenter: 1.5,
        uSize: 2,
        vSize: 1,
      };
    } else {
      newFeat = {
        id: makeId('chamfer'),
        type: 'chamfer',
        enabled: true,
        edge: 'top-right',
        run: 3,
        drop: 3,
      };
    }

    onChangeSpec({
      ...spec,
      features: [...spec.features, newFeat],
    });
  };

  const updateFeature = (id: string, patch: Partial<FeatureOp>) => {
    onChangeSpec({
      ...spec,
      features: spec.features.map((f) =>
        f.id === id ? ({ ...f, ...patch } as FeatureOp) : f,
      ),
    });
  };

  const removeFeature = (id: string) => {
    onChangeSpec({
      ...spec,
      features: spec.features.filter((f) => f.id !== id),
    });
  };

  const featureTitle = (f: FeatureOp) => {
    switch (f.type) {
      case 'step_cut':
        return 'Cắt bậc khối';
      case 'slot':
        return 'Khoét rãnh chữ nhật';
      case 't_slot':
        return 'Khoét rãnh chữ T';
      case 'hole_cyl':
        return 'Khoét lỗ trụ tròn';
      case 'hole_rect':
        return 'Khoét lỗ chữ nhật';
      case 'chamfer':
        return 'Vát mặt nghiêng';
    }
  };

  const activeHint =
    activeHintIndex !== null ? exercise.hints[activeHintIndex] ?? null : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Main Interactive Construction Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
        {/* Header & Base Dimensions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Lắp ghép & Gia công khối 3D
            </h3>
            <p className="text-xs text-slate-500">
              Phôi gốc: Rộng {w} × Cao {h} × Sâu {d} · Thêm các thao tác cắt/khoét tương ứng bản vẽ
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
            <label className="flex items-center gap-1">
              <span>Rộng:</span>
              <select
                value={w}
                onChange={(e) =>
                  onChangeSpec({
                    ...spec,
                    base: { ...spec.base, w: Number(e.target.value) },
                  })
                }
                className="px-1.5 py-1 border border-slate-200 rounded bg-slate-50 text-slate-800 cursor-pointer"
              >
                {[4, 5, 6, 7, 8].map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span>Cao:</span>
              <select
                value={h}
                onChange={(e) =>
                  onChangeSpec({
                    ...spec,
                    base: { ...spec.base, h: Number(e.target.value) },
                  })
                }
                className="px-1.5 py-1 border border-slate-200 rounded bg-slate-50 text-slate-800 cursor-pointer"
              >
                {[3, 4, 5, 6].map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span>Sâu:</span>
              <select
                value={d}
                onChange={(e) =>
                  onChangeSpec({
                    ...spec,
                    base: { ...spec.base, d: Number(e.target.value) },
                  })
                }
                className="px-1.5 py-1 border border-slate-200 rounded bg-slate-50 text-slate-800 cursor-pointer"
              >
                {[3, 4, 5, 6].map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Add Feature Palette */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { type: 'step_cut', label: 'Cắt bậc' },
              { type: 'slot', label: 'Rãnh chữ nhật' },
              { type: 't_slot', label: 'Rãnh chữ T' },
              { type: 'hole_cyl', label: 'Lỗ trụ tròn' },
              { type: 'hole_rect', label: 'Lỗ chữ nhật' },
              { type: 'chamfer', label: 'Mặt vát nghiêng' },
            ] as { type: FeatureOp['type']; label: string }[]
          ).map((btn) => (
            <button
              key={btn.type}
              type="button"
              onClick={() => addFeature(btn.type)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Active Features List */}
        {spec.features.length === 0 ? (
          <div className="py-5 px-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 text-xs text-slate-500">
            Đang là khối hộp chữ nhật nguyên ({w} × {h} × {d}). Chọn các thao tác phía trên để cắt bậc, khoét rãnh, tạo lỗ hoặc vát mặt nghiêng.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto thin-scrollbar pr-1">
            {spec.features.map((feat, idx) => (
              <div
                key={feat.id}
                className={`p-3 rounded-lg border transition-colors ${
                  feat.enabled
                    ? 'bg-slate-50/80 border-slate-200'
                    : 'bg-slate-50/30 border-slate-100 opacity-60'
                }`}
              >
                {/* Feature Header */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {featureTitle(feat)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateFeature(feat.id, { enabled: !feat.enabled })
                      }
                      title={feat.enabled ? 'Tạm ẩn chi tiết' : 'Bật lại chi tiết'}
                      className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60 cursor-pointer"
                    >
                      {feat.enabled ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFeature(feat.id)}
                      title="Xóa chi tiết"
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Feature Parameters */}
                {feat.type === 'step_cut' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-600">Vị trí góc cắt</span>
                      <select
                        value={feat.corner}
                        onChange={(e) =>
                          updateFeature(feat.id, {
                            corner: e.target.value as StepCorner,
                          })
                        }
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 cursor-pointer"
                      >
                        <option value="top-right">Trên - Phải</option>
                        <option value="top-left">Trên - Trái</option>
                        <option value="top-front">Trên - Trước</option>
                        <option value="top-back">Trên - Sau</option>
                      </select>
                    </div>
                    <NumberStepper
                      label="Bề rộng cắt"
                      value={feat.width}
                      min={0.5}
                      max={
                        feat.corner === 'top-left' || feat.corner === 'top-right'
                          ? w - 0.5
                          : d - 0.5
                      }
                      onChange={(width) => updateFeature(feat.id, { width })}
                    />
                    <NumberStepper
                      label="Chiều cao cắt"
                      value={feat.height}
                      min={0.5}
                      max={h - 0.5}
                      onChange={(height) => updateFeature(feat.id, { height })}
                    />
                  </div>
                )}

                {feat.type === 'slot' && (
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-slate-600">Hướng rãnh</span>
                        <select
                          value={feat.axis}
                          onChange={(e) => {
                            const nextAxis = e.target.value as 'x' | 'z';
                            updateFeature(feat.id, {
                              axis: nextAxis,
                              center: nextAxis === 'x' ? d / 2 : w / 2,
                              spanStart: undefined,
                              spanEnd: undefined,
                            });
                          }}
                          className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 cursor-pointer"
                        >
                          <option value="x">Ngang (trục X)</option>
                          <option value="z">Dọc (trục Z)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-slate-600">Mặt khoét</span>
                        <select
                          value={feat.face}
                          onChange={(e) =>
                            updateFeature(feat.id, {
                              face: e.target.value as 'top' | 'bottom',
                            })
                          }
                          className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 cursor-pointer"
                        >
                          <option value="top">Mặt trên</option>
                          <option value="bottom">Mặt đáy</option>
                        </select>
                      </div>
                      <NumberStepper
                        label={feat.axis === 'x' ? 'Tâm Z' : 'Tâm X'}
                        value={feat.center}
                        min={0.5}
                        max={(feat.axis === 'x' ? d : w) - 0.5}
                        onChange={(center) => updateFeature(feat.id, { center })}
                      />
                      <NumberStepper
                        label="Bề rộng"
                        value={feat.width}
                        min={0.5}
                        max={(feat.axis === 'x' ? d : w) - 0.5}
                        onChange={(width) => updateFeature(feat.id, { width })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <NumberStepper
                        label="Chiều sâu"
                        value={feat.depth}
                        min={0.5}
                        max={h - 0.5}
                        onChange={(depth) => updateFeature(feat.id, { depth })}
                      />
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              feat.spanStart !== undefined ||
                              feat.spanEnd !== undefined
                            }
                            onChange={(e) => {
                              const axisLen = feat.axis === 'x' ? w : d;
                              if (e.target.checked) {
                                updateFeature(feat.id, {
                                  spanStart: 0,
                                  spanEnd: axisLen / 2,
                                });
                              } else {
                                updateFeature(feat.id, {
                                  spanStart: undefined,
                                  spanEnd: undefined,
                                });
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 cursor-pointer"
                          />
                          <span>Giới hạn đoạn rãnh</span>
                        </label>
                        {(feat.spanStart !== undefined ||
                          feat.spanEnd !== undefined) && (
                          <div className="flex items-center gap-2 font-mono">
                            <span>Từ</span>
                            <input
                              type="number"
                              step={0.5}
                              min={0}
                              max={feat.axis === 'x' ? w - 0.5 : d - 0.5}
                              value={feat.spanStart ?? 0}
                              onChange={(e) =>
                                updateFeature(feat.id, {
                                  spanStart: Number(e.target.value),
                                })
                              }
                              className="w-12 px-1 py-0.5 border border-slate-200 rounded bg-white text-slate-800"
                            />
                            <span>đến</span>
                            <input
                              type="number"
                              step={0.5}
                              min={0.5}
                              max={feat.axis === 'x' ? w : d}
                              value={feat.spanEnd ?? (feat.axis === 'x' ? w : d)}
                              onChange={(e) =>
                                updateFeature(feat.id, {
                                  spanEnd: Number(e.target.value),
                                })
                              }
                              className="w-12 px-1 py-0.5 border border-slate-200 rounded bg-white text-slate-800"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {feat.type === 't_slot' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-600">Hướng rãnh T</span>
                      <select
                        value={feat.axis}
                        onChange={(e) => {
                          const nextAxis = e.target.value as 'x' | 'z';
                          updateFeature(feat.id, {
                            axis: nextAxis,
                            center: nextAxis === 'z' ? w / 2 : d / 2,
                          });
                        }}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 cursor-pointer"
                      >
                        <option value="z">Dọc (trục Z)</option>
                        <option value="x">Ngang (trục X)</option>
                      </select>
                    </div>
                    <NumberStepper
                      label={feat.axis === 'z' ? 'Tâm X' : 'Tâm Z'}
                      value={feat.center}
                      min={1}
                      max={(feat.axis === 'z' ? w : d) - 1}
                      onChange={(center) => updateFeature(feat.id, { center })}
                    />
                    <NumberStepper
                      label="Rộng cổ T"
                      value={feat.neckWidth}
                      min={0.5}
                      max={3}
                      onChange={(neckWidth) =>
                        updateFeature(feat.id, { neckWidth })
                      }
                    />
                    <NumberStepper
                      label="Sâu cổ T"
                      value={feat.neckDepth}
                      min={0.5}
                      max={2.5}
                      onChange={(neckDepth) =>
                        updateFeature(feat.id, { neckDepth })
                      }
                    />
                    <NumberStepper
                      label="Rộng bụng T"
                      value={feat.headWidth}
                      min={1}
                      max={4.5}
                      onChange={(headWidth) =>
                        updateFeature(feat.id, { headWidth })
                      }
                    />
                    <NumberStepper
                      label="Sâu bụng T"
                      value={feat.headDepth}
                      min={0.5}
                      max={2.5}
                      onChange={(headDepth) =>
                        updateFeature(feat.id, { headDepth })
                      }
                    />
                  </div>
                )}

                {feat.type === 'hole_cyl' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-600">Trục xuyên</span>
                      <select
                        value={feat.axis}
                        onChange={(e) => {
                          const ax = e.target.value as Axis3D;
                          updateFeature(feat.id, {
                            axis: ax,
                            uCenter: ax === 'x' ? d / 2 : w / 2,
                            vCenter: ax === 'y' ? d / 2 : h / 2,
                          });
                        }}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 cursor-pointer"
                      >
                        <option value="y">Đứng (trục Y)</option>
                        <option value="z">Trước-Sau (trục Z)</option>
                        <option value="x">Trái-Phải (trục X)</option>
                      </select>
                    </div>
                    <NumberStepper
                      label={feat.axis === 'x' ? 'Tâm Z' : 'Tâm X'}
                      value={feat.uCenter}
                      min={0.5}
                      max={(feat.axis === 'x' ? d : w) - 0.5}
                      onChange={(uCenter) => updateFeature(feat.id, { uCenter })}
                    />
                    <NumberStepper
                      label={feat.axis === 'y' ? 'Tâm Z' : 'Tâm Y'}
                      value={feat.vCenter}
                      min={0.5}
                      max={(feat.axis === 'y' ? d : h) - 0.5}
                      onChange={(vCenter) => updateFeature(feat.id, { vCenter })}
                    />
                    <NumberStepper
                      label="Bán kính R"
                      value={feat.radius}
                      min={0.5}
                      max={2}
                      onChange={(radius) => updateFeature(feat.id, { radius })}
                    />
                  </div>
                )}

                {feat.type === 'hole_rect' && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-600">Trục xuyên</span>
                      <select
                        value={feat.axis}
                        onChange={(e) => {
                          const ax = e.target.value as Axis3D;
                          updateFeature(feat.id, {
                            axis: ax,
                            uCenter: ax === 'x' ? d / 2 : w / 2,
                            vCenter: ax === 'y' ? d / 2 : h / 2,
                          });
                        }}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 cursor-pointer"
                      >
                        <option value="z">Trước-Sau (Z)</option>
                        <option value="y">Đứng (Y)</option>
                        <option value="x">Trái-Phải (X)</option>
                      </select>
                    </div>
                    <NumberStepper
                      label={feat.axis === 'x' ? 'Tâm Z' : 'Tâm X'}
                      value={feat.uCenter}
                      min={0.5}
                      max={(feat.axis === 'x' ? d : w) - 0.5}
                      onChange={(uCenter) => updateFeature(feat.id, { uCenter })}
                    />
                    <NumberStepper
                      label={feat.axis === 'y' ? 'Tâm Z' : 'Tâm Y'}
                      value={feat.vCenter}
                      min={0.5}
                      max={(feat.axis === 'y' ? d : h) - 0.5}
                      onChange={(vCenter) => updateFeature(feat.id, { vCenter })}
                    />
                    <NumberStepper
                      label="Rộng U"
                      value={feat.uSize}
                      min={0.5}
                      max={(feat.axis === 'x' ? d : w) - 0.5}
                      onChange={(uSize) => updateFeature(feat.id, { uSize })}
                    />
                    <NumberStepper
                      label="Cao/Sâu V"
                      value={feat.vSize}
                      min={0.5}
                      max={(feat.axis === 'y' ? d : h) - 0.5}
                      onChange={(vSize) => updateFeature(feat.id, { vSize })}
                    />
                  </div>
                )}

                {feat.type === 'chamfer' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-600">Cạnh vát</span>
                      <select
                        value={feat.edge}
                        onChange={(e) =>
                          updateFeature(feat.id, {
                            edge: e.target.value as ChamferEdge,
                          })
                        }
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 cursor-pointer"
                      >
                        <option value="top-right">Trên - Phải</option>
                        <option value="top-left">Trên - Trái</option>
                        <option value="top-front">Trên - Trước</option>
                        <option value="top-back">Trên - Sau</option>
                      </select>
                    </div>
                    <NumberStepper
                      label="Độ rộng vát"
                      value={feat.run}
                      min={0.5}
                      max={
                        feat.edge === 'top-left' || feat.edge === 'top-right'
                          ? w - 0.5
                          : d - 0.5
                      }
                      onChange={(run) => updateFeature(feat.id, { run })}
                    />
                    <NumberStepper
                      label="Chiều cao vát"
                      value={feat.drop}
                      min={0.5}
                      max={h - 0.5}
                      onChange={(drop) => updateFeature(feat.id, { drop })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRequestHint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4" />
              <span>
                {activeHintIndex === null
                  ? 'Gợi ý phân tích'
                  : `Gợi ý tiếp (${activeHintIndex + 1}/${exercise.hints.length})`}
              </span>
            </button>
            <button
              type="button"
              onClick={onResetWork}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onCheckResult}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Kiểm tra kết quả</span>
          </button>
        </div>
      </div>

      {/* Hint Card (when active) */}
      {activeHint && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-amber-900">
                  {activeHint.title}
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {activeHint.explanation}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearHint}
              className="text-xs text-amber-700 hover:text-amber-950 font-medium shrink-0 cursor-pointer"
            >
              Ẩn
            </button>
          </div>
        </div>
      )}

      {/* Pedagogical Grading Result Card */}
      {gradingResult && (
        <div
          className={`rounded-xl border p-4 ${
            gradingResult.passed
              ? 'bg-emerald-50/90 border-emerald-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
            <div className="flex items-center gap-2">
              {gradingResult.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <span
                className={`text-sm font-semibold ${
                  gradingResult.passed ? 'text-emerald-900' : 'text-slate-900'
                }`}
              >
                {gradingResult.passed
                  ? 'Chúc mừng! Bạn đã dựng đúng vật thể 3D'
                  : 'Phản hồi kiểm tra chi tiết'}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
              Độ trùng khớp hình học: {gradingResult.iouPercent}%
            </span>
          </div>

          <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">
            {gradingResult.summaryMessage}
          </p>

          {/* Breakdown by part */}
          <ul className="mt-3 flex flex-col gap-1.5">
            {gradingResult.feedbackItems.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-700 bg-white/80 border border-slate-200/70 rounded-lg px-2.5 py-2"
              >
                {item.status === 'correct' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {item.status === 'partial' && (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                {(item.status === 'missing' || item.status === 'extra') && (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-slate-900">
                    {item.partName}:{' '}
                  </span>
                  <span>{item.detail}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* Completion Summary of 2D <-> 3D Relationship */}
          {gradingResult.passed && (
            <div className="mt-3 pt-3 border-t border-emerald-200/80 text-xs text-emerald-900">
              <p className="font-semibold mb-1">
                Giải thích mối liên hệ 3 hình chiếu và khối 3D:
              </p>
              <p className="leading-relaxed text-emerald-800">
                {exercise.completionExplanation}
              </p>
              <ul className="mt-2 space-y-1 text-emerald-800 list-disc list-inside">
                {exercise.projectionRelations.map((rel, i) => (
                  <li key={i}>{rel}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
