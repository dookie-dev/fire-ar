import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import ThemeRegistry from "@/lib/ThemeRegistry";
import Navbar from "@/components/Navbar";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "thai"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Boonyeun Safety - Fire AR Training",
  description: "Immersive AR training for real-world emergency scenarios",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning className={kanit.className}>
      <body suppressHydrationWarning>
        <ThemeRegistry>
          <Navbar />
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
