import React from 'react';
import { Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Drawing2DData, ViewProjection2D } from '../engine/projection2d';
import { HintHighlightBox, View2DKey } from '../types/cad';

interface Drawing2DPanelProps {
  drawing: Drawing2DData;
  base: { w: number; h: number; d: number };
  showHiddenLines: boolean;
  onToggleHiddenLines: () => void;
  showCenterLines: boolean;
  onToggleCenterLines: () => void;
  hiddenView: View2DKey | null;
  onChangeHiddenView: (v: View2DKey | null) => void;
  activeHighlights: HintHighlightBox[];
}

const SCALE = 38; // px per unit
const GAP_X = 68;
const GAP_Y = 68;
const PAD_L = 44;
const PAD_T = 40;
const PAD_R = 44;
const PAD_B = 44;

export const Drawing2DPanel: React.FC<Drawing2DPanelProps> = ({
  drawing,
  base,
  showHiddenLines,
  onToggleHiddenLines,
  showCenterLines,
  onToggleCenterLines,
  hiddenView,
  onChangeHiddenView,
  activeHighlights,
}) => {
  const wPx = base.w * SCALE;
  const hPx = base.h * SCALE;
  const dPx = base.d * SCALE;

  // First-angle layout positions (top-left origin of each view box)
  const frontOrigin = { x: PAD_L, y: PAD_T };
  const topOrigin = { x: PAD_L, y: PAD_T + hPx + GAP_Y };
  const leftOrigin = { x: PAD_L + wPx + GAP_X, y: PAD_T };

  // Miter intersection point (corner between Front/Top and Front/Left projection axes)
  const miterX = PAD_L + wPx + GAP_X / 2;
  const miterY = PAD_T + hPx + GAP_Y / 2;
  const miterSize = Math.max(dPx, hPx) + GAP_Y / 2 + 12;

  const svgWidth = PAD_L + wPx + GAP_X + dPx + PAD_R;
  const svgHeight = PAD_T + hPx + GAP_Y + dPx + PAD_B;

  const renderView = (
    proj: ViewProjection2D,
    origin: { x: number; y: number },
    label: string,
    subLabel: string,
    viewKey: View2DKey,
  ) => {
    const boxW = proj.width * SCALE;
    const boxH = proj.height * SCALE;
    const isHidden = hiddenView === viewKey;

    // Map math (u, v) where v=0 is bottom and v=height is top -> SVG coords
    const toSvgX = (u: number) => origin.x + u * SCALE;
    const toSvgY = (v: number) => origin.y + (proj.height - v) * SCALE;

    const viewHighlights = activeHighlights.filter((h) => h.view === viewKey);

    return (
      <g key={viewKey}>
        {/* View title */}
        <text
          x={origin.x}
          y={origin.y - 16}
          className="fill-slate-800 text-[12px] font-semibold"
        >
          {label}
        </text>
        <text
          x={origin.x + boxW}
          y={origin.y - 16}
          textAnchor="end"
          className="fill-slate-400 text-[10.5px] font-mono"
        >
          {subLabel}
        </text>

        {/* Unit Grid inside view */}
        <rect
          x={origin.x}
          y={origin.y}
          width={boxW}
          height={boxH}
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth={1}
        />

        {/* Sub-grid (0.5 unit) + Major grid (1 unit) */}
        {Array.from({ length: Math.round(proj.width * 2) + 1 }).map((_, idx) => {
          const val = idx * 0.5;
          const x = origin.x + val * SCALE;
          const isMajor = idx % 2 === 0;
          return (
            <g key={`gx-${idx}`}>
              <line
                x1={x}
                y1={origin.y}
                x2={x}
                y2={origin.y + boxH}
                stroke={isMajor ? '#e2e8f0' : '#f1f5f9'}
                strokeWidth={isMajor ? 1 : 0.7}
              />
              {isMajor && (
                <text
                  x={x}
                  y={origin.y + boxH + 13}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9.5px] font-mono"
                >
                  {val}
                </text>
              )}
            </g>
          );
        })}

        {Array.from({ length: Math.round(proj.height * 2) + 1 }).map((_, idx) => {
          const val = idx * 0.5;
          const y = origin.y + (proj.height - val) * SCALE;
          const isMajor = idx % 2 === 0;
          const tickVal = viewKey === 'top' ? proj.height - val : val;
          return (
            <g key={`gy-${idx}`}>
              <line
                x1={origin.x}
                y1={y}
                x2={origin.x + boxW}
                y2={y}
                stroke={isMajor ? '#e2e8f0' : '#f1f5f9'}
                strokeWidth={isMajor ? 1 : 0.7}
              />
              {isMajor && (
                <text
                  x={origin.x - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[9.5px] font-mono"
                >
                  {tickVal}
                </text>
              )}
            </g>
          );
        })}

        {isHidden ? (
          <g
            onClick={() => onChangeHiddenView(null)}
            className="cursor-pointer"
          >
            <rect
              x={origin.x}
              y={origin.y}
              width={boxW}
              height={boxH}
              fill="#f1f5f9"
              stroke="#94a3b8"
              strokeWidth={1.2}
              strokeDasharray="5 4"
            />
            <text
              x={origin.x + boxW / 2}
              y={origin.y + boxH / 2 - 6}
              textAnchor="middle"
              className="fill-slate-600 text-[12px] font-semibold"
            >
              Đang ẩn để thử thách suy luận
            </text>
            <text
              x={origin.x + boxW / 2}
              y={origin.y + boxH / 2 + 14}
              textAnchor="middle"
              className="fill-blue-600 text-[11px] font-medium"
            >
              Bấm vào đây để hiện lại hình chiếu
            </text>
          </g>
        ) : (
          <g>
            {/* 1. Centerlines (Đường tâm / đường trục) */}
            {showCenterLines &&
              proj.centerLines.map((seg, i) => (
                <line
                  key={`c-${i}`}
                  x1={toSvgX(seg.u0)}
                  y1={toSvgY(seg.v0)}
                  x2={toSvgX(seg.u1)}
                  y2={toSvgY(seg.v1)}
                  stroke="#dc2626"
                  strokeWidth={1.15}
                  strokeDasharray="10 3 2 3"
                  strokeLinecap="butt"
                />
              ))}

            {/* 2. Hidden lines (Nét đứt mảnh) */}
            {showHiddenLines &&
              proj.hiddenLines.map((seg, i) => (
                <line
                  key={`h-${i}`}
                  x1={toSvgX(seg.u0)}
                  y1={toSvgY(seg.v0)}
                  x2={toSvgX(seg.u1)}
                  y2={toSvgY(seg.v1)}
                  stroke="#2563eb"
                  strokeWidth={1.55}
                  strokeDasharray="6 4"
                  strokeLinecap="butt"
                />
              ))}

            {showHiddenLines &&
              proj.circles
                .filter((c) => c.style === 'hidden')
                .map((c, i) => (
                  <circle
                    key={`ch-${i}`}
                    cx={toSvgX(c.cu)}
                    cy={toSvgY(c.cv)}
                    r={c.r * SCALE}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={1.55}
                    strokeDasharray="6 4"
                  />
                ))}

            {/* 3. Visible lines (Nét liền đậm) */}
            {proj.visibleLines.map((seg, i) => (
              <line
                key={`v-${i}`}
                x1={toSvgX(seg.u0)}
                y1={toSvgY(seg.v0)}
                x2={toSvgX(seg.u1)}
                y2={toSvgY(seg.v1)}
                stroke="#0f172a"
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            ))}

            {proj.circles
              .filter((c) => c.style === 'visible')
              .map((c, i) => (
                <circle
                  key={`cv-${i}`}
                  cx={toSvgX(c.cu)}
                  cy={toSvgY(c.cv)}
                  r={c.r * SCALE}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth={2.6}
                />
              ))}

            {/* Hint highlights */}
            {viewHighlights.map((hl, i) => {
              const rx = toSvgX(Math.min(hl.u0, hl.u1));
              const ry = toSvgY(Math.max(hl.v0, hl.v1));
              const rw = Math.max(10, Math.abs(hl.u1 - hl.u0) * SCALE);
              const rh = Math.max(10, Math.abs(hl.v1 - hl.v0) * SCALE);
              return (
                <g key={`hl-${i}`}>
                  <rect
                    x={rx - 3}
                    y={ry - 3}
                    width={rw + 6}
                    height={rh + 6}
                    rx={4}
                    fill="#f59e0b"
                    fillOpacity={0.14}
                    stroke="#d97706"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                  <rect
                    x={rx - 3}
                    y={ry - 21}
                    width={Math.min(200, hl.caption.length * 6.2 + 14)}
                    height={16}
                    rx={3}
                    fill="#b45309"
                  />
                  <text
                    x={rx + 4}
                    y={ry - 10}
                    className="fill-white text-[9.5px] font-medium"
                  >
                    {hl.caption}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </g>
    );
  };

  return (
    <section className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Bản vẽ 2D — 3 Hình chiếu vuông góc
          </h2>
          <p className="text-xs text-slate-500">
            Góc chiếu thứ nhất (TCVN) · Mỗi ô lưới = 1 đơn vị
          </p>
        </div>

        {/* Toggle controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleHiddenLines}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showHiddenLines
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showHiddenLines ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Nét khuất</span>
          </button>

          <button
            type="button"
            onClick={onToggleCenterLines}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showCenterLines
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showCenterLines ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Đường tâm/trục</span>
          </button>

          <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              aria-label="Ẩn 1 hình chiếu để thử thách suy luận"
              value={hiddenView ?? ''}
              onChange={(e) =>
                onChangeHiddenView((e.target.value || null) as View2DKey | null)
              }
              className="px-2 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Hiện cả 3 hình chiếu</option>
              <option value="left">Ẩn Hình chiếu cạnh (Thử thách)</option>
              <option value="top">Ẩn Hình chiếu bằng (Thử thách)</option>
              <option value="front">Ẩn Hình chiếu đứng (Thử thách)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drafting Sheet SVG */}
      <div className="relative bg-white p-3 flex items-center justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[540px] h-auto select-none"
          role="img"
          aria-label="Bản vẽ kỹ thuật 3 hình chiếu vuông góc: Hình chiếu đứng, Hình chiếu bằng, Hình chiếu cạnh"
        >
          {/* Projection alignment guidelines (Đường dóng tương quan) */}
          <g stroke="#94a3b8" strokeWidth={0.85} strokeDasharray="3 3" opacity={0.7}>
            {/* Vertical alignment Front <-> Top */}
            <line
              x1={frontOrigin.x}
              y1={frontOrigin.y + hPx}
              x2={topOrigin.x}
              y2={topOrigin.y}
            />
            <line
              x1={frontOrigin.x + wPx}
              y1={frontOrigin.y + hPx}
              x2={topOrigin.x + wPx}
              y2={topOrigin.y}
            />

            {/* Horizontal alignment Front <-> Left */}
            <line
              x1={frontOrigin.x + wPx}
              y1={frontOrigin.y}
              x2={leftOrigin.x}
              y2={leftOrigin.y}
            />
            <line
              x1={frontOrigin.x + wPx}
              y1={frontOrigin.y + hPx}
              x2={leftOrigin.x}
              y2={leftOrigin.y + hPx}
            />

            {/* 45-degree miter line & Z-reflection guidelines between Top and Left */}
            <line
              x1={miterX - miterSize * 0.15}
              y1={miterY - miterSize * 0.15}
              x2={miterX + dPx + GAP_X * 0.55}
              y2={miterY + dPx + GAP_Y * 0.55}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="6 3"
            />
            {/* Back Z=0 reflection */}
            <polyline
              fill="none"
              points={`${topOrigin.x + wPx},${topOrigin.y} ${leftOrigin.x},${topOrigin.y} ${leftOrigin.x},${leftOrigin.y + hPx}`}
            />
            {/* Front Z=D reflection */}
            <polyline
              fill="none"
              points={`${topOrigin.x + wPx},${topOrigin.y + dPx} ${leftOrigin.x + dPx},${topOrigin.y + dPx} ${leftOrigin.x + dPx},${leftOrigin.y + hPx}`}
            />
          </g>

          {/* Axes labels on miter intersection */}
          <text
            x={leftOrigin.x + dPx + 8}
            y={topOrigin.y + dPx + 24}
            className="fill-slate-400 text-[10px] font-mono"
          >
            45°
          </text>

          {/* 3 Orthographic Views */}
          {renderView(
            drawing.front,
            frontOrigin,
            'Hình chiếu đứng',
            `X:${base.w} · Y:${base.h}`,
            'front',
          )}
          {renderView(
            drawing.top,
            topOrigin,
            'Hình chiếu bằng',
            `X:${base.w} · Z:${base.d}`,
            'top',
          )}
          {renderView(
            drawing.left,
            leftOrigin,
            'Hình chiếu cạnh',
            `Z:${base.d} · Y:${base.h}`,
            'left',
          )}
        </svg>
      </div>

      {/* Line-type Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="26" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="25" y2="4" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            <span>Nét liền đậm (Cạnh thấy)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="26" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="25" y2="4" stroke="#2563eb" strokeWidth="1.6" strokeDasharray="5 3" />
            </svg>
            <span>Nét đứt mảnh (Cạnh khuất)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="28" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="27" y2="4" stroke="#dc2626" strokeWidth="1.2" strokeDasharray="8 2 2 2" />
            </svg>
            <span>Đường tâm / trục</span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Nhìn từ trước (+Z) · trên (+Y) · trái (-X)
        </span>
      </div>
    </section>
  );
};
