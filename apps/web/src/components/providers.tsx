"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState, type ReactNode } from "react";
import { SkinProvider } from "@moonwitness/ui";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    const onSessionChange = () => {
      void queryClient.invalidateQueries({ queryKey: ["app", "auth"] });
      void queryClient.invalidateQueries({ queryKey: ["control", "auth"] });
    };
    const onTenantChanged = () => {
      void queryClient.invalidateQueries({ refetchType: "active" });
    };
    window.addEventListener("mw:session-change", onSessionChange);
    window.addEventListener("mw:tenant-changed", onTenantChanged);
    return () => {
      window.removeEventListener("mw:session-change", onSessionChange);
      window.removeEventListener("mw:tenant-changed", onTenantChanged);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <RootSkinProvider>{children}</RootSkinProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function RootSkinProvider({ children }: { children: ReactNode }) {
  return <SkinProvider defaultSkin="default">{children}</SkinProvider>;
}
