import { Mic } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

/**
 * The signed-in layout: dark rail + cream workspace. Mounted once by the layout
 * route, so the rail does not remount between pages. `SidebarInset` renders the
 * <main>. Phones get a slim bar with the menu trigger; the rail becomes a sheet.
 */
export function AppShell() {
  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset id="main" className="min-w-0 bg-background">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:hidden print:hidden">
          <SidebarTrigger aria-label="Open navigation" className="-ml-1" />
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="grid size-7 place-items-center rounded-[8px] bg-accent text-accent-foreground">
              <Mic className="size-3.5" aria-hidden="true" />
            </span>
            Amplify Interview
          </Link>
        </div>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
