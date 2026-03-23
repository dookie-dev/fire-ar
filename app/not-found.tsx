"use client";

import { Box, Typography, Button } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Link from "next/link";

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pt: "80px",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: "3.75rem",
            fontWeight: 700,
            mb: 2,
            background: "linear-gradient(to right, #f87171, #fb923c)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </Typography>
        <Typography sx={{ fontSize: "1.25rem", color: "grey.500", mb: 4 }}>
          Oops! Page not found
        </Typography>
        <Typography sx={{ color: "grey.600", mb: 4, maxWidth: 400, mx: "auto" }}>
          This page doesn&apos;t exist yet. Let us know if you&apos;d like us to build it!
        </Typography>
        <Button
          component={Link}
          href="/"
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          sx={{
            background: "linear-gradient(to right, #dc2626, #ea580c)",
            "&:hover": {
              background: "linear-gradient(to right, #ef4444, #f97316)",
            },
            px: 4,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600,
          }}
        >
          Return to Home
        </Button>
      </Box>
    </Box>
  );
}
