import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const worldDestinations = ["archive", "studio", "riot-deck", "signal-room"] as const;
export const pageRoutes = ["deck", "monitor", "pit", "git", "war-room", "noise"] as const;
export type WorldDestination = (typeof worldDestinations)[number];
export type PageRoute = (typeof pageRoutes)[number];
export type WorldRoute = "awakening" | "threshold" | WorldDestination | PageRoute;

const validWorldRoutes = new Set<string>(worldDestinations);
const validPageRoutes = new Set<string>(pageRoutes);

function isWorldDestination(path: string): path is WorldDestination {
  return validWorldRoutes.has(path);
}

export function isPageRoute(path: string): path is PageRoute {
  return validPageRoutes.has(path);
}

export function toWorldRoute(path: string): WorldRoute {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  if (normalized === "" || normalized === "awakening") return "awakening";
  if (normalized === "threshold") return "threshold";
  if (isWorldDestination(normalized) || isPageRoute(normalized)) return normalized;
  return "awakening";
}

export function useWorldRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const rawPath = location.pathname.replace(/^\/+|\/+$/g, "");
  const path = rawPath === "issues" ? "pit" : rawPath;
  const isAuthCallback = path === "auth/callback";
  const isValidRoute =
    path.length === 0 ||
    path === "awakening" ||
    path === "threshold" ||
    isAuthCallback ||
    isWorldDestination(path) ||
    isPageRoute(path);
  const destination: WorldRoute = path.length === 0 || path === "awakening"
    ? "awakening"
    : path === "threshold" || isWorldDestination(path) || isPageRoute(path)
      ? path
      : "awakening";

  useEffect(() => {
    if (!isValidRoute) navigate("/", { replace: true });
  }, [isValidRoute, navigate]);

  const navigateDestination = (next: WorldRoute) => {
    navigate(next === "awakening" ? "/" : `/${next}`);
  };

  const returnToThreshold = () => navigate("/threshold", { replace: false });

  return { destination, navigateDestination, returnToThreshold };
}
