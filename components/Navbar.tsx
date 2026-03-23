"use client";
import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Link as MuiLink,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Link from "next/link";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Markers", href: "/markers" },
  { label: "Safety Training", href: "#demo" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box 
      onClick={handleDrawerToggle} 
      sx={{ 
        textAlign: "center", 
        bgcolor: "#000", 
        height: "100%", 
        color: "#fff",
        pt: 5 
      }}
    >
      <Typography variant="h6" sx={{ my: 2, fontWeight: 900, color: "#ef4444" }}>
        บุญยืน safety
      </Typography>
      <List>
        {navLinks.map((item) => (
          <ListItem key={item.label} disablePadding>
            <MuiLink
              component={item.href.startsWith("#") ? "a" : Link}
              href={item.href}
              underline="none"
              sx={{
                width: "100%",
                textAlign: "center",
                py: 2,
                color: "grey.400",
                fontWeight: 600,
                "&:hover": { color: "#fff" }
              }}
            >
              <ListItemText primary={item.label} />
            </MuiLink>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <AppBar
      position="fixed"
      sx={{
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(40px)",
        borderBottom: "1px solid rgba(239,68,68,0.2)",
        boxShadow: "0 10px 40px rgba(239,68,68,0.1)",
      }}
    >
      <Toolbar
        sx={{
          maxWidth: 1280,
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: 1,
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <MuiLink
          component={Link}
          href="/"
          underline="none"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            "&:hover": { opacity: 0.8 },
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Box 
              component="img" 
              src="/logo.png" 
              alt="Boonyeun Safety Logo"
              sx={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={(e: any) => { e.target.style.display = 'none'; }}
            />
          </Box>
          <Typography sx={{ fontWeight: 900, color: "#fff", textTransform: "uppercase" }}>
            บุญยืน safety
          </Typography>
        </MuiLink>

        {/* Desktop Nav */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 5 }}>
          {navLinks.map((link) => (
            <MuiLink
              key={link.label}
              component={link.href.startsWith("#") ? "a" : Link}
              href={link.href}
              underline="none"
              sx={{
                color: "grey.400",
                fontWeight: 600,
                fontSize: "0.875rem",
                "&:hover": { color: "#fca5a5" },
              }}
            >
              {link.label}
            </MuiLink>
          ))}
        </Box>

        {/* Mobile menu button */}
        <IconButton
          onClick={handleDrawerToggle}
          sx={{ display: { xs: "flex", md: "none" }, color: "grey.400" }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240, borderLeft: "1px solid rgba(239,68,68,0.2)" },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}
