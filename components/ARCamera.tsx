"use client";
import { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, IconButton, Tooltip } from "@mui/material";
import dynamic from "next/dynamic";
import RefreshIcon from "@mui/icons-material/Refresh";

const FireSimulation = dynamic(() => import("./FireSimulation"), { ssr: false });
const ARGameUI = dynamic(() => import("./ARGameUI"), { ssr: false });

interface ARCameraProps {
  isActive?: boolean;
  onStateChange?: (state: "idle" | "active") => void;
}

type ErrorType = "permission-denied" | "not-found" | "not-supported" | "unknown" | null;

const gridBg = `linear-gradient(0deg, transparent 24%, rgba(239,68,68,.1) 25%, rgba(239,68,68,.1) 26%, transparent 27%, transparent 74%, rgba(239,68,68,.1) 75%, rgba(239,68,68,.1) 76%, transparent 77%, transparent),
  linear-gradient(90deg, transparent 24%, rgba(239,68,68,.1) 25%, rgba(239,68,68,.1) 26%, transparent 27%, transparent 74%, rgba(239,68,68,.1) 75%, rgba(239,68,68,.1) 76%, transparent 77%, transparent)`;

const subtleGridBg = gridBg.replaceAll(".1)", ".05)");

const cornerMarkerSx = {
  position: "absolute",
  width: 32,
  height: 32,
  border: "2px solid rgba(239,68,68,0.6)",
  borderRadius: "2px",
} as const;

const glowPulseKeyframes = {
  "@keyframes glowPulse": {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.5 },
  },
};

const scanLineKeyframes = {
  "@keyframes scanLine": {
    "0%": { top: "0%", opacity: 0 },
    "50%": { opacity: 1 },
    "100%": { top: "100%", opacity: 0 },
  },
};

function getErrorMessage(error: ErrorType) {
  switch (error) {
    case "permission-denied":
      return {
        title: "Camera Access Denied",
        message: "Please grant camera permissions to continue. Check your browser settings.",
        hint: "Click the retry button or allow camera access when prompted.",
      };
    case "not-found":
      return {
        title: "No Camera Found",
        message: "No camera device was detected on this device.",
        hint: "Make sure your device has a camera and it's not in use by another application.",
      };
    case "not-supported":
      return {
        title: "Browser Not Supported",
        message: "Your browser doesn't support camera access.",
        hint: "Please use a modern browser like Chrome, Firefox, Safari, or Edge.",
      };
    case "unknown":
      return {
        title: "Camera Error",
        message: "An unexpected error occurred while accessing the camera.",
        hint: "Please try again or contact support if the problem persists.",
      };
    default:
      return null;
  }
}

export default function ARCamera({ isActive = false, onStateChange }: ARCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<ErrorType>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [fireActive, setFireActive] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const motionConfirmRef = useRef<number>(0);

  const activateCamera = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("not-supported");
        return;
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      
      setStream(newStream);
      setCameraReady(true);
      setIsScanning(true);
      setDemoMode(false);
      onStateChange?.("active");
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") setError("permission-denied");
      else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") setError("not-found");
      else if (err.name === "NotSupportedError") setError("not-supported");
      else setError("unknown");
      setIsScanning(false);
      setCameraReady(false);
      setStream(null);
    }
  };

  const startDemoMode = () => {
    setDemoMode(true);
    setError(null);
    setIsScanning(true);
    setCameraReady(true);
    onStateChange?.("active");
  };

  useEffect(() => {
    if (isActive && !cameraReady && !error && !demoMode) activateCamera();
  }, [isActive, cameraReady, error, demoMode]);

  useEffect(() => {
    if (cameraReady && stream && videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraReady, stream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Motion Detection Loop
  useEffect(() => {
    if (!cameraReady || !videoRef.current || fireActive) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    
    const checkMotion = () => {
      if (!videoRef.current || !ctx || fireActive) return;

      canvas.width = 160; // Low res for performance
      canvas.height = 120;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      if (prevFrameRef.current) {
        let diff = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Compare brightness
          const avg1 = (data[i] + data[i+1] + data[i+2]) / 3;
          const avg2 = (prevFrameRef.current[i] + prevFrameRef.current[i+1] + prevFrameRef.current[i+2]) / 3;
          diff += Math.abs(avg1 - avg2);
        }
        
        const threshold = 2.0; // 2% of pixels changed
        const normalizedDiff = diff / (canvas.width * canvas.height);
        
        // Use a small buffer to confirm motion isn't just a single frame noise
        if (normalizedDiff > threshold) {
          if (!motionConfirmRef.current) motionConfirmRef.current = 0;
          motionConfirmRef.current += 1;
          
          if (motionConfirmRef.current > 3) { // Must be detected for 3 consecutive frames
            console.log("🔥 Motion confirmed! Spawning FIREMAN JUNIOR simulation...");
            setFireActive(true);
            setShowQuiz(true);
            motionConfirmRef.current = 0;
          }
        } else {
          motionConfirmRef.current = 0;
        }
      }

      prevFrameRef.current = new Uint8ClampedArray(data);
      if (!fireActive) requestAnimationFrame(checkMotion);
    };

    const timeout = setTimeout(checkMotion, 1000);
    return () => clearTimeout(timeout);
  }, [cameraReady, fireActive]);

  const errorInfo = getErrorMessage(error);

  const statusLabel = cameraReady && demoMode ? "DEMO" : cameraReady ? "LIVE" : error ? "ERROR" : "STANDBY";
  const statusColor = cameraReady && demoMode ? "#eab308" : cameraReady ? "#ef4444" : error ? "#f97316" : "#4b5563";

  // Shared outer frame styles
  const frameSx = {
    position: "relative",
    width: "100%",
    height: "100%",
    background: "linear-gradient(to bottom, #030712, #000, #111827)",
    borderRadius: 6,
    overflow: "hidden",
    border: `2px solid rgba(239,68,68,${error ? 0.5 : isScanning ? 0.4 : 0.2})`,
    boxShadow: `
      inset 0 2px 10px rgba(0,0,0,0.8),
      0 0 40px rgba(239,68,68,${isScanning ? 0.5 : error ? 0.4 : 0.3}),
      0 0 80px rgba(239,68,68,${isScanning ? 0.3 : 0.15}),
      0 20px 60px rgba(0,0,0,0.5)
    `,
    ...glowPulseKeyframes,
    ...scanLineKeyframes,
  };

  const scanBadge = (text: string) => (
    <Box
      sx={{
        position: "absolute",
        top: 24,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      <Typography
        sx={{
          color: "#f87171",
          fontSize: "0.875rem",
          fontWeight: 700,
          px: 2.5,
          py: 1.5,
          borderRadius: 50,
          bgcolor: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          backdropFilter: "blur(8px)",
          animation: "glowPulse 3s ease-in-out infinite",
        }}
      >
        {text}
      </Typography>
    </Box>
  );

  const cornerMarkers = (
    <>
      <Box sx={{ ...cornerMarkerSx, top: 16, left: 16 }} />
      <Box sx={{ ...cornerMarkerSx, top: 16, right: 16 }} />
      <Box sx={{ ...cornerMarkerSx, bottom: 16, left: 16 }} />
      <Box sx={{ ...cornerMarkerSx, bottom: 16, right: 16 }} />
    </>
  );

  const renderContent = () => {
    // Live camera
    if (cameraReady && stream) {
      return (
        <>
          <Box
            component="video"
            ref={videoRef}
            autoPlay
            playsInline
            muted
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* AAA Futuristic HUD Overlay */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 40,
            }}
          >
            {/* Scanning Line */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "2px",
                background: "linear-gradient(to right, transparent, rgba(0, 255, 255, 0.4), transparent)",
                boxShadow: "0 0 15px rgba(0, 255, 255, 0.6)",
                animation: "hudScan 4s linear infinite",
                "@keyframes hudScan": {
                  "0%": { top: "0%" },
                  "100%": { top: "100%" },
                },
              }}
            />

            {/* Corner Brackets */}
            {[
              { top: 24, left: 24, borderLeft: "3px solid #00ffff", borderTop: "3px solid #00ffff" },
              { top: 24, right: 24, borderRight: "3px solid #00ffff", borderTop: "3px solid #00ffff" },
              { bottom: 24, left: 24, borderLeft: "3px solid #00ffff", borderBottom: "3px solid #00ffff" },
              { bottom: 24, right: 24, borderRight: "3px solid #00ffff", borderBottom: "3px solid #00ffff" },
            ].map((style, i) => (
              <Box
                key={i}
                sx={{
                  position: "absolute",
                  width: 30,
                  height: 30,
                  opacity: 0.5,
                  filter: "drop-shadow(0 0 5px #00ffff)",
                  borderRadius: "2px",
                  ...style,
                }}
              />
            ))}

            {/* Top Data Reads */}
            <Box sx={{ position: "absolute", top: 30, left: 40, display: "flex", flexDirection: "column", gap: 0.2 }}>
              <Typography sx={{ color: "#00ffff", fontSize: "10px", fontWeight: 800, letterSpacing: 2, textShadow: "0 0 5px #00ffff" }}>
                SYS_STATUS: ACTIVE
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", fontFamily: "monospace" }}>
                LATENCY: 14MS // BUFF: 0.2S
              </Typography>
            </Box>

            {/* Bottom Data Reads */}
            <Box sx={{ position: "absolute", bottom: 30, right: 40, textAlign: "right" }}>
              <Typography sx={{ color: fireActive ? "#ff4400" : "#00ffff", fontSize: "10px", fontWeight: 800, letterSpacing: 2 }}>
                {fireActive ? "[[ TARGET_ACQUIRED ]]" : "[[ SCANNING_AO... ]]"}
              </Typography>
              <Typography sx={{ color: "#fff", fontSize: "28px", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
                {fireActive ? "1,240°C" : "26.4°C"}
              </Typography>
            </Box>

            {/* Target Lock */}
            {fireActive && (
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 180,
                  height: 180,
                  border: "2px dashed #ff4400",
                  borderRadius: "50%",
                  animation: "targetPulse 1.5s infinite",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 30px rgba(255, 68, 0, 0.2)",
                  "@keyframes targetPulse": {
                    "0%": { transform: "translate(-50%, -50%) scale(0.95)", opacity: 0.6 },
                    "50%": { transform: "translate(-50%, -50%) scale(1.05)", opacity: 0.3 },
                    "100%": { transform: "translate(-50%, -50%) scale(0.95)", opacity: 0.6 },
                  }
                }}
              >
                <Typography sx={{ color: "#ff4400", fontSize: "12px", fontWeight: 900, letterSpacing: 3 }}>LOCK</Typography>
              </Box>
            )}

            {/* Cinematic Scanlines Overlay */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)",
                pointerEvents: "none",
                opacity: 0.2,
              }}
            />
          </Box>

          {cameraReady && stream && <FireSimulation active={fireActive} />}
          {showQuiz && (
            <Box sx={{ zIndex: 100, position: "absolute", inset: 0 }}>
               <ARGameUI 
                  isDetected={true}
                  onSimulateDetect={() => { setFireActive(true); setShowQuiz(true); }}
                  onCorrectComplete={() => { setShowQuiz(false); setFireActive(false); }}
               />
            </Box>
          )}
          
          {/* Manual Tools for Debugging */}
          <Box sx={{ position: "absolute", bottom: 16, left: 16, display: "flex", gap: 1, pointerEvents: "auto" }}>
            {!fireActive && (
              <Button 
                onClick={() => { setFireActive(true); setShowQuiz(true); }}
                size="small"
                variant="outlined"
                sx={{ color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.1)", fontSize: "0.6rem" }}
              >
                Test Fire
              </Button>
            )}
            {fireActive && !showQuiz && (
              <IconButton 
                onClick={() => { setFireActive(false); setShowQuiz(false); }}
                sx={{ bgcolor: "rgba(0,0,0,0.5)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}
              >
                <RefreshIcon />
              </IconButton>
            )}
          </Box>
        </>
      );
    }

    // Demo mode
    if (demoMode) {
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #1f2937, #000, #111827)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box sx={{ position: "absolute", inset: 0, opacity: 0.5 }}>
            <Box
              sx={{
                position: "absolute",
                top: 40,
                left: 40,
                width: 192,
                height: 192,
                bgcolor: "#ea580c",
                borderRadius: "50%",
                filter: "blur(48px)",
                animation: "glowPulse 4s ease-in-out infinite",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -80,
                right: -80,
                width: 320,
                height: 320,
                bgcolor: "#dc2626",
                borderRadius: "50%",
                filter: "blur(48px)",
                animation: "glowPulse 5s ease-in-out 1s infinite",
              }}
            />
          </Box>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.1,
              backgroundImage: gridBg,
              backgroundSize: "60px 60px",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, transparent, rgba(239,68,68,0.1), transparent)",
              pointerEvents: "none",
              animation: "glowPulse 3s ease-in-out infinite",
            }}
          />
          {scanBadge("🔍 Scanning environment... (Demo Mode)")}
          {cornerMarkers}
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: "75%",
              height: 6,
              background: "linear-gradient(to right, transparent, #ef4444, transparent)",
              boxShadow: "0 0 20px rgba(239,68,68,0.5)",
              animation: "scanLine 3s ease-in-out infinite",
            }}
          />
        </Box>
      );
    }

    // Error state
    if (error) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            px: 3,
            py: 4,
            position: "relative",
            width: "100%",
            height: "100%",
          }}
        >
          <Typography sx={{ fontSize: "3.75rem" }}>⚠️</Typography>
          <Box sx={{ textAlign: "center", maxWidth: 360 }}>
            <Typography sx={{ color: "#f87171", fontSize: "1.25rem", fontWeight: 700, mb: 1.5 }}>
              {errorInfo?.title}
            </Typography>
            <Typography sx={{ color: "grey.400", fontSize: "0.875rem", mb: 1.5, lineHeight: 1.7 }}>
              {errorInfo?.message}
            </Typography>
            <Typography sx={{ color: "grey.600", fontSize: "0.75rem", mb: 4 }}>
              {errorInfo?.hint}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
            <Button
              onClick={() => activateCamera()}
              variant="contained"
              sx={{
                background: "linear-gradient(to right, #dc2626, #ef4444)",
                "&:hover": { background: "linear-gradient(to right, #ef4444, #f87171)" },
                px: 3,
                py: 1.5,
                borderRadius: 2,
                boxShadow: "0 0 20px rgba(239,68,68,0.5)",
              }}
            >
              Retry Camera
            </Button>
            <Button
              onClick={startDemoMode}
              variant="contained"
              sx={{
                background: "linear-gradient(to right, #374151, #4b5563)",
                "&:hover": { background: "linear-gradient(to right, #4b5563, #6b7280)" },
                px: 3,
                py: 1.5,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Try Demo Mode
            </Button>
          </Box>
          {error === "permission-denied" && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                background: "linear-gradient(to right, rgba(239,68,68,0.1), rgba(239,68,68,0.05))",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 3,
                maxWidth: 360,
                backdropFilter: "blur(4px)",
              }}
            >
              <Typography sx={{ fontSize: "0.75rem", color: "#fecaca", lineHeight: 1.7 }}>
                <strong>🔐 Browser Camera Permissions:</strong>
                <br />
                <strong>Chrome/Edge/Brave:</strong> Camera icon in address bar → Allow
                <br />
                <strong>Firefox:</strong> Privacy icon (shield) → Allow
                <br />
                <strong>Safari:</strong> System Settings → Privacy → Camera
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.05,
              pointerEvents: "none",
              backgroundImage: subtleGridBg,
              backgroundSize: "50px 50px",
            }}
          />
        </Box>
      );
    }

    // Idle / standby
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <Box sx={{ position: "relative" }}>
          <Typography sx={{ fontSize: "3.75rem", animation: "glowPulse 2s ease-in-out infinite" }}>
            📹
          </Typography>
          <Box
            sx={{
              position: "absolute",
              bottom: -8,
              right: -8,
              width: 16,
              height: 16,
              bgcolor: "#ef4444",
              borderRadius: "50%",
              animation: "glowPulse 2s ease-in-out infinite",
            }}
          />
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, mb: 1 }}>
            Ready to start simulation
          </Typography>
          <Typography sx={{ color: "grey.500", fontSize: "0.875rem", mb: 3 }}>
            Click button below to activate camera
          </Typography>
          <Button
            onClick={() => activateCamera()}
            variant="contained"
            sx={{
              background: "linear-gradient(to right, #dc2626, #ef4444)",
              "&:hover": { background: "linear-gradient(to right, #ef4444, #f87171)" },
              px: 4,
              py: 1.5,
              borderRadius: 2,
              boxShadow: "0 0 20px rgba(239,68,68,0.5)",
            }}
          >
            Start Camera
          </Button>
        </Box>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            pointerEvents: "none",
            backgroundImage: subtleGridBg,
            backgroundSize: "50px 50px",
          }}
        />
      </Box>
    );
  };

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box sx={frameSx}>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #000, #030712, #000)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {renderContent()}
        </Box>

        {/* Status label */}
        <Box sx={{ position: "absolute", bottom: 16, right: 24, display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: statusColor,
              ...(cameraReady && { animation: "glowPulse 2s ease-in-out infinite" }),
            }}
          />
          <Typography sx={{ fontSize: "0.75rem", fontFamily: "monospace", color: "grey.500" }}>
            {statusLabel}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
