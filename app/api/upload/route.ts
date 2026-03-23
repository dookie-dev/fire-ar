import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mindData = formData.get("mindData") as File | null;
    const targetCount = formData.get("targetCount") || "1"; // Number of images in .mind

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const publicPath = path.join(process.cwd(), "public");

    // Save Source Image
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(publicPath, "marker-tracking.png");
    await fs.writeFile(filePath, buffer);

    // Save Compiled .mind File
    if (mindData) {
      const mindBytes = await mindData.arrayBuffer();
      const mindBuffer = Buffer.from(mindBytes);
      const mindFilePath = path.join(publicPath, "targets.mind");
      await fs.writeFile(mindFilePath, mindBuffer);
      
      // Save Config (Target Count)
      const configPath = path.join(publicPath, "marker-config.json");
      await fs.writeFile(configPath, JSON.stringify({ targetCount: parseInt(targetCount.toString()) }));
      
      console.log(`✅ Binary marker (.mind) and config saved for ${targetCount} targets.`);
    }

    return NextResponse.json({ 
      success: true, 
      path: "/marker-tracking.png", 
      mindPath: mindData ? "/targets.mind" : null,
      targetCount: parseInt(targetCount.toString()) 
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json({ error: "Failed to save marker" }, { status: 500 });
  }
}
