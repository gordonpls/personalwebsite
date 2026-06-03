import { useLocation } from "react-router-dom";
import { JumpToTop } from "./JumpToTop";
import { ThemeChanger } from "./ThemeChanger";

// Individual projects surfaced as a submenu under the "Projects" nav link.
// Keep in sync with the cards in Projects.tsx.
const PROJECT_LINKS = [
  { label: "Allocation", href: "/allocation" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Stablecoin Dashboard", href: "/stablecoin" },
  { label: "Fortune", href: "/fortune" },
];

export const Navbar = () => {
  const location = useLocation();

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
          <li className="dropdown dropdown-hover dropdown-bottom dropdown-end p-0">
            <a tabIndex={0} aria-haspopup="true" className="link link-hover link-info" href="/#projects" onClick={handleProjectsClick}>
              Projects
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 fill-current opacity-60" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </a>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-2 w-56 p-2 shadow border border-base-300">
              {PROJECT_LINKS.map((proj) => (
                <li key={proj.href}><a className="link link-hover link-info" href={proj.href}>{proj.label}</a></li>
              ))}
            </ul>
          </li>
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
