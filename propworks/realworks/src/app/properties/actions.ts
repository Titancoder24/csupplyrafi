"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProperty(propertyId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const location = formData.get("location") as string;
  const priceRange = formData.get("priceRange") as string;
  
  await prisma.property.update({
    where: { id: propertyId },
    data: { name, location, priceRange }
  });
  revalidatePath(`/properties/${propertyId}`);
}

import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function createScene(propertyId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const image = formData.get("image") as File | null;
  
  let thumbnailUrl = null;
  if (image && image.size > 0) {
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // Ignore if dir already exists
    }
    
    await writeFile(path.join(uploadDir, filename), buffer);
    thumbnailUrl = `/uploads/${filename}`;
  }
  
  await prisma.scene.create({
    data: {
      propertyId,
      name,
      generationStatus: "generated", // mock status
      thumbnailUrl,
      originalImageUrl: thumbnailUrl,
    }
  });
  revalidatePath(`/properties/${propertyId}`);
}

export async function uploadSceneImage(sceneId: string, propertyId: string, formData: FormData) {
  const image = formData.get("image") as File | null;
  
  if (image && image.size > 0) {
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // Ignore if dir already exists
    }
    
    await writeFile(path.join(uploadDir, filename), buffer);
    const thumbnailUrl = `/uploads/${filename}`;
    
    await prisma.scene.update({
      where: { id: sceneId },
      data: {
        thumbnailUrl,
        originalImageUrl: thumbnailUrl,
      }
    });
    revalidatePath(`/properties/${propertyId}`);
  }
}

export async function getPropertyData(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      scenes: true,
      leads: true,
      documents: true,
    }
  });
}

import { after } from "next/server";

export async function generateWorldLabsScene(propertyId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const images = formData.getAll("images") as File[];
  
  let thumbnailUrl = null;
  const firstImage = images.length > 0 ? images[0] : null;
  
  if (firstImage && firstImage.size > 0) {
    const bytes = await firstImage.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `wl-${Date.now()}-${firstImage.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    try {
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      thumbnailUrl = `/uploads/${filename}`;
    } catch {
      console.warn("Could not write to public/uploads (Vercel read-only filesystem). Proceeding without thumbnail.");
    }
  }

  // Create Scene instantly so UI unlocks in milliseconds
  await prisma.scene.create({
    data: {
      propertyId,
      name,
      generationStatus: "generated", // Marked as generated instantly
      thumbnailUrl,
      originalImageUrl: thumbnailUrl,
    }
  });
  
  // Use next/server's `after` to stream the payload to World Labs fully in the background
  // This guarantees the client UI isn't blocked by the API network transfer.
  after(async () => {
    const apiKey = "yj8ad20CwFCE3NTF5NRNJYmpDO4cSK85";
    const wlFormData = new FormData();
    images.forEach(image => {
      wlFormData.append("images", image);
    });

    try {
      const response = await fetch("https://api.worldlabs.ai/marble/v1/worlds:generate", {
        method: "POST",
        headers: {
          "WLT-Api-Key": apiKey,
          "Accept": "application/json"
        },
        body: wlFormData
      });

      if (!response.ok) {
        console.error("World Labs API Error:", await response.text());
      } else {
        const data = await response.json();
        console.log("World Labs API Operation Started:", data.operation_id);
      }
    } catch (error) {
      console.error("Failed to fetch World Labs:", error);
    }
  });

  revalidatePath(`/properties/${propertyId}`);
}
