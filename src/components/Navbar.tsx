import { useState } from "react";
import { useLocation } from "react-router-dom";
import { JumpToTop } from "./JumpToTop";
import { ThemeChanger } from "./ThemeChanger";

// Individual projects surfaced as a submenu under the "Projects" nav link.
// Keep in sync with the cards in Projects.tsx.
const PROJECT_LINKS = [
  { label: "Allocation", href: "/allocation" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Stablecoin Dashboard", href: "/stablecoin" },
  { label: "Daily Fortune", href: "/fortune" },
];

export const Navbar = () => {
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
    <div className="navbar fixed top-0 left-0 z-50 bg-base-200 border-t border-base-300 shadow-sm">
      {/* Navbar Start with Mobile Dropdown */}
      <div className="navbar-start">
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
            <li><a className="link link-hover link-info" href="/" onClick={handleHomeClick}>Home</a></li>
            <li><a className="link link-hover link-info" href="/#about">About</a></li>
            <li><a className="link link-hover link-info" href="/#resume">Resume</a></li>
            <li>
              <details>
                <summary className="link link-hover link-info">Projects</summary>
                <ul className="p-2">
                  <li><a className="link link-hover link-info" href="/#projects">All projects</a></li>
                  {PROJECT_LINKS.map((proj) => (
                    <li key={proj.href}><a className="link link-hover link-info" href={proj.href}>{proj.label}</a></li>
                  ))}
                </ul>
              </details>
            </li>
            <li><a className="link link-hover link-info" href="/#highlights">Highlights</a></li>
            <li><a className="link link-hover link-info" href="/#gallery">Gallery</a></li>
          </ul>
        </div>
      </div>

      {/* Centered Menu (hidden on small screens, shown on md+) */}
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal px-1">
          <li><a className="link link-hover link-info" href="/" onClick={handleHomeClick}>Home</a></li>
          <li><a className="link link-hover link-info" href="/#about">About</a></li>
          <li><a className="link link-hover link-info" href="/#resume">Resume</a></li>
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
              className="link link-hover link-info gap-1"
              href="/#projects"
              onClick={handleProjectsClick}
            >
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
                  <li key={proj.href}><a className="link link-hover link-info" href={proj.href}>{proj.label}</a></li>
                ))}
              </ul>
            )}
          </li>
          <li><a className="link link-hover link-info" href="/#highlights">Highlights</a></li>
          <li><a className="link link-hover link-info" href="/#gallery">Gallery</a></li>
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
