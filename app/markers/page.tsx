"use client";
import React, { useState } from "react";
import { Container, Typography, Box, Button, Paper, Alert } from "@mui/material";
import MarkerUploader from "../../components/MarkerUploader";
import Navbar from "../../components/Navbar";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";

export default function MarkersPage() {
  const [processed, setProcessed] = useState(false);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0a", pb: 10 }}>
      <Navbar />
      
      <Container maxWidth="md" sx={{ pt: 15 }}>
        <Button 
          component={Link} 
          href="/" 
          startIcon={<ArrowBackIcon />}
          sx={{ color: "grey.500", mb: 4, "&:hover": { color: "#fff" } }}
        >
          BACK TO HOME
        </Button>

        <Paper sx={{ 
          p: 4, 
          bgcolor: "rgba(20,20,20,0.8)", 
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 4
        }}>
          <Typography variant="h4" sx={{ color: "#fff", fontWeight: 900, mb: 1 }}>
            MARKER MANAGEMENT
          </Typography>
          <Typography sx={{ color: "grey.500", mb: 4 }}>
            Upload, capture, and compile images into high-precision AR tracking files (.mind). 
            A single file can contain multiple targets for simultaneous detection.
          </Typography>

          {processed && (
            <Alert severity="success" sx={{ mb: 4, bgcolor: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
              Targets compiled and saved successfully to the server! They will be automatically used in the training simulation.
            </Alert>
          )}

          <MarkerUploader 
            onProcessed={(data) => {
              console.log("✅ Markers updated on server:", data);
              setProcessed(true);
            }} 
          />
        </Paper>

        <Box sx={{ mt: 6, p: 3, borderRadius: 3, bgcolor: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <Typography variant="subtitle2" sx={{ color: "cyan", fontWeight: 800, mb: 1, textTransform: "uppercase" }}>
            Technical Info
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.600", lineHeight: 1.8 }}>
            • <b>Targets.mind</b>: This binary file stores the neural tracking data for all images.<br />
            • <b>Multi-Tracking</b>: Add multiple images before clicking "Generate" to track them together.<br />
            • <b>Server Sync</b>: Markers are stored at <code>/public/targets.mind</code> and used globally.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
