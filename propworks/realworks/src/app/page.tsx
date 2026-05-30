"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Activity,
  BarChart4,
  Briefcase,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Files,
  History,
  Home,
  LayoutDashboard,
  Layers,
  MapPin,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createProperty, deleteProperty, getDashboardData } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
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

type DashboardData = {
  workspace: {
    name: string;
  };
  properties: Array<{
    id: string;
    name: string;
    location?: string | null;
    priceRange?: string | null;
    status?: string | null;
    _count?: {
      scenes?: number;
      leads?: number;
    };
    scenes?: Array<{
      name?: string | null;
      thumbnailUrl?: string | null;
      originalImageUrl?: string | null;
    }>;
    leads?: unknown[];
  }>;
};

const navItems = [
  { id: "team", label: "Workspace", icon: Briefcase },
  { id: "all", label: "All Properties", icon: LayoutDashboard },
  { id: "recents", label: "Recently Updated", icon: History },
  { id: "drafts", label: "Drafts", icon: Files },
];

function statTone(index: number) {
  return [
    { tile: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400", accent: "stat-accent-blue" },
    { tile: "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400", accent: "stat-accent-amber" },
    { tile: "bg-cyan-50 border-cyan-100 text-cyan-600 dark:bg-cyan-950/30 dark:border-cyan-900/50 dark:text-cyan-400", accent: "stat-accent-emerald" },
    { tile: "bg-fuchsia-50 border-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/30 dark:border-fuchsia-900/50 dark:text-fuchsia-400", accent: "stat-accent-purple" },
  ][index % 4];
}

function PropertyVisual({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={`${name} preview`}
        fill
        sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        loading="eager"
        unoptimized
      />
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_62%,#f8fafc_100%)]">
      <div className="absolute inset-x-6 bottom-0 flex h-28 items-end gap-2">
        <div className="h-16 flex-1 rounded-t-md bg-white/85 shadow-sm ring-1 ring-slate-200" />
        <div className="h-24 flex-1 rounded-t-md bg-white shadow-sm ring-1 ring-slate-200" />
        <div className="h-20 flex-1 rounded-t-md bg-white/90 shadow-sm ring-1 ring-slate-200" />
        <div className="h-12 flex-1 rounded-t-md bg-white/75 shadow-sm ring-1 ring-slate-200" />
      </div>
      <div className="absolute left-5 top-5 h-10 w-16 rounded-md border border-white/80 bg-white/60 shadow-sm" />
      <div className="absolute right-5 top-6 h-1.5 w-20 rounded-full bg-[var(--viridian-500)]/25" />
      <div className="absolute right-5 top-11 h-1.5 w-12 rounded-full bg-[var(--viridian-700)]/20" />
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = useCallback(() => {
    getDashboardData().then((result) => setData(result as DashboardData));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (e: MouseEvent, propertyId: string) => {
    e.preventDefault();
    if (confirm("Delete this property? This cannot be undone.")) {
      await deleteProperty(propertyId);
      fetchData();
    }
  };

  const filteredProperties = useMemo(() => {
    if (!data) return [];

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return data.properties.filter((property) => {
      const matchesSearch =
        !normalizedSearch ||
        property.name?.toLowerCase().includes(normalizedSearch) ||
        property.location?.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (activeTab === "drafts") return (property.status || "draft") === "draft";

      return true;
    });
  }, [activeTab, data, searchTerm]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="brand-mark h-10 w-10 text-[18px]">R</div>
          <p className="text-[13px] font-semibold text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const { workspace, properties } = data;
  const totalScenes = properties.reduce((acc, p) => acc + (p._count?.scenes || 0), 0);
  const totalLeads = properties.reduce((acc, p) => acc + (p._count?.leads || 0), 0);
  const draftCount = properties.filter((property) => (property.status || "draft") === "draft").length;
  const averageScenes = properties.length ? Math.round((totalScenes / properties.length) * 10) / 10 : 0;
  const tourReadiness = Math.min(100, Math.round((totalScenes / Math.max(properties.length * 2, 1)) * 100));
  const featuredProperty = properties[0];
  const statCards = [
    { label: "Properties", value: properties.length, trend: "+10.5%", icon: Home },
    { label: "Scenes", value: totalScenes, trend: "+13.5%", icon: Layers },
    { label: "Leads", value: totalLeads, trend: totalLeads > 0 ? "+4.0%" : "0.0%", icon: Users },
    { label: "Drafts", value: draftCount, trend: "Review", icon: Activity },
  ];

  return (
    <SidebarProvider>
    <div className="flex min-h-screen w-full flex-col bg-[var(--workspace-bg)] text-foreground md:flex-row">
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-white px-4 shadow-sm md:hidden">
        <div className="flex items-center gap-3 text-[15px] font-bold text-foreground">
          <div className="brand-mark h-8 w-8 text-[14px]">R</div>
          Realworks
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-hover text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <Sidebar className="border-r border-border bg-sidebar">
        <SidebarHeader className="flex h-16 items-center justify-between px-5 py-0 border-b-0">
          <div className="flex items-center gap-3 text-[15px] font-bold">
            <div className="brand-mark h-8 w-8 text-[14px]">R</div>
            Realworks
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        </SidebarHeader>

        <div className="px-4 pb-2 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search properties"
              className="search-input h-9 w-full rounded-md border border-border bg-surface-muted py-2 pl-9 pr-3 text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <SidebarContent>
          <SidebarGroup>
            <div className="px-3 pb-2 pt-1 text-kicker">Operate</div>
            <SidebarMenu>
              {navItems.slice(0, 2).map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`h-9 px-3 ${activeTab === item.id ? "bg-[var(--sidebar-accent)] font-semibold text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}
                    >
                      <Icon className="h-4 w-4 mr-2" strokeWidth={1.75} />
                      {item.id === "team" ? workspace.name : item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <div className="px-3 pb-2 pt-1 text-kicker">Workflows</div>
            <SidebarMenu>
              {navItems.slice(2).map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`h-9 px-3 ${activeTab === item.id ? "bg-[var(--sidebar-accent)] font-semibold text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}
                    >
                      <Icon className="h-4 w-4 mr-2" strokeWidth={1.75} />
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2 text-foreground transition-colors hover:bg-surface-muted">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-muted text-[12px] font-bold text-foreground">
              K
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-foreground">Karthikeyan</div>
              <div className="text-[11px] font-medium text-muted-foreground">Admin account</div>
            </div>
          </div>
        </div>
      </Sidebar>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[rgba(245,247,250,0.94)] backdrop-blur-md">
          <div className="brand-mark mb-5 h-14 w-14 text-white shadow-xl">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mb-1 text-2xl font-bold text-foreground">Creating property</h2>
          <p className="text-[14px] font-medium text-muted-foreground">Preparing scenes, tour settings, and lead capture.</p>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-16 z-20 flex h-[52px] shrink-0 items-center justify-between gap-4 border-b border-border bg-white/95 px-5 backdrop-blur-md md:top-0 md:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
              <span>Home</span>
              <span className="text-border-strong">/</span>
              <span className="truncate text-foreground">Dashboard</span>
            </div>
          </div>

          <div className="hidden h-8 min-w-[260px] max-w-[380px] flex-1 items-center gap-2 rounded-md border border-border bg-surface-muted px-3 text-[12px] font-semibold text-muted-foreground md:flex">
            <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="truncate">Search property, scene, or lead</span>
            <span className="ml-auto rounded border border-border bg-white px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              Cmd K
            </span>
          </div>

          <form action={createProperty} onSubmit={() => setIsCreating(true)}>
            <button type="submit" className="btn-primary h-8 px-3">
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              New Property
            </button>
          </form>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8 lg:px-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <Card className="relative overflow-hidden shadow-sm border-border">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,104,242,0.08),transparent_42%)]" />
                <div className="pointer-events-none absolute inset-0 shimmer-overlay" />
                <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-7">
                  <div>
                    <Badge className="mb-4 bg-primary text-primary-foreground border-transparent hover:bg-primary/90">
                      <Radio className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Portfolio live board
                    </Badge>
                    <h2 className="max-w-[620px] text-[28px] font-bold leading-tight text-foreground md:text-[34px]">
                      Turn property media into polished tours buyers can act on.
                    </h2>
                    <p className="mt-3 max-w-[560px] text-[14px] font-medium leading-6 text-muted-foreground">
                      {workspace.name} has {properties.length} listings, {totalScenes} captured scenes, and {draftCount} tours waiting for final review.
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-surface-muted p-4">
                        <div className="text-[12px] font-semibold text-muted-foreground">Readiness</div>
                        <div className="mt-2 text-2xl font-bold text-foreground">{tourReadiness}%</div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-muted p-4">
                        <div className="text-[12px] font-semibold text-muted-foreground">Avg scenes</div>
                        <div className="mt-2 text-2xl font-bold text-foreground">{averageScenes}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-muted p-4">
                        <div className="text-[12px] font-semibold text-muted-foreground">Leads</div>
                        <div className="mt-2 text-2xl font-bold text-foreground">{totalLeads}</div>
                      </div>
                    </div>
                  </div>

                  <div className="relative min-h-[220px] overflow-hidden rounded-lg border border-border bg-surface-muted">
                    <PropertyVisual
                      name={featuredProperty?.name || "Featured property"}
                      imageUrl={featuredProperty?.scenes?.[0]?.thumbnailUrl || featuredProperty?.scenes?.[0]?.originalImageUrl}
                    />
                    <div className="absolute inset-x-3 bottom-3 rounded-md border border-border bg-white/92 p-3 shadow-sm backdrop-blur">
                      <div className="text-[12px] font-semibold text-muted-foreground">Featured listing</div>
                      <div className="mt-1 truncate text-[16px] font-bold text-foreground">{featuredProperty?.name || "No listing selected"}</div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  const tone = statTone(index);
                  return (
                    <Card key={stat.label} className={`p-4 ${tone.accent}`} style={{ animationDelay: `${index * 80}ms` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-kicker">{stat.label}</div>
                          <div className="mt-2 text-2xl font-bold text-foreground">{stat.value}</div>
                        </div>
                        <div className={`flex h-9 w-9 items-center justify-center rounded-md border ${tone.tile}`}>
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-bold text-foreground">Listing portfolio</h2>
                  <p className="text-[13px] font-medium text-muted-foreground">{filteredProperties.length} shown from {properties.length} total</p>
                </div>
                <button className="btn-ghost h-8 px-3 text-[12px]">
                  <BarChart4 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Reports
                </button>
              </div>

              {filteredProperties.length === 0 ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white/70 px-6 text-center shadow-sm">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-md border border-border bg-surface-muted text-muted-foreground">
                    <Files className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <h2 className="mb-2 text-[16px] font-bold text-foreground">No properties found</h2>
                  <p className="mb-6 max-w-[300px] text-[13px] font-medium leading-6 text-muted-foreground">
                    Create a property to start building scenes, tour content, and lead capture.
                  </p>
                  <form action={createProperty} onSubmit={() => setIsCreating(true)}>
                    <button type="submit" className="btn-primary">
                      <Plus className="h-4 w-4" strokeWidth={1.75} />
                      Create Property
                    </button>
                  </form>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                  {filteredProperties.map((property, index) => {
                    const status = property.status || "draft";
                    const sceneCount = property._count?.scenes || property.scenes?.length || 0;
                    const leadCount = property._count?.leads || property.leads?.length || 0;
                    const previewImage = property.scenes?.[0]?.thumbnailUrl || property.scenes?.[0]?.originalImageUrl;

                    return (
                      <Link key={property.id} href={`/properties/${property.id}`} className="group block animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
                        <Card className="overflow-hidden">
                          <div className="relative h-48 overflow-hidden border-b border-border">
                            <PropertyVisual imageUrl={previewImage} name={property.name} />
                            <div className="absolute left-4 top-4">
                              <Badge variant={status === "published" ? "default" : "secondary"}>
                                {status}
                              </Badge>
                            </div>
                            <div className="absolute bottom-4 right-4 rounded-md border border-white/60 bg-white/88 px-2.5 py-1 text-[12px] font-bold text-foreground shadow-sm backdrop-blur">
                              RW-{String(index + 1).padStart(3, "0")}
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-[15px] font-bold text-foreground transition-colors group-hover:text-primary">
                                  {property.name}
                                </h3>
                                <div className="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                                  <span className="truncate">{property.location || "Location not set"}</span>
                                </div>
                              </div>
                              <button
                                onClick={(event) => handleDelete(event, property.id)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground opacity-0 transition-all hover:border-border hover:bg-surface-muted hover:text-destructive group-hover:opacity-100"
                                title="Delete Property"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-surface-muted">
                              <div className="border-r border-border px-3 py-2.5">
                                <div className="text-[11px] font-semibold text-muted-foreground">Scenes</div>
                                <div className="mt-1 text-[15px] font-bold text-foreground">{sceneCount}</div>
                              </div>
                              <div className="border-r border-border px-3 py-2.5">
                                <div className="text-[11px] font-semibold text-muted-foreground">Leads</div>
                                <div className="mt-1 text-[15px] font-bold text-foreground">{leadCount}</div>
                              </div>
                              <div className="px-3 py-2.5">
                                <div className="text-[11px] font-semibold text-muted-foreground">Price</div>
                                <div className="mt-1 truncate text-[15px] font-bold text-foreground">{property.priceRange || "POR"}</div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <Card className="p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-foreground">Tour health</h3>
                    <p className="text-[12px] font-medium text-muted-foreground">Readiness by content coverage</p>
                  </div>
                  <div className="icon-tile icon-tile-viridian h-9 w-9">
                    <Activity className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                </div>
                <div className="mb-3 flex items-end justify-between">
                  <span className="text-3xl font-bold text-foreground">{tourReadiness}%</span>
                  <span className="badge-trend-neutral">Target 80%</span>
                </div>
                <Progress value={tourReadiness} className="h-2 bg-surface-2" />
                <div className="mt-5 space-y-3 text-[13px] font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Draft listings</span>
                    <span className="font-bold text-foreground">{draftCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Average scenes</span>
                    <span className="font-bold text-foreground">{averageScenes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Lead capture</span>
                    <span className="font-bold text-foreground">{totalLeads}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-foreground">Recent listings</h3>
                  <CircleDollarSign className="h-4 w-4 text-primary" strokeWidth={1.75} />
                </div>
                <div className="space-y-3">
                  {properties.slice(0, 4).map((property) => (
                    <Link key={property.id} href={`/properties/${property.id}`} className="flex items-center gap-3 rounded-md border border-transparent p-2 transition-colors hover:border-border hover:bg-surface-muted">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
                        <PropertyVisual
                          imageUrl={property.scenes?.[0]?.thumbnailUrl || property.scenes?.[0]?.originalImageUrl}
                          name={property.name}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-foreground">{property.name}</div>
                        <div className="mt-0.5 text-[12px] font-medium text-muted-foreground">{property._count?.scenes || 0} scenes</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                    </Link>
                  ))}
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </main>
      </div>
    </SidebarProvider>
  );
}
