"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getDashboardData() {
  let workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "Default Workspace",
      }
    });
  }

  const properties = await prisma.property.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      scenes: {
        take: 1,
        orderBy: { updatedAt: 'desc' },
        select: {
          name: true,
          thumbnailUrl: true,
          originalImageUrl: true,
        }
      },
      _count: {
        select: { scenes: true, leads: true }
      }
    }
  });

  return { workspace, properties };
}

export async function createProperty() {
  const ws = await prisma.workspace.findFirst();
  if (ws) {
    const newProp = await prisma.property.create({
      data: {
        workspaceId: ws.id,
        name: "New Property",
        status: "draft"
      }
    });
    redirect(`/properties/${newProp.id}`);
  }
}

export async function deleteProperty(propertyId: string) {
  await prisma.property.delete({
    where: { id: propertyId }
  });
}
