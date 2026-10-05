import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchClients } from "../clients/clientApi.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { fetchWebsites } from "../websites/websiteApi.js";

const WorkspaceContext = createContext(null);

function storageKey(user, name) {
  return `seo_workspace_${user?.agencyId ?? "agency"}_${name}`;
}

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [clientId, setClientIdState] = useState("");
  const [websiteId, setWebsiteIdState] = useState("");
  const [status, setStatus] = useState("loading");

  const loadClients = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetchClients();
      const nextClients = response.clients ?? [];
      const saved = window.localStorage.getItem(storageKey(user, "client"));
      const nextClientId = nextClients.some((client) => client.id === saved) ? saved : nextClients[0]?.id ?? "";
      setClients(nextClients);
      setClientIdState(nextClientId);
      setStatus("ready");
    } catch {
      setClients([]);
      setClientIdState("");
      setStatus("error");
    }
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(loadClients, 0);
    return () => window.clearTimeout(timeout);
  }, [loadClients]);

  useEffect(() => {
    let active = true;
    if (!clientId) {
      return () => { active = false; };
    }
    fetchWebsites(clientId)
      .then((response) => {
        if (!active) return;
        const nextWebsites = response.websites ?? [];
        const saved = window.localStorage.getItem(storageKey(user, "website"));
        const nextWebsiteId = nextWebsites.some((website) => website.id === saved) ? saved : nextWebsites[0]?.id ?? "";
        setWebsites(nextWebsites);
        setWebsiteIdState(nextWebsiteId);
      })
      .catch(() => {
        if (active) {
          setWebsites([]);
          setWebsiteIdState("");
        }
      });
    return () => { active = false; };
  }, [clientId, user]);

  const setClientId = useCallback((nextClientId) => {
    setClientIdState(nextClientId);
    setWebsites([]);
    setWebsiteIdState("");
    window.localStorage.setItem(storageKey(user, "client"), nextClientId);
  }, [user]);

  const setWebsiteId = useCallback((nextWebsiteId) => {
    setWebsiteIdState(nextWebsiteId);
    window.localStorage.setItem(storageKey(user, "website"), nextWebsiteId);
  }, [user]);

  const refreshWebsites = useCallback(async () => {
    if (!clientId) {
      setWebsites([]);
      setWebsiteIdState("");
      return [];
    }

    const response = await fetchWebsites(clientId);
    const nextWebsites = response.websites ?? [];
    setWebsites(nextWebsites);
    setWebsiteIdState((currentWebsiteId) => {
      const nextWebsiteId = nextWebsites.some((website) => website.id === currentWebsiteId)
        ? currentWebsiteId
        : nextWebsites[0]?.id ?? "";
      window.localStorage.setItem(storageKey(user, "website"), nextWebsiteId);
      return nextWebsiteId;
    });
    return nextWebsites;
  }, [clientId, user]);

  const value = useMemo(() => ({
    clients,
    websites,
    clientId,
    websiteId,
    selectedClient: clients.find((client) => client.id === clientId) ?? null,
    selectedWebsite: websites.find((website) => website.id === websiteId) ?? null,
    status,
    setClientId,
    setWebsiteId,
    refreshClients: loadClients,
    refreshWebsites,
  }), [clientId, clients, loadClients, refreshWebsites, setClientId, setWebsiteId, status, websiteId, websites]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}
