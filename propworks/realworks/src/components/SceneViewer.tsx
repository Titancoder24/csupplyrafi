"use client";

/* eslint-disable react-hooks/immutability -- React Three Fiber mutates Three.js camera and texture objects in frame callbacks. */

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment, Html, useTexture } from "@react-three/drei";
import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Footprints, MousePointer2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Joystick } from 'react-joystick-component';
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface Annotation {
  id: string;
  label: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  description?: string | null;
  type?: string;
  targetSceneId?: string | null;
}

interface SceneViewerProps {
  sceneId: string;
  initialAnnotations: Annotation[];
  onAddAnnotation?: (pos: [number, number, number]) => void;
  isEditor?: boolean;
  imageUrl?: string | null;
}

export default function SceneViewer({ sceneId, initialAnnotations, onAddAnnotation, isEditor = false, imageUrl }: SceneViewerProps) {
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [walkMode, setWalkMode] = useState(false);
  const router = useRouter();
  void sceneId;

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    if (isEditor && onAddAnnotation) {
      e.stopPropagation();
      const pos = [e.point.x, e.point.y, e.point.z] as [number, number, number];
      onAddAnnotation(pos);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden group/viewer">
      {/* Mode Toggle Overlay */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 rounded-lg border border-border bg-white/90 p-1 shadow-lg backdrop-blur-md">
        <button 
          onClick={() => setWalkMode(false)}
          className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-[12.5px] font-bold transition-colors ${!walkMode ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'}`}
        >
          <MousePointer2 className="h-4 w-4" strokeWidth={1.75} /> Orbit
        </button>
        <button 
          onClick={() => setWalkMode(true)}
          className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-[12.5px] font-bold transition-colors ${walkMode ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'}`}
        >
          <Footprints className="h-4 w-4" strokeWidth={1.75} /> Walk
        </button>
      </div>

      {walkMode && (
        <>
          {/* Mobile Virtual Joystick */}
          <div className="absolute bottom-24 left-8 z-30 md:hidden opacity-80 hover:opacity-100 transition-opacity">
            <Joystick 
              size={100} 
              sticky={false} 
              baseColor="rgba(255,255,255,0.2)" 
              stickColor="rgba(255,255,255,0.8)" 
              move={(e) => {
                 moveState.joyX = (e.x || 0) / 50;
                 moveState.joyY = (e.y || 0) / 50;
              }} 
              stop={() => {
                 moveState.joyX = 0;
                 moveState.joyY = 0;
              }} 
            />
          </div>
        </>
      )}

      <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
        
        {/* Clickable Area & Image Texture */}
        <SceneBackground imageUrl={imageUrl} onAddAnnotation={handleClick} />

        {/* 360 Environment - Apartment Preset (Fallback if no image) */}
        {!imageUrl && <Environment preset="apartment" background />}

        {/* Annotations & Hotspots */}
        {initialAnnotations.map((ann) => (
          <Html 
            key={ann.id} 
            position={[ann.positionX, ann.positionY, ann.positionZ]}
            center
            zIndexRange={[100, 0]}
          >
            <div className="relative group">
              {ann.type === "hotspot" ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isEditor && ann.targetSceneId) {
                      // Navigate to the next scene
                      // In a real app this would change the viewer state, but for now we reload or change URL
                      router.push(`?sceneId=${ann.targetSceneId}`);
                    }
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-white bg-white/90 text-primary shadow-lg backdrop-blur-md transition-transform hover:scale-105"
                >
                  <Navigation className="h-5 w-5" strokeWidth={1.75} />
                </button>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveAnnotation(activeAnnotation === ann.id ? null : ann.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
                >
                  <MapPin className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}
              
              {/* Hotspot Label Tooltip (Hover) */}
              {ann.type === "hotspot" && (
                <div className="pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-white px-3 py-1.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                  <span className="text-[12px] font-semibold text-foreground">{ann.label}</span>
                </div>
              )}

              {/* Info Label Popover (Click) */}
              {activeAnnotation === ann.id && ann.type !== "hotspot" && (
                <div className="absolute left-1/2 top-11 z-50 w-56 -translate-x-1/2 rounded-lg border border-border bg-white p-3 shadow-xl">
                  <h4 className="mb-1 text-[13px] font-bold text-foreground">{ann.label}</h4>
                  {ann.description && <p className="text-[12px] leading-5 text-muted-foreground">{ann.description}</p>}
                </div>
              )}
            </div>
          </Html>
        ))}

        <PlayerControls walkMode={walkMode} />
      </Canvas>
    </div>
  );
}

// ----------------------
// Advanced 3D Mechanics (WASD + Mobile Joystick)
// ----------------------

const moveState = { forward: false, backward: false, left: false, right: false, joyX: 0, joyY: 0 };

function PlayerControls({ walkMode }: { walkMode: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!walkMode) return;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') moveState.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') moveState.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveState.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') moveState.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!walkMode) return;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') moveState.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') moveState.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveState.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') moveState.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [walkMode]);

  useFrame((_, delta) => {
    if (!walkMode || !controlsRef.current) return;
    
    const speed = 3.0 * delta; // walk speed
    const dir = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    camera.getWorldDirection(dir);
    dir.y = 0; // lock to horizontal plane
    dir.normalize();
    
    right.copy(dir).cross(camera.up).normalize();

    const moveVec = new THREE.Vector3();

    // Keyboard Input
    if (moveState.forward) moveVec.add(dir);
    if (moveState.backward) moveVec.sub(dir);
    if (moveState.right) moveVec.add(right);
    if (moveState.left) moveVec.sub(right);

    // Joystick Input
    if (moveState.joyY !== 0) moveVec.addScaledVector(dir, moveState.joyY);
    if (moveState.joyX !== 0) moveVec.addScaledVector(right, moveState.joyX);

    if (moveVec.lengthSq() > 0) {
      moveVec.normalize().multiplyScalar(speed);
      
      camera.position.add(moveVec);
      controlsRef.current.target.add(moveVec); // Must move target too for OrbitControls to walk
    }
    
    // COLLISION: Clamp Y coordinate to prevent falling below the splat floor
    if (camera.position.y < -0.5) {
      const diff = -0.5 - camera.position.y;
      camera.position.y = -0.5;
      controlsRef.current.target.y += diff;
    }
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault 
      enableZoom={walkMode ? false : true}
      enablePan={walkMode ? false : true}
      rotateSpeed={walkMode ? -0.5 : 0.5} // Invert rotation for 360 walk feel
    />
  );
}

function SceneBackground({ imageUrl, onAddAnnotation }: { imageUrl?: string | null, onAddAnnotation: (e: ThreeEvent<PointerEvent>) => void }) {
  const hasTexture = Boolean(imageUrl);
  const texture = useTexture(imageUrl || "/window.svg");
  texture.colorSpace = THREE.SRGBColorSpace;

  if (hasTexture) {
    const image = texture.image as { width?: number; height?: number } | undefined;
    const width = image?.width || 16;
    const height = image?.height || 9;
    const aspect = width / height;
    const planeHeight = 3.8;
    const planeWidth = planeHeight * aspect;

    return (
      <mesh onPointerUp={onAddAnnotation} position={[0, 0, -3]}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh onPointerUp={onAddAnnotation} scale={[-100, 100, 100]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial 
        color="black"
        transparent
        opacity={0.01}
        side={THREE.BackSide} 
      />
    </mesh>
  );
}
