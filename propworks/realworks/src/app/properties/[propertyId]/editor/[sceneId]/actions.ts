"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteProperty(propertyId: string) {
  await prisma.property.delete({
    where: { id: propertyId }
  });
  revalidatePath("/");
}

export async function addAnnotation(sceneId: string, position: [number, number, number], fd: FormData) {
  const label = fd.get("label") as string;
  const description = fd.get("description") as string;
  const type = (fd.get("type") as string) || "info";
  const targetSceneId = (fd.get("targetSceneId") as string) || null;

  await prisma.annotation.create({
    data: {
      sceneId,
      label,
      description,
      type,
      targetSceneId: type === "hotspot" ? targetSceneId : null,
      positionX: position[0],
      positionY: position[1],
      positionZ: position[2],
    }
  });
  
  revalidatePath(`/properties/[propertyId]/editor/${sceneId}`);
}

export async function deleteAnnotation(sceneId: string, annotationId: string) {
  await prisma.annotation.delete({
    where: { id: annotationId }
  });
  revalidatePath(`/properties/[propertyId]/editor/${sceneId}`);
}

export async function getSceneData(sceneId: string) {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    include: {
      annotations: true,
      property: {
        include: {
          scenes: true
        }
      }
    }
  });
  return scene;
}
