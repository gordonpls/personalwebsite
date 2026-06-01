import { useLocation } from "react-router-dom";
import { JumpToTop } from "./JumpToTop";
import { ThemeChanger } from "./ThemeChanger";

export const Navbar = () => {
  const location = useLocation();

  const handleHomeClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="navbar fixed top-0 left-0 z-50 bg-base-200 border-t border-gray-300 shadow-sm">
      {/* Navbar Start with Mobile Dropdown */}
      <div className="navbar-start">
        <div className="dropdown md:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
          >
            <li><a className="link link-hover link-info" href="/" onClick={handleHomeClick}>Home</a></li>
            <li><a className="link link-hover link-info" href="/#resume">Resume</a></li>
            <li><a className="link link-hover link-info" href="/#gallery">Gallery</a></li>
            <li><a className="link link-hover link-info" href="/#projects">Projects</a></li>
          </ul>
        </div>
      </div>

      {/* Centered Menu (hidden on small screens, shown on md+) */}
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal px-1">
          <li><a className="link link-hover link-info" href="/" onClick={handleHomeClick}>Home</a></li>
          <li><a className="link link-hover link-info" href="/#resume">Resume</a></li>
          <li><a className="link link-hover link-info" href="/#gallery">Gallery</a></li>
          <li><a className="link link-hover link-info" href="/#projects">Projects</a></li>
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
