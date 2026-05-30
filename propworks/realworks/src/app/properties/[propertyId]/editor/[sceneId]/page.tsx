"use client";

import { useEffect, useState } from "react";
import SceneViewer from "@/components/SceneViewer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Trash2, MapPin, Eye, MousePointer2, Navigation, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addAnnotation, deleteAnnotation, getSceneData } from "./actions";
import { Card } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type AnnotationRecord = {
  id: string;
  sceneId: string;
  label: string;
  description?: string | null;
  type?: string;
  targetSceneId?: string | null;
  positionX: number;
  positionY: number;
  positionZ: number;
};

type PropertyRecord = {
  id: string;
  name: string;
  scenes?: Array<{ id: string; name: string }>;
};

type SceneRecord = {
  id: string;
  name: string;
  originalImageUrl?: string | null;
  thumbnailUrl?: string | null;
  annotations?: AnnotationRecord[];
  property?: PropertyRecord | null;
};

export default function SceneEditorPage({ params }: { params: Promise<{ propertyId: string, sceneId: string }> }) {
  const [scene, setScene] = useState<SceneRecord | null>(null);
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [propId, setPropId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [newPos, setNewPos] = useState<[number, number, number] | null>(null);
  const [annType, setAnnType] = useState("info");

  useEffect(() => {
    params.then(({ propertyId, sceneId }) => {
      setPropId(propertyId);
      getSceneData(sceneId).then(data => {
        if (data) {
          setScene(data as SceneRecord);
          setProperty(data.property as PropertyRecord);
        }
        setLoading(false);
      });
    });
  }, [params]);

  const handleAddAnnotationClick = (pos: [number, number, number]) => {
    if (isAdding) setNewPos(pos);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewPos(null);
    setAnnType("info");
  };

  if (loading || !scene) return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="brand-mark h-10 w-10 text-[18px]">R</div>
        <p className="text-muted-foreground font-medium text-[13px]">Loading Canvas...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      
      {/* 3D Canvas Area */}
      <div className="relative flex-1 bg-surface-muted">
        <div className="absolute inset-0">
          <SceneViewer 
            sceneId={scene.id} 
            initialAnnotations={scene.annotations || []} 
            onAddAnnotation={handleAddAnnotationClick}
            isEditor={true}
            imageUrl={scene.originalImageUrl || scene.thumbnailUrl}
          />
        </div>

        {/* Top Toolbar overlaying Canvas */}
        <header className="pointer-events-none absolute left-5 right-5 top-5 z-20 flex items-center justify-between">
          <div className="pointer-events-auto flex items-center gap-4 rounded-lg border border-border bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md">
            <Link href={`/properties/${propId}`}>
              <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </Link>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/properties/${propId}`} className="font-medium text-muted-foreground transition-colors hover:text-foreground">{property?.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-foreground">{scene.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          <div className="pointer-events-auto flex gap-2">
            <Link href={`/viewer/${propId}`} target="_blank">
              <button className="btn-ghost">
                <Eye className="h-4 w-4" strokeWidth={1.75} /> Preview
              </button>
            </Link>
          </div>
        </header>

        {isAdding && !newPos && (
          <div className="absolute left-1/2 top-24 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-foreground px-5 py-3 text-white shadow-lg">
            <MousePointer2 className="h-4 w-4 animate-pulse" strokeWidth={1.75} />
            <span className="text-[13px] font-semibold">Select a surface for the pin</span>
            <button className="ml-2 h-7 rounded-md border border-white/20 px-3 text-[12px] font-semibold transition-colors hover:bg-white/10" onClick={handleCancel}>Cancel</button>
          </div>
        )}
      </div>

      {/* Right Properties Panel */}
      <aside className="z-30 flex w-[340px] shrink-0 flex-col border-l border-border bg-white">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-6">
          <span className="text-[14px] font-bold text-foreground">Inspector</span>
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="space-y-6 p-5">
            
            {/* Inspector State: Adding New Pin */}
            {isAdding && newPos ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 p-3 text-[13px] font-semibold text-primary">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> Pin ready
                </div>
                
                <form action={async (fd) => {
                  fd.append("type", annType);
                  await addAnnotation(scene.id, newPos, fd);
                  setIsAdding(false);
                  setNewPos(null);
                  window.location.reload();
                }} className="space-y-5">
                  
                  <div className="space-y-2">
                    <Label className="text-kicker">Annotation Type</Label>
                    <Select value={annType} onValueChange={setAnnType}>
                      <SelectTrigger className="h-9 rounded-md border-border text-[13px] shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info Label (Text)</SelectItem>
                        <SelectItem value="hotspot">Scene Link (Hotspot)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="label" className="text-kicker">Label</Label>
                    <Input id="label" name="label" required placeholder={annType === "info" ? "Italian marble" : "Go to kitchen"} className="h-9 rounded-md border-border text-[13px] shadow-sm" />
                  </div>
                  
                  {annType === "info" && (
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-kicker">Details</Label>
                      <Textarea id="description" name="description" placeholder="Brief description" className="h-24 resize-none rounded-md border-border text-[13px] shadow-sm" />
                    </div>
                  )}

                  {annType === "hotspot" && (
                    <div className="space-y-2">
                      <Label htmlFor="targetSceneId" className="text-kicker">Destination Scene</Label>
                      <Select name="targetSceneId" required>
                        <SelectTrigger className="h-9 rounded-md border-border text-[13px] shadow-sm">
                          <SelectValue placeholder="Select a room..." />
                        </SelectTrigger>
                        <SelectContent>
                          {property?.scenes?.filter((s) => s.id !== scene.id).map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-3 border-t border-border pt-4">
                    <button type="button" className="btn-ghost flex-1" onClick={handleCancel}>Cancel</button>
                    <button type="submit" className="btn-primary flex-1">Create Pin</button>
                  </div>
                </form>
              </div>
            ) : (
              /* Inspector State: Idle / List Annotations */
              <div className="space-y-6">
                <button 
                  onClick={() => setIsAdding(true)} 
                  className="btn-ghost w-full justify-center border-dashed"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} /> Add Annotation Pin
                </button>

                <div className="space-y-3">
                  <div className="text-kicker py-1">Existing Elements</div>
                  
                  {scene.annotations?.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-surface-muted py-10 text-center">
                      <p className="text-[13px] text-muted-foreground font-medium">No pins in this scene.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {scene.annotations?.map((ann: AnnotationRecord) => (
                        <Card key={ann.id} className="group p-3 shadow-sm transition-colors hover:border-border-strong">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="rounded-md border border-border bg-surface-muted p-1.5 text-foreground">
                                {ann.type === 'hotspot' ? (
                                  <Navigation className="h-4 w-4" strokeWidth={1.75} />
                                ) : (
                                  <MapPin className="h-4 w-4" strokeWidth={1.75} />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-[13px] leading-tight text-foreground">{ann.label}</p>
                                <p className="mt-1 text-[11px] font-semibold uppercase text-muted-foreground">{ann.type}</p>
                              </div>
                            </div>
                            <form action={async () => {
                              await deleteAnnotation(ann.sceneId, ann.id);
                              window.location.reload();
                            }}>
                              <button type="submit" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-surface-muted hover:text-destructive group-hover:opacity-100">
                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                              </button>
                            </form>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
