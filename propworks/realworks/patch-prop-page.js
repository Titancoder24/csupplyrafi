const fs = require('fs');

let pagePath = './src/app/properties/[propertyId]/page.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

// 1. Imports
page = page.replace(
  'import { createScene, generateWorldLabsScene, getPropertyData, updateProperty, uploadSceneImage } from "../actions";',
  `import { createScene, generateWorldLabsScene, getPropertyData, updateProperty, uploadSceneImage } from "../actions";
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
} from "@/components/ui/table";`
);

// 2. Breadcrumbs
page = page.replace(
  /<div className="flex items-center gap-2 text-\[13px\] font-semibold text-muted-foreground">\s*<Link href="\/" className="transition-colors hover:text-foreground">\s*Properties\s*<\/Link>\s*<span className="text-border-strong">\/<\/span>\s*<span className="truncate text-foreground">\{property\.name\}<\/span>\s*<\/div>/g,
  `<Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="font-semibold text-muted-foreground transition-colors hover:text-foreground">Properties</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground truncate">{property.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>`
);

// 3. Layout wrapper and Sidebar
const asideStr = `        <aside className="app-sidebar hidden w-[264px] shrink-0 flex-col border-r border-border md:flex">
          <div className="flex h-16 shrink-0 items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-3 text-[15px] font-bold text-foreground transition-opacity hover:opacity-85">
              <div className="brand-mark h-8 w-8 text-[14px]">R</div>
              Realworks
            </Link>
            <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          </div>

          <div className="px-4 pb-5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <input
                placeholder="Search workspace"
                className="search-input h-9 w-full rounded-md border border-border bg-surface-muted py-2 pl-9 pr-3 text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3">
            {navGroups.map((group) => (
              <div key={group.label} className="pb-4">
                <div className="px-3 pb-2 text-kicker">{group.label}</div>
                <div className="space-y-1">
                  {group.items.map((item) => {
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
                </div>
              </div>
            ))}
          </nav>
        </aside>`;

const sidebarStr = `        <Sidebar className="border-r border-border bg-sidebar mt-[52px] h-[calc(100vh-52px)]">
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
                          className={\`h-9 px-3 \${active ? "bg-[var(--sidebar-accent)] font-semibold text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}\`}
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
        </Sidebar>`;

page = page.replace(
  '<div className="flex min-h-0 flex-1 overflow-hidden">',
  '<SidebarProvider className="flex min-h-0 flex-1 overflow-hidden">'
);
page = page.replace(asideStr, sidebarStr);
page = page.replace(
  '        </main>\n      </div>\n    </div>',
  '        </main>\n      </SidebarProvider>\n    </div>'
);

// 4. Cards and progress and Badges
page = page.replace(
  /<section className="mb-6 overflow-hidden rounded-lg border border-border bg-white shadow-\[0_18px_45px_rgba\(17,24,39,0\.06\)\]">/g,
  '<Card className="mb-6 overflow-hidden border-border shadow-sm">'
).replace(
  /<\/section>/g,
  '</Card>'
);

page = page.replace(
  /className="chip chip-viridian mb-4"/g,
  'className="mb-4 bg-primary text-primary-foreground border-transparent hover:bg-primary/90"'
).replace(/<div className="mb-4 bg-primary/g, '<Badge className="mb-4 bg-primary').replace(/<\/div>\n\s*<h2/g, '</Badge>\n                    <h2');

page = page.replace(
  /<div className="h-2 overflow-hidden rounded-full bg-surface-2">\n\s*<div className="progress-bar-animated h-full rounded-full" style={{ width: `\${listingReadiness}%` }} \/>\n\s*<\/div>/g,
  '<Progress value={listingReadiness} className="h-2 bg-surface-2" />'
);

page = page.replace(
  /<div className="os-card flex min-h-\[274px\] flex-col border-dashed p-5">/g,
  '<Card className="flex min-h-[274px] flex-col border-dashed p-5">'
);

page = page.replace(
  /<div key=\{scene\.id\} className="os-card group flex h-\[274px\] flex-col overflow-hidden animate-fade-in-up" style=\{\{ animationDelay: `\$\{sceneIndex \* 70\}ms` \}\}>/g,
  '<Card key={scene.id} className="group flex h-[274px] flex-col overflow-hidden animate-fade-in-up" style={{ animationDelay: `${sceneIndex * 70}ms` }}>'
);

page = page.replace(
  /<div className="os-card overflow-hidden">/g,
  '<Card className="overflow-hidden">'
).replace(
  /<div className="os-card p-6 md:p-8">/g,
  '<Card className="p-6 md:p-8">'
).replace(
  /<div key=\{stat\.label\} className="os-card p-5">/g,
  '<Card key={stat.label} className="p-5">'
).replace(
  /<div className="os-card p-8 text-center">/g,
  '<Card className="p-8 text-center">'
);

page = page.replace(
  /<div className="os-card flex min-h-\[260px\] flex-col items-center justify-center border-dashed bg-white\/70 p-10 text-center">/g,
  '<Card className="flex min-h-[260px] flex-col items-center justify-center border-dashed bg-white/70 p-10 text-center">'
);


page = page.replace(
  /<span className="status-pill status-published">\{doc\.status\}<\/span>/g,
  '<Badge variant="default">{doc.status}</Badge>'
);

// 5. Leads Table (Complex replace)
const leadsTableSrc = `                <div className="grid grid-cols-[1.4fr_1fr_90px_100px] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-kicker">
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
                </div>`;
const leadsTableDst = `                <Table>
                  <TableHeader className="bg-surface-muted">
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead: LeadRecord) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-bold text-[13px]">{lead.name || "Unnamed lead"}</TableCell>
                        <TableCell className="text-muted-foreground text-[13px]">{lead.email || lead.phone || "No contact"}</TableCell>
                        <TableCell className="font-bold text-[13px]">{lead.intentScore || 0}</TableCell>
                        <TableCell>
                          <Badge variant={lead.status === "published" ? "default" : "secondary"}>{lead.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>`;
page = page.replace(leadsTableSrc, leadsTableDst);

fs.writeFileSync(pagePath, page);
console.log('property page.tsx patched successfully');
