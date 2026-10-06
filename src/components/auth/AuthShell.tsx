import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/landing/kit";
import { AuthPanel } from "./AuthPanel";

/**
 * The one layout every auth page uses: form column on the app's cream ground,
 * the product panel beside it on desktop. Before this, sign-in was a split
 * screen and the other three were centred cards on an indigo gradient.
 */
export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Helmet>
        <title>{`${title} — Amplify Interview`}</title>
      </Helmet>
      <div className="flex min-h-screen bg-background">
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-[26rem]">
            <Link to="/" aria-label="Amplify Interview home" className="mb-12 inline-flex rounded-pill text-foreground">
              <BrandMark />
            </Link>
            <h1 className="text-display-3 font-medium tracking-[-0.02em] text-foreground">{title}</h1>
            {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div> : null}
          </div>
        </main>
        <AuthPanel />
      </div>
    </>
  );
}
