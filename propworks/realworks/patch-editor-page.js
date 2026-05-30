const fs = require('fs');

let pagePath = './src/app/properties/[propertyId]/editor/[sceneId]/page.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

// 1. Add Imports
page = page.replace(
  'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\nimport { addAnnotation, deleteAnnotation, getSceneData } from "./actions";',
  `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addAnnotation, deleteAnnotation, getSceneData } from "./actions";
import { Card } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";`
);

// 2. Replace Breadcrumbs
const breadcrumbSrc = `<div className="flex items-center text-[13px] text-muted-foreground font-medium">
              <span>{property?.name}</span>
              <span className="mx-2.5 text-border-2">/</span>
              <span className="text-foreground font-medium">{scene.name}</span>
            </div>`;
const breadcrumbDst = `<Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={\`/properties/\${propId}\`} className="font-medium text-muted-foreground transition-colors hover:text-foreground">{property?.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-foreground">{scene.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>`;
page = page.replace(breadcrumbSrc, breadcrumbDst);

// 3. Replace Annotation Card
page = page.replace(
  /<div key=\{ann\.id\} className="group rounded-lg border border-border bg-white p-3 shadow-sm transition-colors hover:border-border-strong">/g,
  '<Card key={ann.id} className="group p-3 shadow-sm transition-colors hover:border-border-strong">'
).replace(
  /<div className="flex items-center gap-2 rounded-md border border-\[var\(--viridian-100\)\] bg-\[var\(--viridian-50\)\] p-3 text-\[13px\] font-semibold text-\[var\(--viridian-700\)\]">/g,
  '<div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 p-3 text-[13px] font-semibold text-primary">'
).replace( // replace the closing div of the card properly if we had </Card>, but we replaced the start div. Wait, the end div is at the end of the annotation block.
  /<\/button>\n\s*<\/form>\n\s*<\/div>\n\s*<\/div>/g,
  '</button>\n                            </form>\n                          </div>\n                        </Card>'
);

fs.writeFileSync(pagePath, page);
console.log('editor page.tsx patched successfully');
