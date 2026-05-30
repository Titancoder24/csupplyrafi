const fs = require('fs');

let pagePath = './src/app/page.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

// 1. Add Imports
page = page.replace(
  'import { createProperty, deleteProperty, getDashboardData } from "./actions";',
  `import { createProperty, deleteProperty, getDashboardData } from "./actions";
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
} from "@/components/ui/sidebar";`
);

// 2. Wrap in SidebarProvider and replace Aside with Sidebar
const asideStr = `      <aside className="app-sidebar hidden w-[264px] shrink-0 flex-col border-r border-border md:flex">
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-3 text-[15px] font-bold">
            <div className="brand-mark h-8 w-8 text-[14px]">R</div>
            Realworks
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        </div>

        <div className="px-4 pb-5">
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

        <nav className="flex flex-1 flex-col gap-1 px-3">
          <div className="px-3 pb-2 pt-1 text-kicker">Operate</div>
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={\`nav-item \${active ? "nav-item-active" : "nav-item-idle"}\`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {item.id === "team" ? workspace.name : item.label}
              </button>
            );
          })}

          <div className="px-3 pb-2 pt-5 text-kicker">Workflows</div>
          {navItems.slice(2).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={\`nav-item \${active ? "nav-item-active" : "nav-item-idle"}\`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
        </nav>

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
      </aside>`;

const sidebarStr = `      <Sidebar className="border-r border-border bg-sidebar">
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
                      className={\`h-9 px-3 \${activeTab === item.id ? "bg-[var(--sidebar-accent)] font-semibold text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}\`}
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
                      className={\`h-9 px-3 \${activeTab === item.id ? "bg-[var(--sidebar-accent)] font-semibold text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}\`}
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
      </Sidebar>`;

page = page.replace(
  '<div className="flex min-h-screen flex-col bg-[var(--workspace-bg)] text-foreground md:flex-row">',
  '<SidebarProvider>\n    <div className="flex min-h-screen w-full flex-col bg-[var(--workspace-bg)] text-foreground md:flex-row">'
);
page = page.replace(asideStr, sidebarStr);
page = page.replace(
  '    </div>\n  );\n}',
  '      </div>\n    </SidebarProvider>\n  );\n}'
);

// 3. Replacements
page = page.replace(
  /<section className="relative overflow-hidden rounded-lg border border-border bg-white shadow-sm">/g,
  '<Card className="relative overflow-hidden shadow-sm border-border">'
);
page = page.replace(
  /<\/section>/g,
  '</Card>'
);
page = page.replace(
  /className="chip chip-viridian mb-4"/g,
  'className="mb-4 bg-primary text-primary-foreground border-transparent hover:bg-primary/90"'
).replace(/<div className="mb-4 bg-primary/g, '<Badge className="mb-4 bg-primary').replace(/<\/div>\n\s*<h2/g, '</Badge>\n                    <h2');

page = page.replace(
  /<div key={stat\.label} className={`os-card p-4 \${tone\.accent}`} style={{ animationDelay: `\${index \* 80}ms` }}>/g,
  '<Card key={stat.label} className={`p-4 ${tone.accent}`} style={{ animationDelay: `${index * 80}ms` }}>'
).replace(
  /<article className="os-card overflow-hidden">/g,
  '<Card className="overflow-hidden">'
).replace(
  /<\/article>/g,
  '</Card>'
);

page = page.replace(
  /<section className="os-card p-5">/g,
  '<Card className="p-5">'
);

page = page.replace(
  /<div className="h-2 overflow-hidden rounded-full bg-surface-2">\n\s*<div className="progress-bar-animated h-full rounded-full" style={{ width: `\${tourReadiness}%` }} \/>\n\s*<\/div>/g,
  '<Progress value={tourReadiness} className="h-2 bg-surface-2" />'
);

page = page.replace(
  /<span className={`status-pill \${status === "published" \? "status-published" : "status-draft"}`}>\n\s*{status}\n\s*<\/span>/g,
  '<Badge variant={status === "published" ? "default" : "secondary"}>\n                                {status}\n                              </Badge>'
);

fs.writeFileSync(pagePath, page);
console.log('page.tsx patched successfully');
