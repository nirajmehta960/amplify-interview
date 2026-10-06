import { Link } from "react-router-dom";
import { NAV_LINKS } from "./content";
import { BrandMark, Frame } from "./kit";
import { useLandingRoutes } from "./routes";

function FooterLink({ to, children }: { to: string; children: string }) {
  const className = "text-sm text-band-muted transition-colors hover:text-band-fg";
  return to.startsWith("#") ? (
    <a href={to} className={className}>
      {children}
    </a>
  ) : (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

export function LandingFooter() {
  const routes = useLandingRoutes();
  const columns = [
    { title: "Product", links: NAV_LINKS.map((link) => ({ label: link.label, to: link.href })) },
    {
      title: "Practice",
      links: [
        { label: "Start an interview", to: routes.start },
        { label: "Practice questions", to: "/dashboard/practice-questions" },
      ],
    },
    {
      title: "Account",
      links: routes.signedIn
        ? [{ label: "Dashboard", to: routes.dashboard }]
        : [
            { label: "Sign in", to: routes.signIn },
            { label: "Create account", to: routes.signUp },
          ],
    },
  ];

  return (
    <footer data-band="cream" className="border-t border-band-rule bg-band-ground text-band-fg">
      <Frame width="wide" className="flex flex-col gap-12 py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col gap-4">
            <BrandMark />
            <p className="max-w-[18rem] text-sm leading-relaxed text-band-muted">
              Adaptive AI mock interviews, scored answer by answer.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <p className="label text-band-faint">{column.title}</p>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink to={link.to}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="border-t border-band-rule pt-6 text-xs text-band-faint">
          © {new Date().getFullYear()} Amplify Interview
        </p>
      </Frame>
    </footer>
  );
}
