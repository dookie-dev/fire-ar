"use client";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box, CircularProgress, Typography } from "@mui/material";

interface ARViewerProps {
  mindData: Uint8Array;
  targetCount: number;
  onDetected?: () => void;
  onLost?: () => void;
}

declare global {
  interface Window {
    MINDAR: any;
  }
}

export default function ARViewer({
  mindData,
  targetCount,
  onDetected,
  onLost,
}: ARViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [detectedIndices, setDetectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDetected = detectedIndices.size > 0;

  useEffect(() => {
    let ignore = false; // 🚨 Fix React StrictMode double-mount race condition
    let mindarThree: any = null;
    let disposeFunc: (() => void) | null = null;
    let motionFrameId: number;
    let motionTimeout: NodeJS.Timeout;

    // Create a shared state object for the render loop to access
    const state = { forceVisible: false };

    const startAR = async () => {
      try {
        setLoading(true);
        // Wait for Dialog transition to finish
        await new Promise((r) => setTimeout(r, 600));
        if (ignore) return; // Prevent start if unmounted during delay

        // Dynamic script loading for MindAR 1.1.4 (Stable Version)
        if (
          typeof window !== "undefined" &&
          (!window.MINDAR ||
            !window.MINDAR.IMAGE ||
            !window.MINDAR.IMAGE.MindARThree)
        ) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src =
              "https://cdn.jsdelivr.net/npm/mind-ar@1.1.4/dist/mindar-image-three.prod.js"; // 🛠️ Stable 1.1.4
            script.onload = () => {
              setTimeout(resolve, 500); // ⏱️ Give time for global namespace
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        if (ignore) return;

        if (!window.MINDAR?.IMAGE?.MindARThree) {
          throw new Error(
            "AR Engine (MINDAR.IMAGE.MindARThree) not found in global scope.",
          );
        }

        const { MindARThree } = window.MINDAR.IMAGE;

        // Convert Uint8Array to a loadable URL for MindAR
        const blob = new Blob([mindData as any], {
          type: "application/octet-stream",
        });
        const mindUrl = URL.createObjectURL(blob);

        mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: mindUrl,
          filterMinCF: 0.0001, // 📉 Keep sensitivity (compat with 1.1.4)
          filterBeta: 0.001, // 📊 Keep smoothing
          missTolerance: 5,
          uiLoading: "no",
          uiScanning: "no",
        });

        const { renderer, scene, camera } = mindarThree;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // 🏎️ Optimize for mobile GPU

        // 💡 ADD LIGHTS (CRITICAL: Boosted for PBR visibility)
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
        scene.add(ambientLight);
        const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        sunLight.position.set(2, 5, 2);
        scene.add(sunLight);

        const createParticleTexture = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 32;
          canvas.height = 32;
          const context = canvas.getContext("2d");
          if (context) {
            const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
            gradient.addColorStop(0, "rgba(255,255,255,1)");
            gradient.addColorStop(0.2, "rgba(255,200,0,1)");
            gradient.addColorStop(0.4, "rgba(255,50,0,0.8)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            context.fillStyle = gradient;
            context.fillRect(0, 0, 32, 32);
          }
          return new THREE.CanvasTexture(canvas);
        };
        const fireTex = createParticleTexture();

        // Setup Multiple Anchors
        const anchors: any[] = [];
        const fireSystems: any[] = [];

        for (let i = 0; i < targetCount; i++) {
          const anchor = mindarThree.addAnchor(i);

          // 🌀 PULSING TRACKING RING (per anchor)
          const ringGeo = new THREE.RingGeometry(0.5, 0.55, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          anchor.group.add(ring);

          // 🔥 FIRE EFFECT (Low-Poly 3D Meshes for Guaranteed Visibility)
          const flameGroup = new THREE.Group();
          const flameGeo = new THREE.IcosahedronGeometry(0.5, 1);
          const smokeGeo = new THREE.IcosahedronGeometry(0.5, 0);

          const fireColors = [0xffaa00, 0xff4400, 0xff0000, 0xffff00];
          const fireMats = fireColors.map(c => new THREE.MeshBasicMaterial({ 
            color: c, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false 
          }));
          const smokeMat = new THREE.MeshBasicMaterial({ 
            color: 0x222222, transparent: true, opacity: 0.4, depthWrite: false 
          });

          const particles: any[] = [];
          
          for (let j = 0; j < 30; j++) {
             const isSmoke = j > 18;
             const mesh = new THREE.Mesh(isSmoke ? smokeGeo : flameGeo, isSmoke ? smokeMat : fireMats[j % fireMats.length]);
             mesh.position.set((Math.random() - 0.5) * 0.4, Math.random() * 0.5, (Math.random() - 0.5) * 0.4);
             mesh.scale.setScalar(0.2 + Math.random() * 0.4);
             mesh.userData = {
               speed: (isSmoke ? 0.3 : 1.0) + Math.random() * 1.0,
               phase: Math.random() * Math.PI * 2,
               baseScale: mesh.scale.x,
               yOffset: mesh.position.y,
               isSmoke: isSmoke
             };
             flameGroup.add(mesh);
             particles.push(mesh);
          }
          
          flameGroup.position.y = 0.3; // Lift above base model
          flameGroup.scale.setScalar(1.5); // Increase overall size
          anchor.group.add(flameGroup);

          // 🔥 FIRE GLOW
          const fireLight = new THREE.PointLight(0xffaa00, 2, 1);
          fireLight.position.y = 0.5;
          anchor.group.add(fireLight);

          // 🟩 CALIBRATION BOX
          const boxGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
          const boxMat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.1,
          });
          const calibBox = new THREE.Mesh(boxGeo, boxMat);
          anchor.group.add(calibBox);

          anchor.onTargetFound = () => {
            console.log("🔥 ARViewer: Target Found! Locking to screen immediately.");
            state.forceVisible = true; // 🚨 THIS FIXES IT: Lock the fire/house to the screen!
            setDetectedIndices(new Set([i, 999])); // Use dummy index 999 to ensure stability
            onDetected?.();
          };
          anchor.onTargetLost = () => {
            // When forceVisible is true, we never care if the marker is lost!
            if (!state.forceVisible) {
              setDetectedIndices((prev) => {
                const next = new Set(prev);
                next.delete(i);
                return next;
              });
            }
          };

          anchors.push(anchor);
          fireSystems.push({ flameGroup, particles, ring, ringMat });
        }

        // 📦 PRE-LOAD GLB MODEL (Wait before starting AR)
        const loadModel = () =>
          new Promise<THREE.Group>((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(
              "/model/base_basic_shaded.glb",
              (gltf: any) => resolve(gltf.scene),
              undefined,
              (err: unknown) => {
                console.warn("⚠️ Fallback: GLB Load failed, using box.", err);
                const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
                const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                const group = new THREE.Group();
                group.add(new THREE.Mesh(geo, mat));
                resolve(group);
              },
            );
          });

        const originalModel = await loadModel();

        // Ensure model is visible (emissive)
        originalModel.traverse((node: any) => {
          if (node.isMesh) {
            node.material.emissiveIntensity = 0.5; // 💡 Ensure it's not pitch black
            node.castShadow = true;
          }
        });
        const box = new THREE.Box3().setFromObject(originalModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.0 / (maxDim || 0.1); // 📏 Prevent zero scale
        const center = box.getCenter(new THREE.Vector3());

        anchors.forEach((anchor) => {
          const instance = originalModel.clone();
          instance.scale.setScalar(scale);
          instance.position.x = -center.x * scale;
          instance.position.z = -center.z * scale;
          instance.position.y = -0.3; // Sink house slightly so fire is centered
          anchor.group.add(instance);
        });

        // 🏃‍♂️ STANDALONE MOTION GROUP (For when motion triggers instead of Marker)
        const motionGroup = new THREE.Group();
        const motionInstance = originalModel.clone();
        motionInstance.scale.setScalar(scale * 1.5);
        motionInstance.position.x = -center.x * scale;
        motionInstance.position.z = -center.z * scale;
        motionInstance.position.y = -0.8;
        motionGroup.add(motionInstance);

        // Clone the flame group for the motion model
        const fire2 = fireSystems[0].flameGroup.clone();
        fire2.position.y = 0.2;
        fire2.scale.setScalar(4.0);
        motionGroup.add(fire2);
        
        // Map cloned objects to the animation loop
        fire2.children.forEach((c: any) => {
           fireSystems[0].particles.push(c);
        });

        motionGroup.visible = false;
        motionGroup.userData.isMotionGroup = true; // 🏷️ FIX: Specifically tag this group!
        scene.add(motionGroup);

        // 🗑️ DISPOSAL UTILITY (CRITICAL for Stability)
        // MUST be assigned BEFORE start() so unmount can abort properly
        const disposeResources = () => {
          console.log("♻️ [ARViewer] Disposing AR resources...");
          if (mindUrl) URL.revokeObjectURL(mindUrl);
          if (renderer) renderer.dispose();

          scene.traverse((object: any) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((m: any) => m.dispose());
              } else {
                object.material.dispose();
              }
            }
          });

          if (mindarThree) {
            try {
              mindarThree.stop();
              if (mindarThree.renderer) {
                mindarThree.renderer.setAnimationLoop(null);
              }
            } catch (e) {
              // Ignore stop errors if engine wasn't fully started
            }
          }
        };

        disposeFunc = disposeResources;

        // Wait for Engine
        await mindarThree.start();
        if (ignore) {
          disposeFunc(); // Use the complete disposal
          return;
        }

        // 🔍 ENABLE AUTO-FOCUS & FIX VIDEO LAYOUT
        if (containerRef.current) {
          const video = containerRef.current.querySelector("video");
          if (video && video.srcObject) {
            Object.assign(video.style, {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
            });

            // 📸 Attempt to force continuous focus on supported devices
            try {
              const stream = video.srcObject as MediaStream;
              const [track] = stream.getVideoTracks();
              const capabilities = track.getCapabilities() as any;
              if (
                capabilities.focusMode &&
                capabilities.focusMode.includes("continuous")
              ) {
                await track.applyConstraints({
                  advanced: [{ focusMode: "continuous" }],
                } as any);
                console.log("✅ Continuous focus enabled.");
              }
            } catch (fErr) {
              console.warn("⚠️ Continuous focus not supported or denied.");
            }
          }
          const canvas = containerRef.current.querySelector("canvas");
          if (canvas) {
            Object.assign(canvas.style, {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 2,
            });
          }
        }

        renderer.setAnimationLoop(() => {
          const delta = Date.now() * 0.005;

          fireSystems.forEach((sys, i) => {
            const anchor = anchors[i];
            
            // 🏎️ CULLING: Skip only if BOTH marker tracking is lost AND motion isn't triggered
            const isMarkerActive = anchor && anchor.group.visible;
            if (!isMarkerActive && !state.forceVisible) return; 

            // Pulse Ring
            sys.ring.scale.setScalar(1 + Math.sin(delta) * 0.1);
            sys.ringMat.opacity = 0.4 + Math.sin(delta * 0.6) * 0.2;

            // Animate Fire Meshes
            sys.particles.forEach((mesh: any) => {
               mesh.position.y += 0.015 * mesh.userData.speed;
               const life = (mesh.position.y - mesh.userData.yOffset) / (mesh.userData.isSmoke ? 2.5 : 1.5);
               mesh.scale.setScalar(mesh.userData.baseScale * Math.max(0.01, 1 - life));
               
               if (life > 1.0) {
                 mesh.position.y = mesh.userData.yOffset;
                 mesh.position.x = (Math.random() - 0.5) * 0.4;
                 mesh.position.z = (Math.random() - 0.5) * 0.4;
               }
               const twist = delta * mesh.userData.speed + mesh.userData.phase;
               mesh.rotation.x += 0.05;
               mesh.rotation.y += 0.05;
               mesh.position.x += Math.sin(twist) * 0.005;
               mesh.position.z += Math.cos(twist) * 0.005;
            });
          });

          if (state.forceVisible) {
            const motionGroup = scene.children.find(
              (c: any) => c.userData.isMotionGroup,
            );
            if (motionGroup) {
              motionGroup.visible = true;
              
              // 🚨 FOOLPROOF CAMERA LOCK 🚨
              // Regardless of how MindAR overrides coordinates, we force the model to perfectly mimic the camera!
              motionGroup.position.copy(camera.position);
              motionGroup.quaternion.copy(camera.quaternion);
              motionGroup.translateZ(-3); // Push exactly 3 units into the screen
              motionGroup.translateY(-0.5); // Move down slightly
              
              const now = Date.now();
              // Make it bob up and down slightly for a neat AR floating effect
              motionGroup.position.y += Math.sin(now * 0.002) * 0.05;
              motionGroup.rotateY(now * 0.0005); // Spin the house/fire slowly
            }
          }

          renderer.render(scene, camera);
        });

        setLoading(false);

        // 🏃‍♂️ START MOTION DETECTION LOOP
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        let confirmHits = 0;
        let prevFrame: Uint8ClampedArray | null = null;

        const checkMotion = () => {
          if (state.forceVisible) return; // Stop checking if already triggered
          
          const scheduleNext = () => {
             motionFrameId = requestAnimationFrame(checkMotion);
          };

          const video = containerRef.current?.querySelector("video");
          if (!video || !ctx || video.readyState < 2) {
             scheduleNext();
             return;
          }

          try {
            canvas.width = 160;
            canvas.height = 120;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            if (prevFrame) {
              let diff = 0;
              for (let i = 0; i < data.length; i += 4) {
                const avg1 = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const avg2 =
                  (prevFrame[i] + prevFrame[i + 1] + prevFrame[i + 2]) / 3;
                diff += Math.abs(avg1 - avg2);
              }
              const normalizedDiff = diff / (canvas.width * canvas.height);

              // 5.0 is a sturdy threshold for a hand wave across the camera
              if (normalizedDiff > 5.0) {
                confirmHits += 1;
                if (confirmHits > 2) { // Just 2 hits of strong motion is enough
                  console.log("🔥 ARViewer: Motion detected! Triggering UI...");
                  state.forceVisible = true;
                  onDetected?.();
                  setDetectedIndices(new Set([999])); // Use dummy index to keep UI active
                  return; // End loop!
                }
              } else {
                confirmHits = Math.max(0, confirmHits - 1); // Gradually decrement to avoid noise build-up
              }
            }
            prevFrame = new Uint8ClampedArray(data);
          } catch (e) {
            // Ignore tainted canvas or drawing errors
          }
          
          scheduleNext();
        };

        motionTimeout = setTimeout(checkMotion, 3000); // Wait 3s for camera to stabilize

      } catch (err: any) {
        console.error("AR Error:", err);
        setError("Failed to initialize AR engine.");
        setLoading(false);
      }
    };

    startAR();

    return () => {
      ignore = true;
      console.log("🛑 Unmounting ARViewer: Calling disposeFunc");
      if (motionTimeout) clearTimeout(motionTimeout);
      if (motionFrameId) cancelAnimationFrame(motionFrameId);
      if (disposeFunc) disposeFunc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindData, targetCount]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#000",
        overflow: "hidden",
        borderRadius: 4,
        border: "2px solid rgba(0, 255, 255, 0.3)",
        boxShadow: "0 0 30px rgba(0, 255, 255, 0.2)",
      }}
    >
      {/* Status HUD */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        {Array.from({ length: targetCount }).map((_, idx) => (
          <Typography
            key={idx}
            sx={{
              color: detectedIndices.has(idx) ? "#00ff00" : "cyan",
              fontSize: "10px",
              fontWeight: 900,
              textShadow: "0 0 10px rgba(0,255,255,0.5)",
            }}
          >
            {detectedIndices.has(idx)
              ? `● TARGET ${idx + 1} LOCKED`
              : `● TARGET ${idx + 1} SEEKING...`}
          </Typography>
        ))}
        <Typography
          sx={{ color: "rgba(255,255,255,0.5)", fontSize: "8px", mt: 1 }}
        >
          AR ENGINE V1.1.4 | MULTI-CHANNEL OPS
        </Typography>
      </Box>

      {/* Permission Tip */}
      <Typography
        sx={{
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.3)",
          fontSize: "10px",
          zIndex: 5,
        }}
      >
        Tip: Allow camera access in browser settings for best experience
      </Typography>

      {loading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            zIndex: 10,
          }}
        >
          <CircularProgress sx={{ color: "cyan" }} />
          <Typography
            sx={{
              color: "cyan",
              fontWeight: 800,
              fontSize: "10px",
              letterSpacing: 2,
            }}
          >
            INITIALIZING NEURAL TRACKER...
          </Typography>
        </Box>
      )}
      {error && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 3,
            zIndex: 10,
          }}
        >
          <Typography
            sx={{ color: "#ef4444", fontWeight: 800, textAlign: "center" }}
          >
            {error}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
