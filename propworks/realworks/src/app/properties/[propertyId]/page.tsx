"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  BarChart,
  BarChart3,
  Camera,
  ChevronDown,
  Database,
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { useFormStatus } from "react-dom";
import { deleteProperty } from "../../actions";
import { createScene, generateWorldLabsScene, getPropertyData, updateProperty, uploadSceneImage } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TabId = "scenes" | "knowledge" | "settings" | "leads" | "analytics";

type SceneRecord = {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
  originalImageUrl?: string | null;
  generationStatus?: string | null;
};

type DocumentRecord = {
  id: string;
  name?: string | null;
  fileUrl?: string | null;
  status?: string | null;
};

type LeadRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  intentScore?: number | null;
  status?: string | null;
};

type PropertyRecord = {
  id: string;
  name: string;
  location?: string | null;
  priceRange?: string | null;
  scenes: SceneRecord[];
  documents?: DocumentRecord[];
  leads?: LeadRecord[];
};

const navGroups: Array<{
  label: string;
  items: Array<{ id: TabId; label: string; icon: LucideIcon }>;
}> = [
  {
    label: "Build",
    items: [
      { id: "scenes", label: "Scenes", icon: Camera },
      { id: "knowledge", label: "Knowledge Base", icon: Database },
      { id: "settings", label: "Settings", icon: Settings2 },
    ],
  },
  {
    label: "Measure",
    items: [
      { id: "leads", label: "Captured Leads", icon: Users },
      { id: "analytics", label: "Insights", icon: BarChart3 },
    ],
  },
];

function SubmitButton({
  defaultText,
  pendingText,
  className,
}: {
  defaultText: string;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn-primary mt-1 h-8 w-full py-0 text-[12.5px] ${className || ""}`}
    >
      {pending ? (
        <>
          <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          {pendingText}
        </>
      ) : (
        defaultText
      )}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <Card className="flex min-h-[260px] flex-col items-center justify-center border-dashed bg-white/70 p-10 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface-muted text-muted-foreground">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h3 className="mb-2 text-[16px] font-bold text-foreground">{title}</h3>
      <p className="max-w-[330px] text-[13px] font-medium leading-6 text-muted-foreground">{body}</p>
    </Card>
  );
}

function ListingPreview({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={`${name} preview`}
        fill
        sizes="(min-width: 1024px) 360px, 100vw"
        className="object-cover"
        loading="eager"
        unoptimized
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff,#eff6ff_58%,#f8fafc)]">
      <div className="absolute inset-x-8 bottom-0 flex h-32 items-end gap-2">
        <div className="h-16 flex-1 rounded-t-md bg-white/80 shadow-sm ring-1 ring-slate-200" />
        <div className="h-28 flex-1 rounded-t-md bg-white shadow-sm ring-1 ring-slate-200" />
        <div className="h-20 flex-1 rounded-t-md bg-white/90 shadow-sm ring-1 ring-slate-200" />
      </div>
      <div className="absolute left-6 top-6 h-2 w-24 rounded-full bg-[var(--viridian-500)]/25" />
      <div className="absolute left-6 top-11 h-2 w-14 rounded-full bg-[var(--viridian-700)]/20" />
    </div>
  );
}

export default function PropertyPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [propId, setPropId] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("scenes");

  useEffect(() => {
    params.then(({ propertyId }) => {
      setPropId(propertyId);
      getPropertyData(propertyId).then((data) => {
        if (!data) notFound();
        setProperty(data as PropertyRecord);
        setLoading(false);
      });
    });
  }, [params]);

  const sceneCount = property?.scenes?.length || 0;
  const leadCount = property?.leads?.length || 0;
  const documentCount = property?.documents?.length || 0;

  const leadScoreAverage = useMemo(() => {
    if (!property?.leads?.length) return 0;
    return Math.round(
      property.leads.reduce((acc: number, lead: LeadRecord) => acc + (lead.intentScore || 0), 0) / property.leads.length
    );
  }, [property]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="brand-mark h-10 w-10 text-[18px]">R</div>
          <p className="text-[13px] font-semibold text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    notFound();
  }

  const documents = property.documents || [];
  const leads = property.leads || [];
  const previewImage = property.scenes[0]?.thumbnailUrl || property.scenes[0]?.originalImageUrl;
  const listingReadiness = Math.min(100, Math.round((sceneCount / 2) * 100));
  const insightStats: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: "Tour Scenes", value: sceneCount, icon: Layers },
    { label: "Lead Records", value: leadCount, icon: Users },
    { label: "Avg Intent", value: leadScoreAverage, icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="z-30 flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <Link href="/">
            <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </Link>
          <div className="min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="font-semibold text-muted-foreground transition-colors hover:text-foreground">Properties</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground truncate">{property.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="mt-0.5 hidden items-center gap-1.5 text-[12px] font-medium text-muted-foreground sm:flex">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
              {property.location || "Location not set"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/viewer/${property.id}`} target="_blank">
            <button className="btn-ghost h-9 px-3 md:px-4">
              <LinkIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Preview Tour</span>
            </button>
          </Link>
          <button className="btn-primary h-9 px-4 md:px-5">Publish</button>
        </div>
      </header>

      <SidebarProvider className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar className="border-r border-border bg-sidebar mt-[52px] h-[calc(100vh-52px)]">
          <SidebarHeader className="flex h-16 items-center justify-between px-5 py-0 border-b-0">
            <Link href="/" className="flex items-center gap-3 text-[15px] font-bold text-foreground transition-opacity hover:opacity-85">
              <div className="brand-mark h-8 w-8 text-[14px]">R</div>
              Realworks
            </Link>
            <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          </SidebarHeader>

          <div className="px-4 pb-2 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <input
                placeholder="Search workspace"
                className="search-input h-9 w-full rounded-md border border-border bg-surface-muted py-2 pl-9 pr-3 text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <div className="px-3 pb-2 pt-1 text-kicker">{group.label}</div>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={active}
                          onClick={() => setActiveTab(item.id)}
                          className={`h-9 px-3 ${active ? "bg-[var(--sidebar-accent)] font-semibold text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}
                        >
                          <Icon className="h-4 w-4 mr-2" strokeWidth={1.75} />
                          {item.label}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        <main className="min-w-0 flex-1 overflow-y-auto bg-[var(--workspace-bg)]">
          {activeTab === "scenes" && (
            <div className="mx-auto max-w-[1280px] p-5 md:p-8">
              <Card className="mb-6 overflow-hidden border-border shadow-sm">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="p-5 md:p-6">
                    <Badge className="mb-4 bg-primary text-primary-foreground border-transparent hover:bg-primary/90">
                      <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Listing builder
                    </Badge>
                    <h2 className="text-[26px] font-bold leading-tight text-foreground">{property.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {property.location || "Location not set"}
                      </span>
                      <span className="rounded-md border border-border bg-surface-muted px-2 py-1 text-[12px] font-bold text-foreground">
                        {property.priceRange || "Price on request"}
                      </span>
                    </div>

                    <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-surface-muted">
                      {[
                        ["Scenes", sceneCount],
                        ["Leads", leadCount],
                        ["Docs", documentCount],
                      ].map(([label, value]) => (
                        <div key={label} className="border-r border-border px-4 py-3 last:border-r-0">
                          <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
                          <div className="mt-1 text-[22px] font-bold text-foreground">{value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-[12px] font-semibold">
                        <span className="text-muted-foreground">Tour readiness</span>
                        <span className="text-foreground">{listingReadiness}%</span>
                      </div>
                      <Progress value={listingReadiness} className="h-2 bg-surface-2" />
                    </div>
                  </div>
                  <div className="relative min-h-[260px] border-t border-border bg-surface-muted lg:border-l lg:border-t-0">
                    <ListingPreview imageUrl={previewImage} name={property.name} />
                  </div>
                </div>
              </Card>

              <div className="mb-4">
                <h3 className="text-[18px] font-bold text-foreground">Scene library</h3>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground">Upload source media, generate walkthrough scenes, and open the canvas editor.</p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <Card className="flex min-h-[274px] flex-col border-dashed p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="icon-tile icon-tile-viridian h-10 w-10 shrink-0">
                      <Plus className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-foreground">Add Scene</h3>
                      <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">Upload source media.</p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-3">
                    <form action={(fd) => createScene(propId, fd)} className="rounded-md border border-border bg-surface-muted p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="rounded-md border border-border bg-white p-1.5 text-primary shadow-sm">
                          <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                        <span className="text-[12.5px] font-bold text-foreground">2D Image</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <Input name="image" type="file" accept="image/*" required className="h-8 bg-white px-2 text-[11px]" />
                        <Input name="name" placeholder="Scene name" required className="h-8 bg-white text-[12px]" />
                      </div>
                      <SubmitButton defaultText="Create Scene" pendingText="Uploading..." />
                    </form>

                    <form action={(fd) => generateWorldLabsScene(propId, fd)} className="rounded-md border border-[var(--viridian-100)] bg-[var(--viridian-50)]/70 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="rounded-md border border-[var(--viridian-100)] bg-white p-1.5 text-primary shadow-sm">
                          <Globe className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                        <span className="text-[12.5px] font-bold text-foreground">3D Generation</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <Input name="images" type="file" accept="image/*" capture="environment" multiple required className="h-8 bg-white px-2 text-[11px]" />
                        <Input name="name" placeholder="Scene name" required className="h-8 bg-white text-[12px]" />
                      </div>
                      <SubmitButton defaultText="Generate 3D" pendingText="Uploading..." />
                    </form>
                  </div>
                </Card>

                {property.scenes.map((scene: SceneRecord, sceneIndex: number) => (
                  <Card key={scene.id} className="group flex h-[274px] flex-col overflow-hidden animate-fade-in-up" style={{ animationDelay: `${sceneIndex * 70}ms` }}>
                    <div className="relative flex flex-1 items-center justify-center overflow-hidden border-b border-border bg-surface-2">
                      {scene.thumbnailUrl ? (
                        <Image
                          src={scene.thumbnailUrl}
                          alt={scene.name}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="scene-image-hover"
                          loading="eager"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-white text-muted-foreground shadow-sm transition-colors group-hover:text-primary">
                          <Camera className="h-5 w-5" strokeWidth={1.75} />
                        </div>
                      )}

                      {scene.generationStatus === "processing" ? (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[rgba(17,24,39,0.82)] backdrop-blur-sm">
                          <div className="relative flex items-center justify-center">
                            <div className="pulse-ring" />
                            <div className="mb-0 h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                          </div>
                          <span className="mt-3 text-[12px] font-semibold text-white">Generating 3D</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[rgba(17,24,39,0.46)] opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                          {!scene.thumbnailUrl && (
                            <form action={(fd) => uploadSceneImage(scene.id, property.id, fd)}>
                              <label className="flex h-8 cursor-pointer items-center justify-center rounded-md bg-white px-4 text-[12px] font-semibold text-foreground shadow-sm transition-colors hover:bg-surface-hover">
                                <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                                Add Image
                                <input
                                  type="file"
                                  name="image"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(event) => {
                                    if (event.target.files && event.target.files.length > 0) {
                                      event.target.form?.requestSubmit();
                                    }
                                  }}
                                />
                              </label>
                            </form>
                          )}
                          <Link href={`/properties/${property.id}/editor/${scene.id}`}>
                            <button className="btn-primary h-8 px-4 text-[12px]">
                              <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                              Edit Canvas
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center justify-between bg-white p-3.5">
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-bold text-foreground transition-colors group-hover:text-primary">{scene.name}</div>
                        <div className="mt-1 text-[11px] font-semibold capitalize text-muted-foreground">{scene.generationStatus}</div>
                      </div>
                      <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "knowledge" && (
            <div className="mx-auto max-w-[880px] p-5 md:p-8">
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-foreground">Knowledge Base</h2>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                  Source material for accurate buyer responses and sales context.
                </p>
              </div>

              <div className="mb-6 flex min-h-[180px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--viridian-100)] bg-[var(--viridian-50)]/60 p-10 text-center transition-colors hover:bg-[var(--viridian-50)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[var(--viridian-100)] bg-white text-primary shadow-sm">
                  <Upload className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <p className="text-[15px] font-bold text-foreground">Upload documents</p>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground">PDF, DOCX, and TXT files up to 10MB</p>
              </div>

              <Card className="overflow-hidden">
                <div className="border-b border-border bg-surface-muted px-5 py-4">
                  <h3 className="text-kicker">Uploaded Documents</h3>
                </div>
                {documents.length > 0 ? (
                  <div className="divide-y divide-border bg-white">
                    {documents.map((doc: DocumentRecord) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 transition-colors hover:bg-surface-hover">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="icon-tile icon-tile-viridian h-9 w-9">
                            <FileText className="h-4 w-4" strokeWidth={1.75} />
                          </div>
                          <span className="truncate text-[14px] font-semibold text-foreground">
                            {doc.name || doc.fileUrl?.split("/").pop() || "Document"}
                          </span>
                        </div>
                        <Badge variant="default">{doc.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center bg-white p-10 text-center">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface-muted text-muted-foreground">
                      <FileText className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="mb-2 text-[16px] font-bold text-foreground">No documents uploaded</h3>
                    <p className="max-w-[340px] text-[13px] font-medium leading-6 text-muted-foreground">
                      Add sales brochures, floorplans, or pricing sheets when this listing is ready for buyer questions.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="mx-auto max-w-[680px] p-5 md:p-8">
              <Card className="p-6 md:p-8">
                <div className="mb-7 border-b border-border pb-5">
                  <h2 className="text-[22px] font-bold text-foreground">Property Settings</h2>
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground">Core listing metadata and public tour details.</p>
                </div>

                <form action={(fd) => updateProperty(propId, fd)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-kicker">Property Name</Label>
                    <Input id="name" name="name" defaultValue={property.name} className="h-10 text-[14px] font-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-kicker">Location</Label>
                    <Input id="location" name="location" defaultValue={property.location || ""} className="h-10 text-[14px] font-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceRange" className="text-kicker">Price Range</Label>
                    <Input id="priceRange" name="priceRange" defaultValue={property.priceRange || ""} className="h-10 text-[14px] font-medium" />
                  </div>
                  <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
                    <button type="submit" className="btn-primary h-10 px-6 text-[14px]">Save Changes</button>
                    <button
                      type="button"
                      className="btn-danger h-10 px-6 text-[14px]"
                      onClick={async () => {
                        if (confirm("Delete this property?")) {
                          await deleteProperty(property.id);
                          window.location.href = "/";
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      Delete Property
                    </button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {activeTab === "leads" && (
            <div className="mx-auto max-w-[960px] p-5 md:p-8">
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-foreground">Captured Leads</h2>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground">Buyer activity and contact records from the public tour.</p>
              </div>

              {leads.length > 0 ? (
                <Card className="overflow-hidden">
                  <div className="grid grid-cols-[1.4fr_1fr_90px_100px] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-kicker">
                    <span>Lead</span>
                    <span>Contact</span>
                    <span>Intent</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-border bg-white">
                    {leads.map((lead: LeadRecord) => (
                      <div key={lead.id} className="grid grid-cols-[1.4fr_1fr_90px_100px] gap-4 px-5 py-4 text-[13px] font-medium">
                        <span className="font-bold text-foreground">{lead.name || "Unnamed lead"}</span>
                        <span className="truncate text-muted-foreground">{lead.email || lead.phone || "No contact"}</span>
                        <span className="font-bold text-foreground">{lead.intentScore || 0}</span>
                        <span className="status-pill status-published">{lead.status}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No leads yet"
                  body="Publish the tour and share it with prospects to start collecting buyer intent data."
                />
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="mx-auto max-w-[1040px] p-5 md:p-8">
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-foreground">Insights</h2>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground">Tour readiness and engagement signals for this listing.</p>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {insightStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={stat.label} className="p-5">
                      <div className="icon-tile icon-tile-viridian mb-4 h-10 w-10">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="text-kicker">{stat.label}</div>
                      <div className="mt-2 text-3xl font-bold text-foreground">{stat.value}</div>
                    </Card>
                  );
                })}
              </div>

              <Card className="p-8 text-center">
                <div className="icon-tile icon-tile-viridian mx-auto mb-5 h-14 w-14">
                  <BarChart className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h3 className="mb-2 text-[18px] font-bold text-foreground">Engagement Summary</h3>
                <p className="mx-auto max-w-[460px] text-[13px] font-medium leading-6 text-muted-foreground">
                  Scene visits, annotation clicks, and lead session data will appear here as the tour receives traffic.
                </p>
              </Card>
            </div>
          )}
        </main>
      </SidebarProvider>
    </div>
  );
}
