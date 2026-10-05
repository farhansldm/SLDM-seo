import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, ChevronsLeft, LogOut, Menu, PanelLeftOpen, UserRound, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../features/auth/AuthProvider.jsx";
import { useWorkspace } from "../features/workspace/WorkspaceProvider.jsx";
import { navigationForRole, titleForPath } from "./navigation.js";

const COLLAPSED_KEY = "seo_navigation_collapsed";

function initials(name, email) {
  return (name || email || "User").split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function AppShell() {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const workspace = useWorkspace();
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem(COLLAPSED_KEY) === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const groups = useMemo(() => navigationForRole(user?.role), [user?.role]);
  const pageTitle = titleForPath(pathname);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAccountOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      window.localStorage.setItem(COLLAPSED_KEY, String(!current));
      return !current;
    });
  }

  return (
    <div className={`app-frame${collapsed ? " nav-collapsed" : ""}`}>
      <button className={`nav-scrim${mobileOpen ? " visible" : ""}`} aria-label="Close navigation" onClick={() => setMobileOpen(false)} type="button" />
      <aside className={`app-sidebar${mobileOpen ? " mobile-open" : ""}`} aria-label="Primary navigation">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-copy"><strong>SLDM</strong><small>SEO operations</small></span>
          <button className="mobile-nav-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)} type="button"><X size={19} /></button>
        </div>

        <nav className="sidebar-navigation">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map(({ icon: Icon, label, path }) => (
                <NavLink className={({ isActive }) => `nav-item${isActive ? " active" : ""}`} end={path === "/"} key={path} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} to={path}>
                  <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button className="collapse-navigation" onClick={toggleCollapsed} title={collapsed ? "Expand navigation" : "Collapse navigation"} type="button">
          {collapsed ? <PanelLeftOpen size={18} /> : <ChevronsLeft size={18} />}
          <span>{collapsed ? "Expand" : "Collapse"}</span>
        </button>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="topbar-leading">
            <button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)} type="button"><Menu size={20} /></button>
            <div className="page-crumb"><span>SLDM</span><strong>{pageTitle}</strong></div>
          </div>

          {user?.role !== "client" ? (
            <div className="workspace-context" aria-label="Active workspace">
              <label>
                <span>Client</span>
                <select aria-label="Active client" disabled={workspace.status === "loading" || !workspace.clients.length} onChange={(event) => workspace.setClientId(event.target.value)} value={workspace.clientId}>
                  {!workspace.clients.length ? <option value="">No clients</option> : null}
                  {workspace.clients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}
                </select>
              </label>
              <label>
                <span>Website</span>
                <select aria-label="Active website" disabled={!workspace.clientId || !workspace.websites.length} onChange={(event) => workspace.setWebsiteId(event.target.value)} value={workspace.websiteId}>
                  {!workspace.websites.length ? <option value="">No websites</option> : null}
                  {workspace.websites.map((website) => <option key={website.id} value={website.id}>{website.domain}</option>)}
                </select>
              </label>
            </div>
          ) : <div className="client-context"><span>Client workspace</span><strong>{workspace.selectedClient?.companyName ?? "Your account"}</strong></div>}

          <div className="topbar-actions">
            {user?.role !== "client" ? <NavLink className="topbar-icon-button" aria-label="Notifications" onClick={() => setAccountOpen(false)} title="Notifications" to="/tasks"><Bell size={19} /></NavLink> : null}
            <div className="account-menu-wrap">
              <button className="account-trigger" aria-expanded={accountOpen} onClick={() => setAccountOpen((current) => !current)} type="button">
                <span className="user-avatar">{initials(user?.fullName, user?.email)}</span>
                <span className="account-copy"><strong>{user?.fullName ?? "Account"}</strong><small>{user?.role}</small></span>
                <ChevronDown size={16} />
              </button>
              {accountOpen ? (
                <div className="account-menu">
                  <div><UserRound size={17} /><span><strong>{user?.fullName ?? "Account"}</strong><small>{user?.email}</small></span></div>
                  <button onClick={signOut} type="button"><LogOut size={17} /> Sign out</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="app-content"><Outlet /></div>
      </div>
    </div>
  );
}
