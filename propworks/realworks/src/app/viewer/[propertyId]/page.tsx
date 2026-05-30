import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import SceneViewer from "@/components/SceneViewer";
import AiAssistant from "@/components/AiAssistant";
import { Button } from "@/components/ui/button";
import { Users, Phone, Calendar, Heart, Share2 } from "lucide-react";

export default async function ViewerView({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;

  // Fetch property and its scenes
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      scenes: {
        include: { annotations: true }
      }
    }
  });

  if (!property) {
    notFound();
  }

  const defaultScene = property.scenes[0];

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0d171f] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-black/55 to-transparent" />

      <header className="pointer-events-none absolute left-4 right-4 top-4 z-20 flex flex-col gap-3 rounded-lg border border-white/10 bg-[rgba(17,24,39,0.84)] p-4 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-start lg:justify-between">
        <div className="pointer-events-auto flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/10 text-xl font-bold text-white">
            {property.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-white">{property.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-white/75">
              {property.location}
              <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold text-white">
                {property.priceRange || "Price on Request"}
              </span>
            </p>
          </div>
        </div>
        
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-md border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Heart className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button variant="outline" size="icon" className="mr-1 h-10 w-10 rounded-md border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Share2 className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button variant="secondary" className="h-10 rounded-md border border-white/15 bg-white/10 px-4 text-white hover:bg-white/20 hover:text-white">
            <Users className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden md:inline">Invite Family</span>
          </Button>
          <Button className="h-10 rounded-md border-0 bg-white px-4 text-foreground hover:bg-surface-muted">
            <Phone className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden md:inline">WhatsApp Sales</span>
          </Button>
          <Button className="h-10 rounded-md border-0 bg-primary px-4 text-white hover:bg-[var(--viridian-600)]">
            <Calendar className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden md:inline">Book Visit</span>
          </Button>
        </div>
      </header>

      {/* 3D Scene */}
      <main className="relative z-0 h-full w-full flex-1">
        {defaultScene ? (
          <SceneViewer 
            sceneId={defaultScene.id} 
            initialAnnotations={defaultScene.annotations} 
            isEditor={false}
            imageUrl={defaultScene.originalImageUrl || defaultScene.thumbnailUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#0d171f]">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full border-2 border-white/20 border-t-primary animate-spin" />
              <p className="text-sm font-semibold text-white/50">Loading tour...</p>
            </div>
          </div>
        )}
      </main>

      {/* Room Navigation (Bottom) */}
      {property.scenes.length > 0 && (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
          <div className="flex max-w-[90vw] gap-1.5 overflow-x-auto rounded-lg border border-white/10 bg-[rgba(17,24,39,0.84)] p-1.5 shadow-2xl backdrop-blur-xl">
            {property.scenes.map((scene) => (
              <button 
                key={scene.id}
                className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  scene.id === defaultScene?.id 
                    ? 'bg-white text-[var(--brand-navy)] shadow-sm' 
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {scene.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Assistant */}
      <AiAssistant />
    </div>
  );
}
