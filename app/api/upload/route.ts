import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mindData = formData.get("mindData") as File | null;
    const targetCount = formData.get("targetCount") || "1";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Save Source Image
    const bytes = await file.arrayBuffer();
    const imageBlob = await put("marker-tracking.png", bytes, { 
      access: "private",
      addRandomSuffix: false
    });

    let mindPath = null;

    // Save Compiled .mind File
    if (mindData) {
      const mindBytes = await mindData.arrayBuffer();
      const mindBlob = await put("targets.mind", mindBytes, {
        access: "private",
        addRandomSuffix: false
      });
      mindPath = mindBlob.url;
      
      // Save Config
      await put("marker-config.json", JSON.stringify({ targetCount: parseInt(targetCount.toString()) }), {
        access: "private",
        addRandomSuffix: false
      });
      
      console.log(`✅ Binary marker (.mind) and config saved to PRIVATE Vercel Blob for ${targetCount} targets.`);
    }

    return NextResponse.json({ 
      success: true, 
      path: imageBlob.url, 
      mindPath: mindPath,
      targetCount: parseInt(targetCount.toString()) 
    });
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return NextResponse.json({ 
      error: "Failed to save marker", 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileToGet = searchParams.get("file");
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    const { blobs } = await list();

    // Proxy Mode: Fetch and stream private blob content
    if (fileToGet) {
      const blob = blobs.find((b: any) => b.pathname === fileToGet);
      if (!blob) return NextResponse.json({ error: "File not found" }, { status: 404 });

      const res = await fetch(blob.url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to fetch blob from Vercel: ${res.status} ${res.statusText} - ${body}`);
      }

      const data = await res.arrayBuffer();
      
      return new NextResponse(data, {
        headers: {
          "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }

    // List Mode: Return metadata
    const configBlob = blobs.find((b: any) => b.pathname === "marker-config.json");
    const mindBlob = blobs.find((b: any) => b.pathname === "targets.mind");
    const imageBlob = blobs.find((b: any) => b.pathname === "marker-tracking.png");

    let targetCount = 1;
    if (configBlob) {
      try {
        const configRes = await fetch(configBlob.url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (configRes.ok) {
          const text = await configRes.text();
          try {
            const configJson = JSON.parse(text);
            targetCount = configJson.targetCount || 1;
          } catch (e) {
            console.error("❌ Config parse error. Body was:", text);
          }
        }
      } catch (e: any) {
        console.warn("Could not fetch config:", e.message);
      }
    }

    return NextResponse.json({
      targetCount,
      mindUrl: mindBlob ? "/api/upload?file=targets.mind" : null,
      imageUrl: imageBlob ? "/api/upload?file=marker-tracking.png" : null
    });
  } catch (error: any) {
    console.error("❌ API Error:", error.message);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
