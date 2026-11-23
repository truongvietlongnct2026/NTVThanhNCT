import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Box, Eye, GitCompare, RotateCcw } from 'lucide-react';
import { CSGSolid } from '../engine/csg';
import { solidToThreeGeometry } from '../engine/geometryBuilder';

export type ViewMode3D = 'solid' | 'xray';
export type CameraPreset = 'iso' | 'front' | 'top' | 'left';

interface Viewport3DProps {
  studentSolid: CSGSolid;
  targetSolid: CSGSolid;
  base: { w: number; h: number; d: number };
  viewMode: ViewMode3D;
  onChangeViewMode: (m: ViewMode3D) => void;
  showCompare: boolean;
  onToggleCompare: () => void;
}

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _targetUp = new THREE.Vector3();

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const testCanvas = document.createElement('canvas');
    const gl =
      testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
      gpu,
    );
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  studentSolid,
  targetSolid,
  base,
  viewMode,
  onChangeViewMode,
  showCompare,
  onToggleCompare,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPreset | null>('iso');

  const sceneRefs = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    studentGroup: THREE.Group;
    targetGroup: THREE.Group;
    isSoftwareGl: boolean;
    requestRender: () => void;
    transitionTo: (preset: CameraPreset) => void;
  } | null>(null);

  // Initialize Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const probe = detectSoftwareWebGL();
    if (!probe.supported) {
      setWebglError(
        'Trình duyệt hoặc thiết bị hiện tại không hỗ trợ WebGL để hiển thị không gian 3D.',
      );
      return;
    }

    const isSoftwareGl = probe.isSoftwareGl;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('Không thể khởi tạo ngữ cảnh đồ họa WebGL.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 260);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    scene.fog = new THREE.Fog(0xf1f5f9, 24, 52);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 120);
    camera.position.set(8.8, 6.8, 9.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.5;
    controls.maxDistance = 28;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, base.h / 2, 0);
    controls.update();

    // 3-point balanced studio lighting
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xcbd5e1, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.55);
    keyLight.position.set(9, 14, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 36;
    const dShadow = 8;
    keyLight.shadow.camera.left = -dShadow;
    keyLight.shadow.camera.right = dShadow;
    keyLight.shadow.camera.top = dShadow;
    keyLight.shadow.camera.bottom = -dShadow;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.65);
    rimLight.position.set(-10, 6, -9);
    scene.add(rimLight);

    // Drafting studio table plane + grid + contact shadow
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.92,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(16, 16, 0x94a3b8, 0xcbd5e1);
    grid.position.y = -0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.65;
    scene.add(grid);

    // Subtle axis triads on floor corner so students orient X (Đỏ), Y (Lục), Z (Lam)
    const axes = new THREE.AxesHelper(2.2);
    axes.position.set(-base.w / 2 - 0.6, 0.01, -base.d / 2 - 0.6);
    scene.add(axes);

    const studentGroup = new THREE.Group();
    const targetGroup = new THREE.Group();
    scene.add(studentGroup);
    scene.add(targetGroup);

    // Pre-compile shaders if hardware WebGL
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Coalesced on-demand renderer + smooth camera damping
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let transitionActive = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        if (transitionActive) {
          if (isSoftwareGl) {
            camera.position.copy(_targetPos);
            controls.target.copy(_targetLook);
            camera.up.copy(_targetUp);
            transitionActive = false;
          } else {
            const lambda = 9;
            camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, lambda, delta);
            camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, lambda, delta);
            camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, lambda, delta);
            controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, lambda, delta);
            controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, lambda, delta);
            controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, lambda, delta);
            camera.up.lerp(_targetUp, 1 - Math.exp(-lambda * delta)).normalize();

            if (
              camera.position.distanceTo(_targetPos) < 0.02 &&
              controls.target.distanceTo(_targetLook) < 0.02
            ) {
              camera.position.copy(_targetPos);
              controls.target.copy(_targetLook);
              camera.up.copy(_targetUp);
              transitionActive = false;
            }
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (transitionActive || renderDirty) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    function transitionTo(preset: CameraPreset) {
      const centerY = base.h / 2;
      _targetLook.set(0, centerY, 0);
      if (preset === 'iso') {
        _targetPos.set(8.8, 6.8, 9.6);
        _targetUp.set(0, 1, 0);
      } else if (preset === 'front') {
        _targetPos.set(0, centerY, 13.5);
        _targetUp.set(0, 1, 0);
      } else if (preset === 'top') {
        _targetPos.set(0, centerY + 13.5, 0.001);
        _targetUp.set(0, 0, -1);
      } else {
        // left view (-X looking toward +X)
        _targetPos.set(-13.5, centerY, 0);
        _targetUp.set(0, 1, 0);
      }
      transitionActive = true;
      requestRender();
    }

    const onControlStart = () => {
      transitionActive = false;
      setActivePreset(null);
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('Kết nối đồ họa WebGL tạm thời bị gián đoạn.');
    };
    const onContextRestored = () => {
      setWebglError(null);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(entry.contentRect.width, 200);
      const h = Math.max(entry.contentRect.height, 200);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    sceneRefs.current = {
      renderer,
      scene,
      camera,
      controls,
      studentGroup,
      targetGroup,
      isSoftwareGl,
      requestRender,
      transitionTo,
    };

    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      envTex.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRefs.current = null;
    };
  }, [base.h, base.w, base.d]);

  // Update 3D geometry whenever studentSolid, targetSolid, viewMode, or showCompare changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    const clearGroup = (g: THREE.Group) => {
      while (g.children.length > 0) {
        const child = g.children[0];
        g.remove(child);
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      }
    };

    clearGroup(refs.studentGroup);
    clearGroup(refs.targetGroup);

    // 1. Build Student Mesh + Crease Edges
    const studentGeom = solidToThreeGeometry(studentSolid, base);
    const isXray = viewMode === 'xray';

    const studentMat = new THREE.MeshStandardMaterial({
      color: isXray ? 0x60a5fa : 0xdbeafe,
      roughness: isXray ? 0.3 : 0.42,
      metalness: isXray ? 0.05 : 0.14,
      transparent: isXray,
      opacity: isXray ? 0.24 : 1.0,
      depthWrite: !isXray,
      side: isXray ? THREE.DoubleSide : THREE.FrontSide,
    });
    const studentMesh = new THREE.Mesh(studentGeom.meshGeometry, studentMat);
    studentMesh.castShadow = !isXray;
    studentMesh.receiveShadow = !isXray;

    const edgeMat = new THREE.LineBasicMaterial({
      color: isXray ? 0x1d4ed8 : 0x0f172a,
      transparent: isXray,
      opacity: isXray ? 0.9 : 0.95,
    });
    const studentEdges = new THREE.LineSegments(studentGeom.edgeGeometry, edgeMat);

    refs.studentGroup.add(studentMesh);
    refs.studentGroup.add(studentEdges);

    // 2. Build Target Comparison Overlay if active
    if (showCompare) {
      const targetGeom = solidToThreeGeometry(targetSolid, base);
      const targetMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.35,
        metalness: 0.05,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const targetMesh = new THREE.Mesh(targetGeom.meshGeometry, targetMat);
      targetMesh.renderOrder = 2;

      const targetEdgeMat = new THREE.LineBasicMaterial({
        color: 0x047857,
        transparent: true,
        opacity: 0.9,
      });
      const targetEdges = new THREE.LineSegments(targetGeom.edgeGeometry, targetEdgeMat);
      targetEdges.renderOrder = 3;

      refs.targetGroup.add(targetMesh);
      refs.targetGroup.add(targetEdges);
    }

    refs.requestRender();
  }, [studentSolid, targetSolid, base, viewMode, showCompare]);

  const handlePreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    sceneRefs.current?.transitionTo(preset);
  };

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* 3D Viewport Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { key: 'iso', label: 'Góc chuẩn 3D' },
              { key: 'front', label: 'Chiếu Đứng' },
              { key: 'top', label: 'Chiếu Bằng' },
              { key: 'left', label: 'Chiếu Cạnh' },
            ] as { key: CameraPreset; label: string }[]
          ).map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => handlePreset(btn.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePreset === btn.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handlePreset('iso')}
            title="Đặt lại góc nhìn chuẩn"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        </div>

        {/* Display Mode & Compare */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center p-0.5 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeViewMode('solid')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'solid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Khối đặc</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('xray')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'xray'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xuyên thấu</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleCompare}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showCompare
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>So sánh mẫu</span>
          </button>
        </div>
      </div>

      {/* Canvas Container (Unobstructed Center) */}
      <div className="relative w-full h-[330px] sm:h-[360px] bg-slate-100">
        {webglError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
            <Box className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-800 mb-1">
              Không thể hiển thị khung 3D WebGL
            </p>
            <p className="text-xs text-slate-500 max-w-sm">{webglError}</p>
          </div>
        ) : (
          <div ref={mountRef} className="w-full h-full" />
        )}

        {/* Quiet corner interaction hint (never obscures object) */}
        {!webglError && (
          <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-slate-500">
            <span className="bg-white/90 px-2 py-0.5 rounded border border-slate-200/80">
              Kéo chuột để xoay · Cuộn để thu phóng
            </span>
            {showCompare && (
              <span className="bg-emerald-50/95 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                Khung xanh lục: Đáp án chuẩn
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
