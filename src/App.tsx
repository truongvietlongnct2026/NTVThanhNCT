import { useMemo, useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { EXERCISES } from './data/exercises';
import { buildSolidFromSpec } from './engine/geometryBuilder';
import { projectSolidTo2D } from './engine/projection2d';
import { gradeStudentModel } from './engine/grader';
import { Drawing2DPanel } from './components/Drawing2DPanel';
import { Viewport3D, ViewMode3D } from './components/Viewport3D';
import { BuilderPanel } from './components/BuilderPanel';
import { QuickGuideModal } from './components/QuickGuideModal';
import {
  DifficultyLevel,
  GradingResult,
  PartSpec,
  View2DKey,
} from './types/cad';

type DifficultyFilter = 'Tất cả' | DifficultyLevel;

const DEFAULT_SPEC: PartSpec = {
  base: { w: 6, h: 4, d: 4 },
  features: [],
};

function cloneSpec(s: PartSpec): PartSpec {
  return {
    base: { ...s.base },
    features: s.features.map((f) => ({ ...f })),
  };
}

export default function App() {
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>('Tất cả');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    EXERCISES[0].id,
  );

  // Per-exercise student construction drafts
  const [drafts, setDrafts] = useState<Record<string, PartSpec>>({});
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);

  // 2D drawing visibility controls
  const [showHiddenLines, setShowHiddenLines] = useState<boolean>(true);
  const [showCenterLines, setShowCenterLines] = useState<boolean>(true);
  const [hiddenView, setHiddenView] = useState<View2DKey | null>(null);

  // 3D viewport state
  const [viewMode, setViewMode] = useState<ViewMode3D>('solid');
  const [showCompare, setShowCompare] = useState<boolean>(false);

  // Pedagogical hint & grading state
  const [activeHintIndex, setActiveHintIndex] = useState<number | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(
    null,
  );
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  const filteredExercises = useMemo(() => {
    if (difficultyFilter === 'Tất cả') return EXERCISES;
    return EXERCISES.filter((ex) => ex.difficulty === difficultyFilter);
  }, [difficultyFilter]);

  const currentExercise = useMemo(() => {
    return (
      EXERCISES.find((ex) => ex.id === selectedExerciseId) || EXERCISES[0]
    );
  }, [selectedExerciseId]);

  const studentSpec: PartSpec = useMemo(() => {
    return drafts[currentExercise.id] ?? cloneSpec(DEFAULT_SPEC);
  }, [drafts, currentExercise.id]);

  // Build exact target CSG solid and exact 2D orthographic projections
  const { targetSolid, drawing2D } = useMemo(() => {
    const solid = buildSolidFromSpec(currentExercise.target);
    const drawing = projectSolidTo2D(currentExercise.target, solid);
    return { targetSolid: solid, drawing2D: drawing };
  }, [currentExercise]);

  // Build student CSG solid for real-time 3D viewport
  const studentSolid = useMemo(() => {
    return buildSolidFromSpec(studentSpec);
  }, [studentSpec]);

  const handleSelectFilter = (level: DifficultyFilter) => {
    setDifficultyFilter(level);
    const matching =
      level === 'Tất cả'
        ? EXERCISES
        : EXERCISES.filter((ex) => ex.difficulty === level);
    if (
      matching.length > 0 &&
      !matching.some((ex) => ex.id === selectedExerciseId)
    ) {
      handleSelectExercise(matching[0].id);
    }
  };

  const handleSelectExercise = (id: string) => {
    setSelectedExerciseId(id);
    setActiveHintIndex(null);
    setGradingResult(null);
    setShowCompare(false);
    setHiddenView(null);
  };

  const handleUpdateSpec = (next: PartSpec) => {
    setDrafts((prev) => ({
      ...prev,
      [currentExercise.id]: next,
    }));
    if (gradingResult) {
      setGradingResult(null);
    }
  };

  const handleResetWork = () => {
    setDrafts((prev) => ({
      ...prev,
      [currentExercise.id]: cloneSpec(DEFAULT_SPEC),
    }));
    setGradingResult(null);
    setActiveHintIndex(null);
    setShowCompare(false);
  };

  const handleRequestHint = () => {
    const total = currentExercise.hints.length;
    if (total === 0) return;
    if (activeHintIndex === null) {
      setActiveHintIndex(0);
    } else {
      setActiveHintIndex((activeHintIndex + 1) % total);
    }
  };

  const handleCheckResult = () => {
    const result = gradeStudentModel(studentSpec, currentExercise.target);
    setGradingResult(result);

    if (result.passed && !completedIds.includes(currentExercise.id)) {
      const pointsEarned =
        currentExercise.difficulty === 'Cơ bản'
          ? 10
          : currentExercise.difficulty === 'Khá'
            ? 15
            : 20;
      setCompletedIds((prev) => [...prev, currentExercise.id]);
      setScore((s) => s + pointsEarned);
    }
  };

  const activeHighlights =
    activeHintIndex !== null
      ? currentExercise.hints[activeHintIndex]?.highlights ?? []
      : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
              Phòng luyện Đọc bản vẽ 2D – Dựng khối 3D
            </h1>
          </div>

          {/* Zone 2: Difficulty Filter + Exercise Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200"
              role="group"
              aria-label="Lọc độ khó bài tập"
            >
              {(['Tất cả', 'Cơ bản', 'Khá', 'Nâng cao'] as DifficultyFilter[]).map(
                (lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleSelectFilter(lvl)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      difficultyFilter === lvl
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl}
                  </button>
                ),
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {filteredExercises.map((ex) => {
                const isActive = ex.id === currentExercise.id;
                const isDone = completedIds.includes(ex.id);
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleSelectExercise(ex.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isDone
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isDone && <Check className="w-3 h-3 shrink-0" />}
                    <span>Bài {ex.number}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zone 3: Score Counter + Quick Guide */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
              <span>
                Điểm:{' '}
                <strong className="text-slate-900 font-semibold">{score}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                Hoàn thành:{' '}
                <strong className="text-slate-900 font-semibold">
                  {completedIds.length}/{EXERCISES.length}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Hướng dẫn nhanh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Exercise Context + 2D Technical Drawing */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-700">
                    Bài {currentExercise.number}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Mức độ: {currentExercise.difficulty}</span>
                  {completedIds.includes(currentExercise.id) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 font-medium">
                        Đã hoàn thành
                      </span>
                    </>
                  )}
                </div>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  Khối chuẩn {currentExercise.target.base.w}×
                  {currentExercise.target.base.h}×
                  {currentExercise.target.base.d}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 mt-1">
                {currentExercise.title}
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {currentExercise.summary}
              </p>
            </div>

            <Drawing2DPanel
              drawing={drawing2D}
              base={currentExercise.target.base}
              showHiddenLines={showHiddenLines}
              onToggleHiddenLines={() => setShowHiddenLines((v) => !v)}
              showCenterLines={showCenterLines}
              onToggleCenterLines={() => setShowCenterLines((v) => !v)}
              hiddenView={hiddenView}
              onChangeHiddenView={setHiddenView}
              activeHighlights={activeHighlights}
            />
          </div>

          {/* Right Column: Interactive 3D Viewport + Student Assembly Controls */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <Viewport3D
              studentSolid={studentSolid}
              targetSolid={targetSolid}
              base={studentSpec.base}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              showCompare={showCompare}
              onToggleCompare={() => setShowCompare((v) => !v)}
            />

            <BuilderPanel
              spec={studentSpec}
              onChangeSpec={handleUpdateSpec}
              exercise={currentExercise}
              activeHintIndex={activeHintIndex}
              onRequestHint={handleRequestHint}
              onClearHint={() => setActiveHintIndex(null)}
              onCheckResult={handleCheckResult}
              onResetWork={handleResetWork}
              gradingResult={gradingResult}
            />
          </div>
        </div>
      </main>

      <QuickGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
