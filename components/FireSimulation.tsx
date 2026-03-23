"use client";
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box } from "@mui/material";
import { useGLTF, Float } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";

function FireParticles({ position = [0, -1, 0], scale = 1 }) {
  const mesh = useRef<THREE.Points>(null);
  const count = 250;

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const life = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      resetParticle(i, positions, velocities, life);
      life[i] = Math.random();
    }
    return { positions, velocities, life };
  }, [count]);

  function resetParticle(i: number, pos: Float32Array, vel: Float32Array, life: Float32Array) {
    pos[i * 3] = (Math.random() - 0.5) * 0.4;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    vel[i * 3] = (Math.random() - 0.5) * 0.005;
    vel[i * 3 + 1] = Math.random() * 0.03 + 0.01;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    life[i] = 0;
  }

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const pos = mesh.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += particles.velocities[i * 3];
      pos[i * 3 + 1] += particles.velocities[i * 3 + 1];
      pos[i * 3 + 2] += particles.velocities[i * 3 + 2];
      particles.life[i] += delta * 0.8;
      if (particles.life[i] > 1.0) {
        resetParticle(i, pos, particles.velocities, particles.life);
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh} position={position as any} scale={scale}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
          args={[particles.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.25} color={new THREE.Color("#ff6600")} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function SmokeParticles({ position = [0, 0, 0], scale = 1 }) {
  const mesh = useRef<THREE.Points>(null);
  const count = 150;

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const life = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      resetSmoke(i, positions, velocities, life);
      life[i] = Math.random();
    }
    return { positions, velocities, life };
  }, [count]);

  function resetSmoke(i: number, pos: Float32Array, vel: Float32Array, life: Float32Array) {
    pos[i * 3] = (Math.random() - 0.5) * 0.8;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    vel[i * 3] = (Math.random() - 0.5) * 0.01;
    vel[i * 3 + 1] = Math.random() * 0.02 + 0.01;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    life[i] = 0;
  }

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const pos = mesh.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += particles.velocities[i * 3];
      pos[i * 3 + 1] += particles.velocities[i * 3 + 1];
      pos[i * 3 + 2] += particles.velocities[i * 3 + 2];
      particles.life[i] += delta * 0.4;
      if (particles.life[i] > 1.0) {
        resetSmoke(i, pos, particles.velocities, particles.life);
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh} position={position as any} scale={scale}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
          args={[particles.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.6} color="#333" transparent opacity={0.2} depthWrite={false} blending={THREE.NormalBlending} />
    </points>
  );
}

function FlickerLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (lightRef.current) {
      const t = state.clock.elapsedTime;
      lightRef.current.intensity = 15 + Math.sin(t * 10) * 5 + Math.random() * 5;
      lightRef.current.position.x = Math.sin(t * 5) * 0.2;
    }
  });
  return <pointLight ref={lightRef} position={[0, -0.5, 1]} color="#ff4400" intensity={15} />;
}

function FireModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <primitive object={scene} scale={0.5} position={[0, -2, 0]} rotation={[0, Math.PI / 4, 0]} />
    </Float>
  );
}

useGLTF.preload("/model/base_basic_shaded.glb");

interface FireSimulationProps {
  active?: boolean;
}

// Sub-component to ensure R3F context is fully captured without race conditions
function SimulationContent() {
  return (
    <>
      <FlickerLight />
      <pointLight position={[0, 1, 0]} color="#ff9900" intensity={8} />
      <FireModel url="/model/base_basic_shaded.glb" />
      <FireParticles position={[0, -1.8, 0]} scale={3} />
      <FireParticles position={[0.3, -1.5, -0.4]} scale={1.8} />
      <FireParticles position={[-0.3, -1.5, 0.4]} scale={1.8} />
      <SmokeParticles position={[0, -1, 0]} scale={2} />
      <SmokeParticles position={[0.5, 0, -0.5]} scale={1.5} />
      
      <EffectComposer multisampling={4}>
        <Bloom intensity={1.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>
    </>
  );
}

export default function FireSimulation({ active = false }: FireSimulationProps) {
  // We completely unmount the Canvas content if not active to avoid postprocessing crashes
  return (
    <Box sx={{ 
        position: "absolute", 
        inset: 0, 
        pointerEvents: "none", 
        zIndex: 30, 
        opacity: active ? 1 : 0, 
        transition: "opacity 0.6s ease-in-out",
        visibility: active ? "visible" : "hidden"
    }}>
      <Canvas 
        camera={{ position: [0, 0, 4], fov: 45 }} 
        gl={{ alpha: true, antialias: false, stencil: false, depth: true }} 
        style={{ pointerEvents: "none" }}
      >
        <ambientLight intensity={2} />
        {active && <SimulationContent />}
      </Canvas>
    </Box>
  );
}
