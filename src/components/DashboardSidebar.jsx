import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  UserRound,
  Pill,
  Menu,
  X,
  HeartPulse,
  ChevronRight,
} from "lucide-react";

import FloatingGames from "./games/FloatingGames";
import "./DashboardSidebar.css";

export default function DashboardSidebar({ role = "Patient" }) {
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = role.toLowerCase() === "admin";

  const menuItems = isAdmin
    ? [
        { name: "Dashboard", path: "/admin-dashboard", icon: LayoutDashboard },
        { name: "History", path: "/admin-history", icon: ClipboardList },
        { name: "Profile", path: "/admin-profile", icon: UserRound },
      ]
    : [
        { name: "Dashboard", path: "/patient-dashboard", icon: LayoutDashboard },
        { name: "History", path: "/patient-history", icon: ClipboardList },
        { name: "Prescriptions", path: "/prescriptions", icon: Pill },
        { name: "Personal Details", path: "/personal-details", icon: UserRound },
      ];

  const closeSidebar = () => setOpen(false);

  const handleNavigation = (item) => {
    navigate(item.path);
    closeSidebar();
  };

  // Close with the Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Close when the route changes (e.g. browser back button)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Hamburger button - only rendered while sidebar is closed */}
{!open && (
  <button
    type="button"
    className="sidebar-menu-button"
    onClick={() => setOpen(true)}
    aria-label="Open menu"
    aria-expanded={open}
  >
    <Menu size={23} />
  </button>
)}

      {/* Background overlay */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar ${
          open ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        {/* Brand section */}
        <div className="sidebar-heading">
          <div className="sidebar-logo">
            <HeartPulse size={22} />
          </div>

          <div className="sidebar-brand-text">
            <h2>CareQueue</h2>
            <p>{isAdmin ? "Admin Panel" : "Patient Portal"}</p>
          </div>

          {/* Close button inside sidebar */}
          <button
            type="button"
            className="sidebar-close-button"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <p className="sidebar-section-label">MENU</p>

        <nav className="sidebar-navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => handleNavigation(item)}
              >
                <span className="sidebar-nav-icon">
                  <Icon size={20} />
                </span>
                <span className="sidebar-nav-label">{item.name}</span>
                <ChevronRight size={16} className="sidebar-nav-arrow" />
              </button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-line" />

          <div className="sidebar-footer-brand">
            <div className="sidebar-footer-logo">
              <HeartPulse size={16} />
            </div>

            <div>
              <p>CareQueue</p>
              <span>Healthcare made easier</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Games widget - patient only */}
      {!isAdmin && <FloatingGames />}
    </>
  );
}