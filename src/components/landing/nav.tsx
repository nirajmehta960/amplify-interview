import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_LINKS, SECTION_IDS } from "./content";
import { LandingCta } from "./cta";
import { BrandMark } from "./kit";
import { useLandingRoutes } from "./routes";

const NAV_HEIGHT = 64;

/**
 * Floating glass bar. Over the dark top of the hero it takes the `ink` tone
 * (light type on a transparent bar); once light content reaches it, the `cream`
 * tone and a glass layer fade in. Only colour and the glass layer's opacity
 * change — the bar never moves.
 *
 * "Light content" starts at the hero's `[data-nav-sentinel]` (the top of the
 * product shot), not the hero's foot: the hero's lower half is the screenshot
 * and its white fade, and waiting for the foot left white type on white for
 * ~700px of scroll. Without a sentinel the hero itself is the boundary.
 */
export function LandingNav() {
  const routes = useLandingRoutes();
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const hero = document.getElementById(SECTION_IDS.hero);
    if (!hero) {
      setOverHero(false);
      return;
    }
    const sentinel = hero.querySelector("[data-nav-sentinel]");
    // Dark is under the nav while the boundary has not yet scrolled up to it.
    const boundaryBelowNav = (rect: DOMRectReadOnly) =>
      sentinel ? rect.top > NAV_HEIGHT : rect.bottom > NAV_HEIGHT;

    if (typeof IntersectionObserver === "undefined") {
      const target = sentinel ?? hero;
      const onScroll = () => setOverHero(boundaryBelowNav(target.getBoundingClientRect()));
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    const observer = new IntersectionObserver(
      ([entry]) =>
        // A sentinel below the fold is not intersecting either, but the nav is
        // still over dark ground, so position decides rather than visibility.
        setOverHero(sentinel ? entry.isIntersecting || entry.boundingClientRect.top > NAV_HEIGHT : entry.isIntersecting),
      { rootMargin: `-${NAV_HEIGHT}px 0px 0px 0px` },
    );
    observer.observe(sentinel ?? hero);
    return () => observer.disconnect();
  }, []);

  return (
    <header data-band={overHero ? "ink" : "cream"} className="fixed inset-x-0 top-0 z-50 text-band-fg">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 border-b border-band-rule bg-band-ground/80 backdrop-blur-md transition-opacity duration-500 ease-plaza",
          overHero ? "opacity-0" : "opacity-100",
        )}
      />
      <nav
        aria-label="Main"
        className="relative mx-auto flex h-16 w-full max-w-[84rem] items-center justify-between gap-6 px-4 sm:px-8 lg:px-12"
      >
        <Link to="/" aria-label="Amplify Interview home" className="rounded-pill">
          <BrandMark />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm font-medium text-band-muted transition-colors hover:text-band-fg">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 md:flex">
          {routes.signedIn ? (
            <LandingCta to={routes.dashboard} size="sm">
              Go to dashboard
            </LandingCta>
          ) : (
            <>
              <Link
                to={routes.signIn}
                className="text-sm font-medium text-band-muted transition-colors hover:text-band-fg"
              >
                Sign in
              </Link>
              <LandingCta to={routes.start} size="sm">
                Start free
              </LandingCta>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="grid size-10 place-items-center rounded-pill text-band-fg md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" aria-describedby={undefined} className="w-[min(20rem,85vw)] border-0 p-0">
            {/* The sheet portals to <body>, outside the landing root, so it
                re-establishes the scope itself: one element for the scope, a
                child for the band (the CSS uses a descendant selector). */}
            <div data-landing="" className="h-full">
              <div data-band="cream" className="flex h-full flex-col gap-8 bg-band-ground px-6 pb-8 pt-16 text-band-fg">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <ul className="flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <SheetClose asChild>
                        <a
                          href={link.href}
                          className="block rounded-tile px-3 py-3 text-base font-medium hover:bg-band-fg/5"
                        >
                          {link.label}
                        </a>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-col gap-3">
                  {routes.signedIn ? (
                    <LandingCta to={routes.dashboard}>Go to dashboard</LandingCta>
                  ) : (
                    <>
                      <LandingCta to={routes.start}>Start free</LandingCta>
                      <LandingCta to={routes.signIn} variant="secondary">
                        Sign in
                      </LandingCta>
                    </>
                  )}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
