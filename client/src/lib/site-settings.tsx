import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SiteSettingsData } from "@shared/schema";

interface SiteSettingsContextType {
  settings: SiteSettingsData;
  isLoading: boolean;
  error: Error | null;
}

const defaultSettings: SiteSettingsData = {
  siteName: "IT Services",
  siteDescription: "",
  logoUrl: "",
  faviconUrl: "",
  metaTitle: "",
  metaDescription: "",
};

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
  error: null,
});

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

interface SiteSettingsProviderProps {
  children: ReactNode;
}

export function SiteSettingsProvider({ children }: SiteSettingsProviderProps) {
  const originalTitle = useRef<string>(document.title);
  const originalFavicon = useRef<string | null>(
    document.querySelector<HTMLLinkElement>("link[rel='icon']")?.href || null
  );

  const { data: settings, isLoading, error } = useQuery<SiteSettingsData, Error>({
    queryKey: ["/api/site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings");
      if (!res.ok) {
        throw new Error("Failed to fetch site settings");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const currentSettings = settings || defaultSettings;

  useEffect(() => {
    const titleToUse = currentSettings.metaTitle || currentSettings.siteName || originalTitle.current;
    document.title = titleToUse;

    const existingFavicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    const faviconToUse = currentSettings.faviconUrl || originalFavicon.current;
    if (faviconToUse) {
      if (existingFavicon) {
        existingFavicon.href = faviconToUse;
      } else {
        const faviconLink = document.createElement("link");
        faviconLink.rel = "icon";
        faviconLink.href = faviconToUse;
        document.head.appendChild(faviconLink);
      }
    }

    const existingMetaDesc = document.querySelector<HTMLMetaElement>("meta[name='description']");
    if (currentSettings.metaDescription) {
      if (existingMetaDesc) {
        existingMetaDesc.content = currentSettings.metaDescription;
      } else {
        const metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        metaDesc.content = currentSettings.metaDescription;
        document.head.appendChild(metaDesc);
      }
    } else if (existingMetaDesc) {
      existingMetaDesc.content = "";
    }

    const existingOgTitle = document.querySelector<HTMLMetaElement>("meta[property='og:title']");
    const ogTitleContent = currentSettings.metaTitle || currentSettings.siteName;
    if (ogTitleContent) {
      if (existingOgTitle) {
        existingOgTitle.content = ogTitleContent;
      } else {
        const ogTitle = document.createElement("meta");
        ogTitle.setAttribute("property", "og:title");
        ogTitle.content = ogTitleContent;
        document.head.appendChild(ogTitle);
      }
    } else if (existingOgTitle) {
      existingOgTitle.content = "";
    }

    const existingOgDesc = document.querySelector<HTMLMetaElement>("meta[property='og:description']");
    if (currentSettings.metaDescription) {
      if (existingOgDesc) {
        existingOgDesc.content = currentSettings.metaDescription;
      } else {
        const ogDesc = document.createElement("meta");
        ogDesc.setAttribute("property", "og:description");
        ogDesc.content = currentSettings.metaDescription;
        document.head.appendChild(ogDesc);
      }
    } else if (existingOgDesc) {
      existingOgDesc.content = "";
    }
  }, [currentSettings]);

  return (
    <SiteSettingsContext.Provider value={{ settings: currentSettings, isLoading, error: error || null }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
