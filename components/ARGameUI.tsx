"use client";
import React, { useState, useEffect } from "react";
import { Box, Typography, Button, IconButton, LinearProgress, Fade } from "@mui/material";

// Icons
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import dynamic from "next/dynamic";

const FireSimulation = dynamic(() => import("./FireSimulation"), { ssr: false });

interface Option {
  id: string;
  label: string;
  emoji: string;
  isCorrect: boolean;
  knowledge?: string;
}

const options: Option[] = [
  { id: "extinguisher", label: "Fire Extinguisher", emoji: "🧯", isCorrect: true },
  { id: "water", label: "Water", emoji: "💧", isCorrect: false, knowledge: "Water conducts electricity and spreads oil fires! Use an extinguisher instead." },
  { id: "sand", label: "Sand", emoji: "🪣", isCorrect: false, knowledge: "Sand is too slow for this size of fire. A fire extinguisher is much safer." },
  { id: "nothing", label: "Do Nothing", emoji: "🚫", isCorrect: false, knowledge: "Doing nothing allows the fire to spread rapidly! Always take safe action." },
];

interface ARGameUIProps {
  isDetected: boolean;
  onSimulateDetect: () => void;
  onCorrectComplete: () => void;
}

export default function ARGameUI({ isDetected, onSimulateDetect, onCorrectComplete }: ARGameUIProps) {
  const [timeLeft, setTimeLeft] = useState(27);
  const [score, setScore] = useState(0);
  const [intensity, setIntensity] = useState(80);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");

  // Reset state when going back to scanning mode
  useEffect(() => {
    if (!isDetected) {
      setTimeLeft(27);
      setIntensity(80);
      setSelected(null);
      setFeedback("none");
      // Intentionally keeping `score` so it accumulates across replays
    }
  }, [isDetected]);

  // Timer logic
  useEffect(() => {
    if (!isDetected || feedback !== "none") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isDetected, feedback]);

  const handleSelect = (option: Option) => {
    if (feedback !== "none") return;
    setSelected(option.id);
    
    if (option.isCorrect) {
      setFeedback("correct");
      setScore((prev) => prev + 80);
      setIntensity(0);
      setTimeout(() => {
        onCorrectComplete();
      }, 3000);
    } else {
      setFeedback("wrong");
      setIntensity((prev) => Math.min(100, prev + 20));
      setTimeout(() => {
        setFeedback("none");
        setSelected(null);
      }, 5000); // Wait 5 seconds so they can read the knowledge text
    }
  };

  const getOverlayColor = () => {
    if (feedback === "correct") return "rgba(16, 185, 129, 0.15)"; // Green tint
    if (feedback === "wrong") return "rgba(239, 68, 68, 0.15)"; // Red tint
    return "transparent";
  };

  const getAccentColor = () => {
    if (feedback === "correct") return "#10b981"; // Green
    if (feedback === "wrong") return "#ef4444"; // Red
    return "#004aad"; // Deep Blue default
  };

  const accentColor = getAccentColor();

  // Reusable panel styles
  const panelSx = {
    bgcolor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(12px)",
    borderRadius: 3,
    border: `1px solid rgba(0, 74, 173, 0.15)`,
    boxShadow: `0 10px 30px rgba(0, 74, 173, 0.1)`,
    color: "#0f172a",
    transition: "all 0.3s ease",
  };

  // ================= SCANNING STATE =================
  if (!isDetected) {
    return (
      <Box sx={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "auto", background: "radial-gradient(circle, transparent 0%, rgba(0,0,0,0.6) 100%)" }}>
        {/* Viewfinder Box */}
        <Box sx={{ position: "relative", width: 320, height: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          {/* Brackets */}
          <Box sx={{ position: "absolute", top: 0, left: 0, width: 40, height: 40, borderTop: "3px solid #f97316", borderLeft: "3px solid #f97316", borderRadius: "12px 0 0 0" }} />
          <Box sx={{ position: "absolute", top: 0, right: 0, width: 40, height: 40, borderTop: "3px solid #f97316", borderRight: "3px solid #f97316", borderRadius: "0 12px 0 0" }} />
          <Box sx={{ position: "absolute", bottom: 0, left: 0, width: 40, height: 40, borderBottom: "3px solid #f97316", borderLeft: "3px solid #f97316", borderRadius: "0 0 0 12px" }} />
          <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 40, height: 40, borderBottom: "3px solid #f97316", borderRight: "3px solid #f97316", borderRadius: "0 0 12px 0" }} />

          {/* Inner Content */}
          <CameraAltOutlinedIcon sx={{ color: "#004aad", fontSize: 48, filter: "drop-shadow(0 0 8px rgba(0,74,173,0.4))", mb: 1 }} />
          
          <Box sx={{ background: "linear-gradient(90deg, transparent, rgba(0,74,173,0.2), transparent)", py: 1, px: 4, width: "100%", textAlign: "center" }}>
            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>Scanning for marker...</Typography>
          </Box>
          <Typography sx={{ color: "#cbd5e1", fontSize: "0.75rem", textAlign: "center", px: 2 }}>
            Align the fire safety marker within the frame
          </Typography>

          {/* Simulate button removed as per user request */}
        </Box>

        {/* Loading Dots */}
        <Box sx={{ display: "flex", gap: 1, mt: 4 }}>
          {[0, 1, 2].map((i) => (
            <Box 
              key={i} 
              sx={{ 
                  width: 10, 
                  height: 10, 
                  bgcolor: "#f97316", 
                  borderRadius: "50%",
                  animation: `pulseDots 1.5s infinite ${i * 0.2}s`,
                  "@keyframes pulseDots": {
                      "0%, 100%": { opacity: 0.3, transform: "scale(0.8)" },
                      "50%": { opacity: 1, transform: "scale(1.2)", boxShadow: "0 0 10px #f97316" }
                  }
              }} 
            />
          ))}
        </Box>

        {/* Top right floating icons (mute, etc) if needed generally */}
        <IconButton sx={{ position: "absolute", top: 16, right: 16, border: "1px solid rgba(255,255,255,0.1)", bgcolor: "rgba(0,0,0,0.5)" }}>
            <VolumeUpIcon sx={{ color: "#f97316", fontSize: 20 }} />
        </IconButton>
      </Box>
    );
  }

  // ================= ACTIVE GAME STATE =================
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "auto", display: "flex", flexDirection: "column", bgcolor: getOverlayColor(), transition: "background-color 0.4s ease" }}>
      
      {/* 🔴/🟢 FULL SCREEN FEEDBACK OVERLAY (Optional extra tinting) */}
      <Box sx={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, transparent 20%, ${getOverlayColor()} 100%)`, pointerEvents: "none" }} />

      {/* TOP BAR */}
      <Box sx={{ display: "flex", width: "100%", p: 2, gap: 2 }}>
        {/* TIME LEFT */}
        <Box sx={{ ...panelSx, flex: 1, display: "flex", alignItems: "center", p: 1.5, px: 2, gap: 2 }}>
          <AccessTimeIcon sx={{ color: accentColor }} />
          <Box>
            <Typography sx={{ color: "#64748b", fontSize: "0.6rem", fontWeight: 700, letterSpacing: 1 }}>TIME LEFT</Typography>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, lineHeight: 1 }}>{timeLeft}s</Typography>
          </Box>
        </Box>

        {/* SCORE */}
        <Box sx={{ ...panelSx, flex: 1, display: "flex", alignItems: "center", p: 1.5, px: 2, gap: 2 }}>
          <EmojiEventsIcon sx={{ color: accentColor }} />
          <Box>
            <Typography sx={{ color: "#64748b", fontSize: "0.6rem", fontWeight: 700, letterSpacing: 1 }}>SCORE</Typography>
            <Typography sx={{ color: "#d97706", fontSize: "1.25rem", fontWeight: 800, lineHeight: 1 }}>{score}</Typography>
          </Box>
        </Box>

        {/* FIRE INTENSITY */}
        <Box sx={{ ...panelSx, flex: 2, display: "flex", alignItems: "center", p: 1.5, px: 2, gap: 2 }}>
          <LocalFireDepartmentIcon sx={{ color: accentColor }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.6rem", fontWeight: 700, letterSpacing: 1, mb: 0.5 }}>FIRE INTENSITY</Typography>
            <LinearProgress 
               variant="determinate" 
               value={intensity} 
               sx={{ 
                   height: 6, 
                   borderRadius: 3, 
                   bgcolor: "rgba(0,74,173,0.1)",
                   "& .MuiLinearProgress-bar": { bgcolor: accentColor, transition: "transform 0.4s ease" }
               }} 
            />
          </Box>
          <IconButton size="small" sx={{ border: "1px solid rgba(0,74,173,0.1)", ml: 1 }}>
            <VolumeUpIcon sx={{ color: accentColor, fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* LEFT PANEL: Mission Objective */}
      <Box sx={{ px: 2, maxWidth: 280 }}>
        <Box sx={{ ...panelSx, p: 2 }}>
          <Typography sx={{ color: accentColor, fontSize: "0.8rem", fontWeight: 800, mb: 1 }}>Mission Objective</Typography>
          <Typography sx={{ color: "#475569", fontSize: "0.8rem", lineHeight: 1.5 }}>
            Quickly identify and select the correct fire suppression method before time runs out!
          </Typography>
        </Box>
      </Box>

      {/* SPACER for 3D Fire */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        
        {/* 🔥 THE INCREDIBLE REALISTIC FIRE EFFECT OVERLAY 🔥 */}
        <Box sx={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
           <FireSimulation active={isDetected && intensity > 0 && feedback !== "correct"} />
        </Box>

        {/* CENTER FEEDBACK POPUP */}
        {feedback !== "none" && (
            <Fade in={true}>
                <Box sx={{ 
                    ...panelSx, 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    p: 3, 
                    minWidth: 260,
                    boxShadow: `0 0 50px ${accentColor}40`,
                    animation: "popupBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                }}>
                    <Box sx={{ width: 60, height: 60, borderRadius: "50%", bgcolor: `${accentColor}20`, display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
                        {feedback === "correct" ? (
                            <CheckCircleIcon sx={{ color: accentColor, fontSize: 40 }} />
                        ) : (
                            <CancelIcon sx={{ color: accentColor, fontSize: 40 }} />
                        )}
                    </Box>
                    <Typography sx={{ color: accentColor, fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, mb: 1 }}>
                        {feedback === "correct" ? "CORRECT!" : "WRONG CHOICE!"}
                    </Typography>
                    <Typography sx={{ color: "#475569", fontSize: "0.875rem", textAlign: "center", maxWidth: 240, fontWeight: 500 }}>
                        {feedback === "correct" 
                            ? "Fire controlled successfully!" 
                            : (selected ? options.find(o => o.id === selected)?.knowledge : "Wrong choice! Fire is spreading!")}
                    </Typography>
                </Box>
            </Fade>
        )}
      </Box>

      {/* BOTTOM PANEL: Actions */}
      <Box sx={{ px: 2, pb: 2, width: "100%" }}>
        <Box sx={{ ...panelSx, p: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ color: accentColor, fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>CHOOSE YOUR ACTION</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.75rem", mt: 0.5 }}>Select the correct method to extinguish the fire</Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 2, width: "100%", mt: 1 }}>
                {options.map((option) => {
                    const isSelected = selected === option.id;

                    return (
                        <Button
                            key={option.id}
                            onClick={() => handleSelect(option)}
                            disabled={feedback !== "none"}
                            sx={{
                                flex: 1,
                                bgcolor: isSelected ? "rgba(0,74,173,0.08)" : "rgba(0,74,173,0.02)",
                                border: `1.5px solid ${isSelected ? accentColor : "rgba(0,74,173,0.1)"}`,
                                borderRadius: 3,
                                color: "#0f172a",
                                textTransform: "none",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 1.5,
                                py: 2,
                                transition: "all 0.2s",
                                "&:hover": {
                                    bgcolor: "rgba(0,74,173,0.05)",
                                    border: `1.5px solid ${isSelected ? accentColor : "rgba(0,74,173,0.2)"}`
                                },
                                position: "relative",
                                opacity: feedback !== "none" && !isSelected ? 0.5 : 1
                            }}
                        >
                            <Typography sx={{ fontSize: "2rem", lineHeight: 1 }}>{option.emoji}</Typography>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{option.label}</Typography>
                            
                            {/* Selected Checkmark Badge */}
                            {isSelected && (
                                <Box sx={{ position: "absolute", top: -8, right: -8, bgcolor: accentColor, borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <CheckCircleOutlineIcon sx={{ color: "#fff", fontSize: 16 }} />
                                </Box>
                            )}
                        </Button>
                    );
                })}
            </Box>
        </Box>
      </Box>

    </Box>
  );
}
