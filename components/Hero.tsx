"use client";
import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Box,
  Typography,
  Button,
  Chip,
  Grid,
  Dialog,
  IconButton,
  Zoom
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";

const MarkerUploader = dynamic(() => import("./MarkerUploader"), { ssr: false });
const ARViewer = dynamic(() => import("./ARViewer"), { ssr: false });
const ARGameUI = dynamic(() => import("./ARGameUI"), { ssr: false });

const features = [
  {
    icon: "🔥",
    title: "Real-World Scenarios",
    desc: "Train with realistic fire emergency situations and complex scenarios",
  },
  {
    icon: "👥",
    title: "Team Collaboration",
    desc: "Multi-user training and group simulations for teams",
  },
  {
    icon: "📈",
    title: "Progress Tracking",
    desc: "Monitor performance metrics and improvement over time",
  },
];

const pills = [
  { label: "🎯 Immersive Training", color: "rgba(0,74,173,0.08)", border: "rgba(0,74,173,0.2)", text: "#004aad" },
  { label: "📊 Real-time Feedback", color: "rgba(2,132,199,0.08)", border: "rgba(2,132,199,0.2)", text: "#0284c7" },
  { label: "🚀 Enterprise Ready", color: "rgba(0,74,173,0.08)", border: "rgba(0,74,173,0.2)", text: "#004aad" },
];

// 🚀 GLOBAL CACHE (Memory level)
let GLOBAL_MARKER_CACHE: { image: string; mindData: Uint8Array; targetCount: number } | null = null;

// 💾 PERSISTENT CACHE (IndexedDB level - 0ms delay on reload)
const DB_NAME = "BoonyeunARCache";
const STORE_NAME = "markers";
const openDB = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function saveToDisk(data: any) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, "current_marker");
  } catch (e) { console.warn("Disk Cache Failed", e); }
}

async function loadFromDisk() {
  try {
    const db = await openDB();
    return new Promise<any>((resolve) => {
      const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).get("current_marker");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
}

export default function Hero() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [markerData, setMarkerData] = useState<{ image: string; mindData: Uint8Array; targetCount: number } | null>(null);
  const [isDetected, setIsDetected] = useState(false);
  const [loadingMarkers, setLoadingMarkers] = useState(true);
  const [intensity, setIntensity] = useState(80); // 🔥 Lifted state for shared fire effect!

  // Auto-load existing markers from server on mount
  React.useEffect(() => {
    const loadMarkers = async () => {
      // 🏎️ 1. Instant Memory Cache Check
      if (GLOBAL_MARKER_CACHE) {
        setMarkerData(GLOBAL_MARKER_CACHE);
        setLoadingMarkers(false);
        return; // 🚀 EARLY ESCAPE: Hero is ready in 0ms
      }

      // 💾 2. Near-Instant Disk Cache Check
      const diskData = await loadFromDisk();
      if (diskData) {
        setMarkerData(diskData);
        GLOBAL_MARKER_CACHE = diskData;
        setLoadingMarkers(false);
        // 🛰️ OPTIONAL: Silent background check for updates could go here
        // But for maximum speed requested by user, we stop here if we have data.
        return;
      }

      // 🌐 3. Network Sync (First time or clear cache)
      setLoadingMarkers(true);
      try {
        const apiRes = await fetch("/api/upload");
        if (apiRes.ok) {
          const { mindUrl, imageUrl, targetCount } = await apiRes.json();
          
          if (mindUrl && imageUrl) {
            const mindRes = await fetch(mindUrl);

            if (mindRes.ok) {
              const mindBuffer = await mindRes.arrayBuffer();
              const mindData = new Uint8Array(mindBuffer);

              const newData = {
                image: imageUrl,
                mindData: mindData,
                targetCount: targetCount
              };

              setMarkerData(newData);
              GLOBAL_MARKER_CACHE = newData;
              saveToDisk(newData); // 💾 Persist for next session
              console.log(`⚡ [Hero] Persistent Cache Updated (${targetCount} targets).`);
            }
          }
        }
      } catch (err) {
        console.warn("No existing markers found on server.");
      } finally {
        setLoadingMarkers(false);
      }
    };
    loadMarkers();
  }, []);

  const handleOpenAR = () => setCameraOpen(true);
  const handleCloseCamera = () => {
    setCameraOpen(false);
    setIsDetected(false);
    setIntensity(80); // Reset fire for next run
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        pt: { xs: 14, sm: 16 },
        pb: 8,
        px: { xs: 2, sm: 3 },
        overflow: "hidden",
      }}
    >
      {/* Background blobs */}
      <Box sx={{ position: "absolute", inset: 0, top: -160, opacity: 0.15, pointerEvents: "none" }}>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 384,
            height: 384,
            bgcolor: "#004aad",
            borderRadius: "50%",
            filter: "blur(48px)",
            animation: "pulse 4s ease-in-out infinite",
            "@keyframes pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.5 },
            },
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 384,
            height: 384,
            bgcolor: "#0284c7",
            borderRadius: "50%",
            filter: "blur(48px)",
            animation: "pulse 5s ease-in-out 1s infinite",
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ position: "relative", zIndex: 1, maxWidth: 1280, mx: "auto" }}>
        <Grid container spacing={{ xs: 4, lg: 8 }} alignItems="center">
          {/* Left */}
          <Grid item xs={12} lg={6}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Badge */}
              <Chip
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "#004aad",
                        animation: "pulse 2s infinite",
                      }}
                    />
                    <Typography sx={{ color: "#004aad", fontSize: "0.875rem", fontWeight: 600 }}>
                      Next-Gen Training
                    </Typography>
                  </Box>
                }
                sx={{
                  bgcolor: "rgba(0,74,173,0.06)",
                  border: "1px solid rgba(0,74,173,0.2)",
                  borderRadius: 50,
                  width: "fit-content",
                  height: 36,
                }}
              />

              {/* Headline */}
              <Box>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: "3.5rem", sm: "4.25rem", lg: "4.25rem" },
                    lineHeight: 1.1,
                    mb: 3,
                  }}
                >
                  <Typography sx={{ color: "#64748b", fontSize: "0.875rem", fontWeight: 700, letterSpacing: 3, mb: 1 }}>
                    [[ BOONYEUN SAFETY PRESENTS ]]
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "block",
                      background: "linear-gradient(to right, #004aad, #0284c7)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      fontStyle: "italic",
                      fontWeight: 900,
                    }}
                  >
                    FIREMAN JUNIOR
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      display: "block",
                      color: "#fff",
                      fontSize: { xs: "1.5rem", sm: "2rem" },
                      mt: 1,
                      fontWeight: 500,
                      bgcolor: "#004aad",
                      width: "fit-content",
                      px: 3,
                      py: 0.5,
                      borderRadius: 10,
                    }}
                  >
                    จำลองขั้นตอนการใช้เครื่องมือเรียนรู้ความปลอดภัย (AR)
                  </Box>
                </Typography>
                <Typography
                  sx={{
                    color: "#475569",
                    fontSize: { xs: "1.125rem", sm: "1.25rem" },
                    lineHeight: 1.7,
                    maxWidth: 560,
                    fontWeight: 300,
                  }}
                >
                  Immersive AR training for real-world emergency scenarios. Empower your team with
                  hands-on, interactive learning experiences.
                </Typography>
              </Box>

              {/* CTA */}
              <Box sx={{ pt: 2 }}>
                {loadingMarkers ? (
                  <Button
                    disabled
                    variant="contained"
                    sx={{ px: 5, py: 2, borderRadius: 3, bgcolor: "rgba(0,0,0,0.05) !important", color: "#64748b" }}
                  >
                    SYNCHRONIZING SYSTEM...
                  </Button>
                ) : markerData ? (
                  <Button
                    onClick={handleOpenAR}
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      background: "linear-gradient(to right, #004aad, #0284c7)",
                      color: "#fff",
                      fontWeight: 900,
                      "&:hover": {
                        background: "linear-gradient(to right, #003380, #0369a1)",
                        transform: "scale(1.05)",
                        boxShadow: "0 10px 30px rgba(0,74,173,0.3)",
                      },
                      px: { xs: 4, sm: 6 },
                      py: { xs: 1.5, sm: 2 },
                      fontSize: "1.25rem",
                      borderRadius: 3,
                      animation: "pulseShadow 3s infinite",
                      "@keyframes pulseShadow": {
                        "0%": { boxShadow: "0 0 15px rgba(0, 74, 173, 0.4)" },
                        "50%": { boxShadow: "0 0 30px rgba(0, 74, 173, 0.6)" },
                        "100%": { boxShadow: "0 0 15px rgba(0, 74, 173, 0.4)" },
                      }
                    }}
                  >
                    ลองเล่น AR
                  </Button>
                ) : (
                  <Button
                    component={Link}
                    href="/markers"
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      background: "linear-gradient(to right, #64748b, #cbd5e1)",
                      px: 4, py: 2, borderRadius: 3
                    }}
                  >
                    SETUP AR MARKERS
                  </Button>
                )}

                {/* Pills */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 5 }}>
                  {pills.map((pill) => (
                    <Chip
                      key={pill.label}
                      label={pill.label}
                      sx={{
                        bgcolor: pill.color,
                        border: `1px solid ${pill.border}`,
                        color: pill.text,
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        backdropFilter: "blur(4px)",
                        borderRadius: 50,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Right - AR Camera */}
          <Grid item xs={12} lg={6}>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: { xs: 300, sm: 400, lg: 500 },
                borderRadius: 4,
                overflow: "hidden",
                bgcolor: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(0,0,0,0.05)",
                background: "linear-gradient(to bottom, #f8fafc, #fff)",
                boxShadow: "0 10px 40px rgba(0,74,173,0.08)"
              }}
            >
              <Typography sx={{ fontSize: "4rem", mb: 2 }}>📽️</Typography>
              <Typography sx={{ color: "#64748b", mb: 4, textAlign: "center", px: 4 }}>
                Ready to experience the 3D AR fire emergency training.
              </Typography>
              <Button
                component={Link}
                href="/markers"
                variant="outlined"
                sx={{
                  color: "#004aad",
                  borderColor: "rgba(0,74,173,0.3)",
                  "&:hover": { borderColor: "#004aad", bgcolor: "rgba(0,74,173,0.05)" },
                }}
              >
                MANAGE TARGETS
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Full-screen AR Modal */}
        <Dialog
          open={cameraOpen}
          onClose={handleCloseCamera}
          fullScreen={Boolean(typeof window !== "undefined" && window.innerWidth < 600)}
          fullWidth
          maxWidth="lg"
          TransitionComponent={Zoom}
          PaperProps={{
            sx: {
              background: { xs: "#000", sm: "transparent" },
              boxShadow: "none",
              overflow: "visible",
              width: { xs: "100%", sm: "70vw" },
              maxWidth: "1200px",
              height: { xs: "100%", sm: "70vh" },
            },
          }}
        >
          <Box sx={{ position: "relative", width: "100%", height: "100%", bgcolor: "#000", borderRadius: 6, overflow: "hidden" }}>
            {markerData && cameraOpen && (
              <>
                <ARViewer
                  mindData={markerData.mindData}
                  targetCount={markerData.targetCount}
                  onDetected={() => setIsDetected(true)}
                  onLost={() => setIsDetected(false)}
                  intensity={intensity}
                />
                <ARGameUI
                  isDetected={isDetected}
                  intensity={intensity}
                  onIntensityChange={setIntensity}
                  onSimulateDetect={() => setIsDetected(true)}
                  onCorrectComplete={() => {
                    setIsDetected(false);
                    setIntensity(0);
                  }}
                />
              </>
            )}
          </Box>
        </Dialog>

        {/* Features */}
        <Grid container spacing={3} sx={{ mt: 12 }}>
          {features.map((f, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <Box
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: 4,
                  bgcolor: "#fff",
                  border: "1px solid rgba(0,0,0,0.05)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                  transition: "all 0.3s",
                  position: "relative",
                  overflow: "hidden",
                  "&:hover": {
                    borderColor: "rgba(0,74,173,0.2)",
                    boxShadow: "0 10px 40px rgba(0,74,173,0.08)",
                    "& .feature-bg": { opacity: 1 },
                  },
                }}
              >
                <Box
                  className="feature-bg"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, rgba(0,74,173,0.03), rgba(2,132,199,0.03))",
                    opacity: 0,
                    transition: "opacity 0.3s",
                  }}
                />
                <Box sx={{ position: "relative", zIndex: 1 }}>
                  <Typography sx={{ fontSize: "2rem", mb: 2 }}>{f.icon}</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 700, fontSize: "1.125rem", mb: 1 }}>
                    {f.title}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.7 }}>
                    {f.desc}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
