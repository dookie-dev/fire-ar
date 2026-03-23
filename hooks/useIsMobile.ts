"use client";
import { useState, useEffect } from "react";
import { useTheme, useMediaQuery } from "@mui/material";

export function useIsMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("md"));
}
