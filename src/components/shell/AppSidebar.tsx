import { LogOut, Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { displayName } from "@/components/dashboard/format";
import { useAuth } from "@/contexts/AuthContext";
import { userApi, type UserProfile } from "@/services/apiClient";
import { NAV_GROUPS } from "./nav";

/** Shared look for rail rows; the active row is styled from NavLink's aria-current. */
const ROW =
  "h-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&[aria-current=page]]:bg-sidebar-accent [&[aria-current=page]]:font-medium [&[aria-current=page]]:text-sidebar-accent-foreground";

/**
 * The dark rail. NavLink sets aria-current="page" itself; styling keys off that
 * rather than a className function, because SidebarMenuButton's Slot would
 * stringify a function className.
 */
export function AppSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Same source and fallbacks as the dashboard greeting, so the two never disagree.
  const name = displayName(profile, user);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    userApi
      .getProfile()
      .then((p) => !cancelled && setProfile(p))
      .catch(() => {
        // Fall back to the auth user's name, as the dashboard does.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Any navigation closes the phone sheet — a link, but also browser Back.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Leave anyway: the local session is what the user asked to end.
    }
    closeOnMobile();
    navigate("/", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 pt-4 group-data-[collapsible=icon]:px-2">
        <Link
          to="/"
          aria-label="Amplify Interview home"
          className="flex items-center gap-2.5 rounded-md p-1 group-data-[collapsible=icon]:p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-sidebar-primary text-sidebar-primary-foreground">
            <Mic className="size-4" aria-hidden="true" />
          </span>
          <span className="truncate text-[0.9375rem] font-semibold text-white group-data-[collapsible=icon]:hidden">
            Amplify Interview
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <nav aria-label="Main">
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/70">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild tooltip={item.title} className={ROW}>
                        <NavLink to={item.url} end onClick={closeOnMobile}>
                          <item.icon aria-hidden="true" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="gap-3 border-t border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground"
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            {user?.email ? <p className="truncate text-xs text-sidebar-foreground/70">{user.email}</p> : null}
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={handleSignOut} className={ROW}>
              <LogOut aria-hidden="true" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger className="hidden self-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:inline-flex" />
      </SidebarFooter>
    </Sidebar>
  );
}
