import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { JumpToTop } from "./JumpToTop";
import { ThemeChanger } from "./ThemeChanger";

// Individual projects surfaced as a submenu under the "Projects" nav link.
// Keep in sync with the cards in Projects.tsx.
const PROJECT_LINKS = [
  { label: "Allocation Quiz", href: "/allocation" },
  { label: "Investing Dashboard", href: "/investments" },
  { label: "Stablecoin Dashboard", href: "/stablecoin", newTab: true },
  { label: "Daily Fortune Cookie", href: "/fortune" },
  { label: "Typing Game", href: "/typing" },
];

// Small outline icons beside each nav link (stroke follows the link color).
const NAV_ICONS: Record<string, string> = {
  Home: "M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z",
  About: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0",
  Resume: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h6",
  Projects: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
  Highlights: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  Gallery: "M4 5h16v14H4zM4 15l4.5-4.5 4 4 3-3L20 15M15.5 9.5h.01",
};
const NavIcon = ({ name }: { name: keyof typeof NAV_ICONS }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true">
    <path d={NAV_ICONS[name]} />
  </svg>
);

// `embedded` renders the navbar as the title bar of the page's mockup-window
// (sticky inside it) instead of a fixed page bar.
export const Navbar = ({ embedded = false }: { embedded?: boolean }) => {
  const location = useLocation();
  const [projectsOpen, setProjectsOpen] = useState(false);

  const handleHomeClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // The Projects link doubles as a hover dropdown trigger; on the home page the
  // dropdown wrapper swallows the anchor's default jump, so scroll explicitly.
  const handleProjectsClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className={
        embedded
          ? "navbar sticky top-0 z-50 bg-base-300/85 backdrop-blur-md rounded-t-[inherit] px-3"
          : "navbar fixed top-0 left-0 z-50 bg-base-200 border-t border-base-300 shadow-sm"
      }
    >
      {/* Hairline that fills as the page scrolls (pure CSS; see index.css). */}
      <div className="scroll-progress" aria-hidden="true" />
      {/* Navbar Start with Mobile Dropdown */}
      <div className="navbar-start">
        {/* Private journal: a faint lock tucked into the top-left corner. */}
        <Link
          to="/blog"
          className="btn btn-ghost btn-circle btn-sm -ml-1 text-base-content/20 hover:text-base-content/50 transition-colors"
          aria-label="Private journal"
          title=""
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </Link>
        <div className="dropdown md:hidden">
          <div tabIndex={0} role="button" aria-label="Open navigation menu" aria-haspopup="true" className="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow border border-base-300"
          >
            <li><a className="link link-hover link-info" href="/" onClick={handleHomeClick}><NavIcon name="Home" />Home</a></li>
            <li><a className="link link-hover link-info" href="/#about"><NavIcon name="About" />About</a></li>
            <li><a className="link link-hover link-info" href="/#resume"><NavIcon name="Resume" />Resume</a></li>
            <li>
              <details>
                <summary className="link link-hover link-info"><NavIcon name="Projects" />Projects</summary>
                <ul className="p-2">
                  <li><a className="link link-hover link-info" href="/#projects">All projects</a></li>
                  {PROJECT_LINKS.map((proj) => (
                    <li key={proj.href}><a className="link link-hover link-info" href={proj.href} {...(proj.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{proj.label}</a></li>
                  ))}
                </ul>
              </details>
            </li>
            <li><a className="link link-hover link-info" href="/#highlights"><NavIcon name="Highlights" />Highlights</a></li>
            <li><a className="link link-hover link-info" href="/#gallery"><NavIcon name="Gallery" />Gallery</a></li>
          </ul>
        </div>
      </div>

      {/* Centered Menu (hidden on small screens, shown on md+) */}
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal px-1">
          <li><a className="link link-info no-underline nav-underline gap-1.5" href="/" onClick={handleHomeClick}><NavIcon name="Home" />Home</a></li>
          <li><a className="link link-info no-underline nav-underline gap-1.5" href="/#about"><NavIcon name="About" />About</a></li>
          <li><a className="link link-info no-underline nav-underline gap-1.5" href="/#resume"><NavIcon name="Resume" />Resume</a></li>
          <li
            className="relative"
            onMouseEnter={() => setProjectsOpen(true)}
            onMouseLeave={() => setProjectsOpen(false)}
            onFocus={() => setProjectsOpen(true)}
            onBlur={() => setProjectsOpen(false)}
          >
            <a
              aria-haspopup="true"
              aria-expanded={projectsOpen}
              className="link link-info no-underline nav-underline gap-1.5"
              href="/#projects"
              onClick={handleProjectsClick}
            >
              <NavIcon name="Projects" />
              Projects
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 -ml-0.5 fill-current opacity-60 pointer-events-none" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </a>
            {/* Submenu is flush to the trigger's bottom (top-full, no margin) so
                there's no dead zone to cross — the cursor stays within the <li>. */}
            {projectsOpen && (
              <ul className="menu menu-sm absolute top-full left-0 m-0 z-50 w-56 p-2 bg-base-100 rounded-box shadow border border-base-300 before:hidden">
                {PROJECT_LINKS.map((proj) => (
                  <li key={proj.href}><a className="link link-hover link-info" href={proj.href} {...(proj.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{proj.label}</a></li>
                ))}
              </ul>
            )}
          </li>
          <li><a className="link link-info no-underline nav-underline gap-1.5" href="/#highlights"><NavIcon name="Highlights" />Highlights</a></li>
          <li><a className="link link-info no-underline nav-underline gap-1.5" href="/#gallery"><NavIcon name="Gallery" />Gallery</a></li>
        </ul>
      </div>

      {/* ThemeChanger on the Right */}
      <div className="navbar-end flex flex-row gap-4 items-center">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("toggle-command-palette"))}
          className="btn btn-sm btn-ghost gap-1 hidden sm:inline-flex text-base-content/60"
          aria-label="Open command palette"
        >
          <kbd className="kbd kbd-sm">⌘</kbd><kbd className="kbd kbd-sm">K</kbd>
        </button>
        <JumpToTop />
        <ThemeChanger />
      </div>
    </div>
  );
};
