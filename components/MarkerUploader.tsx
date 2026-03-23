"use client";
import React, { useState, useRef } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  IconButton, 
  CircularProgress,
  Fade,
  LinearProgress
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import Image from "next/image";

interface MarkerUploaderProps {
  onProcessed: (markerData: { image: string; mindData: Uint8Array; targetCount: number }) => void;
}

declare global {
  interface Window {
    MINDAR: any;
  }
}

function MarkerUploader({ onProcessed }: MarkerUploaderProps) {
  console.log("⚛️ [MarkerUploader] Component Mounting...");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "ready" | "success" | "saved">("idle");
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load existing marker on mount only if user hasn't started adding new ones
  React.useEffect(() => {
    const checkExisting = async () => {
      // Small delay to ensure manual file addition isn't immediately overridden
      await new Promise(r => setTimeout(r, 100));
      if (files.length > 0) return; 

      try {
        const res = await fetch("/api/upload");
        if (res.ok) {
          const { imageUrl } = await res.json();
          if (imageUrl) {
            const imgRes = await fetch(imageUrl);
            const blob = await imgRes.blob();
            const file = new File([blob], "marker-tracking.png", { type: blob.type });
            setFiles([file]);
            const url = URL.createObjectURL(blob);
            setPreviews([url]);
            setStatus("ready");
            console.log("📂 Pre-loaded existing marker from Vercel Blob.");
          }
        }
      } catch (e) {
        console.warn("No existing marker found");
      }
    };
    checkExisting();
  }, []); 

  const handleStartCapture = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCapturing(false);
    }
  };

  const handleStopCapture = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsCapturing(false);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${files.length}.png`, { type: "image/png" });
            setFiles(prev => [...prev, file]);
            const url = URL.createObjectURL(blob);
            setPreviews(prev => [...prev, url]);
            setStatus("ready");
            handleStopCapture();
          }
        }, "image/png");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles = Array.from(selectedFiles);
      setFiles(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(f => URL.createObjectURL(f));
      setPreviews(prev => [...prev, ...newPreviews]);
      setStatus("ready");
    }
  };

  const handleProcessLogic = async (currentPreviews: string[], currentFiles: File[]) => {
    if (currentFiles.length === 0) return;
    setProcessing(true);
    setProgress(5);

    try {
      // 📦 Hybrid: We use 1.1.4 for the Compiler (stable namespace) 
      // but keep ARViewer at 1.2.2 (better tracking performance)
      if (typeof window !== "undefined" && (!window.MINDAR || !window.MINDAR.IMAGE || !window.MINDAR.IMAGE.Compiler)) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/mind-ar@1.1.4/dist/mindar-image.prod.js"; // 🛠️ Revert to rock-stable 1.1.4
          script.onload = () => setTimeout(resolve, 500); 
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (!(window as any).MINDAR?.IMAGE?.Compiler) {
        throw new Error("MindAR Compiler not found in global scope (MINDAR.IMAGE.Compiler).");
      }

      const compiler = new (window as any).MINDAR.IMAGE.Compiler();
      const images = await Promise.all(currentPreviews.map(async (url) => {
        const img = new (window as any).Image();
        img.src = url;
        img.crossOrigin = "anonymous";
        await new Promise(r => img.onload = r);
        return img;
      }));

      setProgress(20);
      const data = await compiler.compileImageTargets(images, (p: number) => {
        setProgress(Math.floor(20 + p * 0.7));
      });

      const mindData = await compiler.exportData(data);
      setProgress(100);

      // Persist to server (Source image + Compiled .mind)
      const formData = new FormData();
      formData.append("file", currentFiles[0]);
      
      const mindBlob = new Blob([mindData], { type: "application/octet-stream" });
      formData.append("mindData", mindBlob, "targets.mind");
      formData.append("targetCount", currentFiles.length.toString());

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Upload failed");
      }
      console.log(`💾 Marker data and .mind file saved to Vercel Blob for ${currentFiles.length} targets.`);

      setProcessing(false);
      setStatus("success");
      onProcessed({
        image: currentPreviews[0],
        mindData: mindData,
        targetCount: currentFiles.length
      });
    } catch (err) {
      console.error("Compilation error:", err);
      setProcessing(false);
      setStatus("ready");
    }
  };

  const handleProcess = () => handleProcessLogic(previews, files);

  const handleRemove = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (newFiles.length === 0) setStatus("idle");
  };

  const handleDownloadMind = async () => {
    try {
      const res = await fetch("/api/upload");
      if (res.ok) {
        const { mindUrl } = await res.json();
        if (mindUrl) {
          const link = document.createElement("a");
          link.href = mindUrl;
          link.download = "targets.mind";
          link.target = "_blank";
          link.click();
        }
      }
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setPreviews([]);
    setStatus("idle");
    setProgress(0);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 4,
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px dashed rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        maxWidth: 400,
        width: "100%",
        mx: "auto",
        transition: "all 0.3s ease",
        "&:hover": {
          background: "rgba(255, 255, 255, 0.05)",
          borderColor: "rgba(0, 255, 255, 0.3)",
        }
      }}
    >
      <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, textAlign: "center" }}>
        {status === "success" ? "MARKERS PROCESSED" : "SETUP AR TARGETS"}
      </Typography>

      {/* Persistent Hidden Input (ensure it's always in DOM) */}
      <input 
        type="file" 
        hidden 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        multiple 
      />

      {previews.length === 0 && !isCapturing ? (
        <Box sx={{ width: "100%", position: "relative" }}>
          <Box
            sx={{
              width: "100%",
              height: 200,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              gap: 2,
              border: "2px dashed rgba(255,255,255,0.1)",
              borderRadius: 2,
              "&:hover": { borderColor: "cyan", bgcolor: "rgba(0,255,255,0.05)" }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Box sx={{ textAlign: "center", mb: 1 }}>
              <CloudUploadIcon sx={{ fontSize: 40, color: "rgba(255,255,255,0.4)" }} />
              <Typography sx={{ color: "grey.500", fontSize: "0.75rem", mt: 1 }}>
                 Drop or CLICK TO BROWSE
              </Typography>
            </Box>
            <Typography sx={{ color: "grey.600", fontSize: "0.7rem" }}>— OR —</Typography>
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              onClick={(e) => { e.stopPropagation(); handleStartCapture(); }}
              sx={{ color: "cyan", borderColor: "rgba(0,255,255,0.3)" }}
            >
              USE CAMERA
            </Button>
          </Box>
        </Box>
      ) : isCapturing ? (
        <Box sx={{ position: "relative", width: "100%", borderRadius: 2, overflow: "hidden", bgcolor: "#000" }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: 200, objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <Box sx={{ position: "absolute", bottom: 16, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 2 }}>
            <Button variant="contained" onClick={handleCapture} sx={{ bgcolor: "#ef4444" }}>CAPTURE</Button>
            <Button variant="outlined" onClick={handleStopCapture} sx={{ color: "#fff", borderColor: "#fff" }}>CANCEL</Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 2 }}>
          {previews.map((src, idx) => (
            <Box key={idx} sx={{ position: "relative", width: "100%", paddingTop: "100%", borderRadius: 1, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Image src={src} alt={`Target ${idx}`} fill style={{ objectFit: "cover" }} />
              <IconButton
                onClick={() => handleRemove(idx)}
                sx={{ position: "absolute", top: 2, right: 2, bgcolor: "rgba(239,68,68,0.8)", color: "#fff", p: 0.5 }}
                size="small"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{ 
                width: "100%", 
                paddingTop: "100%", 
                border: "1px dashed rgba(255,255,255,0.3)", 
                borderRadius: 1, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                cursor: "pointer",
                position: "relative",
                "&:hover": { borderColor: "cyan", bgcolor: "rgba(0,255,255,0.05)" }
            }}
          >
            <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <CloudUploadIcon sx={{ fontSize: 20, color: "cyan" }} />
                <Typography sx={{ fontSize: 8, color: "cyan" }}>ADD TARGET</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {processing && (
        <Box sx={{ width: "100%" }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
          <Typography sx={{ color: "cyan", fontSize: "10px", fontWeight: 800, textAlign: "center" }}>
            GENERATING {previews.length} TARGETS... {progress}%
          </Typography>
        </Box>
      )}

      {status === "ready" && !processing && (
        <Button
          fullWidth
          variant="contained"
          onClick={handleProcess}
          sx={{
            background: "linear-gradient(to right, #00ffff, #008888)",
            color: "#000",
            fontWeight: 800,
            py: 1.5,
            borderRadius: 2,
            "&:hover": { filter: "brightness(1.2)" }
          }}
        >
          GENERATE MARKERS ({previews.length})
        </Button>
      )}

      {status === "success" && (
        <Fade in>
          <Box sx={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <CheckCircleOutlineIcon sx={{ color: "#10b981", fontSize: 40 }} />
            <Typography sx={{ color: "#10b981", fontWeight: 800 }}>READY FOR AR</Typography>
            <Button
              size="small"
              onClick={handleDownloadMind}
              sx={{ 
                color: "cyan", 
                fontSize: "10px", 
                textDecoration: "underline",
                "&:hover": { color: "#fff" }
              }}
            >
              DOWNLOAD .MIND FILE
            </Button>
          </Box>
        </Fade>
      )}

      {/* Optimization Tip */}
      <Box sx={{ 
        mt: 2, 
        p: 1.5, 
        borderRadius: 2, 
        bgcolor: "rgba(0,255,255,0.05)", 
        border: "1px solid rgba(0,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        gap: 0.5
      }}>
        <Typography sx={{ color: "cyan", fontSize: "10px", fontWeight: 800 }}>
          💡 OPTIMIZATION TIP
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "9px", lineHeight: 1.4 }}>
          For fast detection, use images with <b>high contrast, clear details, and various colors</b>. 
          Blurry or very simple shapes (like plain logos) may take longer to lock.
        </Typography>
      </Box>

      {/* Permission Tip */}
      <Typography sx={{ color: "rgba(255,255,255,0.2)", fontSize: "9px", textAlign: "center", mt: 1 }}>
        Tip: Allow camera access if prompted for direct capture
      </Typography>
    </Paper>
  );
}

export default MarkerUploader;
