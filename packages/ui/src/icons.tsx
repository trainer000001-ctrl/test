import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

export const HUD_NAV_ICON_PATHS = {
  control: "M12 3l8 4v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z",
  vpn: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v9H5z",
  syslog: "M4 6h16M4 12h16M4 18h10",
  snmp: "M3 12h4l3-7 4 14 3-7h4",
  storage: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3v10c0 1.7-3.6 3-8 3s-8-1.3-8-3V7z",
  radius: "M15 7a4 4 0 1 0-4 4h2v3h3v3h3v-4l-4-6z",
  dashboard: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  storyStudio: "M4 5h16v14H4zM8 9h8M8 13h5",
  episodes: "M5 4h14v16H5zM10 9l5 3-5 3V9z",
  posterForge: "M4 4h16v16H4zM8 15l3-4 2 2 3-4 2 6H8z",
  collections: "M4 6h16v4H4zM6 12h12v4H6zM8 18h8",
  research: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  crew: "M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  missionLog: "M6 4h12v16H6zM9 8h6M9 12h6M9 16h4",
  intelligence: "M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7l3-7z",
  idLab: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-7 8a7 7 0 0 1 14 0",
  skinLab: "M12 3a9 9 0 1 0 0 18 2.5 2.5 0 0 0 0-5h-1a2 2 0 0 1 0-4h4a5 5 0 0 0-3-9z",
  archive: "M3 5h18v4H3zM5 9h14v11H5zM10 13h4",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.9 4a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L16.3 3h-4.6l-.4 3a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.4 3h4.6l.4-3a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z",
} as const;

function makeIcon(d: string | string[], viewBox = "0 0 24 24") {
  const paths = Array.isArray(d) ? d : [d];
  return function Icon({ className = "h-4 w-4", ...props }: IconProps) {
    return (
      <svg
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden={props["aria-label"] ? undefined : true}
        {...props}
      >
        {paths.map((p, idx) => (
          <path key={idx} d={p} />
        ))}
      </svg>
    );
  };
}

export const Activity = makeIcon("M3 12h4l3-8 4 16 3-8h4");
export const Archive = makeIcon(["M3 5h18v4H3z", "M5 9h14v11H5z", "M10 13h4"]);
export const ArrowRight = makeIcon(["M5 12h14", "M13 5l7 7-7 7"]);
export const ArsyRelay = makeIcon(["M12 4v16", "M7 8a7 7 0 0 0 0 8", "M17 8a7 7 0 0 1 0 8", "M4 5a11 11 0 0 0 0 14", "M20 5a11 11 0 0 1 0 14"]);
export const BarbedWire = makeIcon(["M2 12h20", "M6 8l4 8", "M10 8l-4 8", "M14 8l4 8", "M18 8l-4 8"]);
export const Bell = makeIcon(["M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 0 1-3.4 0"]);
export const Bolt = makeIcon("M13 2L4 14h7l-1 8 10-12h-7l0-8z");
export const CassetteTape = makeIcon(["M3 6h18v12H3z", "M8 12a2 2 0 1 0 0.01 0", "M16 12a2 2 0 1 0 0.01 0", "M7 18l2-3h6l2 3"]);
export const Copy = makeIcon(["M9 9h11v11H9z", "M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"]);
export const Crown = makeIcon("M3 18h18l-2-10-4.5 4L12 5l-2.5 7L5 8 3 18z");
export const Download = makeIcon(["M12 3v12", "M7 10l5 5 5-5", "M4 20h16"]);
export const FileText = makeIcon(["M6 3h9l5 5v13H6z", "M14 3v5h5", "M9 13h6", "M9 17h6"]);
export const GitBranch = makeIcon(["M6 3v12", "M18 6a3 3 0 1 0 0.01 0", "M6 18a3 3 0 1 0 0.01 0", "M18 9a9 9 0 0 1-9 9"]);
export const GlobeIcon = makeIcon(["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M2 12h20", "M12 2a15 15 0 0 1 0 20", "M12 2a15 15 0 0 0 0 20"]);
export const Grid = makeIcon(["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"]);
export const List = makeIcon(["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"]);
export const MemoryTapeNode = makeIcon(["M3 7h18v10H3z", "M8 12a2 2 0 1 0 0.01 0", "M16 12a2 2 0 1 0 0.01 0", "M10 12h4"]);
export const Menu = makeIcon(["M4 6h16", "M4 12h16", "M4 18h16"]);
export const MtimeHorizon = makeIcon(["M3 17h18", "M12 5a5 5 0 0 0 4 8 6 6 0 1 1-4-8z", "M7 17a5 5 0 0 1 10 0"]);
export const MyceliumSpore = makeIcon(["M12 12a3 3 0 1 0 0.01 0", "M12 3v6", "M12 15v6", "M3 12h6", "M15 12h6", "M5.6 5.6l4.2 4.2", "M14.2 14.2l4.2 4.2"]);
export const Play = makeIcon("M6 4l14 8-14 8V4z");
export const RadiusKey = makeIcon(["M9 15a5 5 0 1 1 4-8l7 7v4h-4v-3h-3l-2-2"]);
export const RefreshCw = makeIcon(["M21 4v6h-6", "M3 20v-6h6", "M20.4 9A9 9 0 0 0 5.6 5.6L3 8", "M3.6 15a9 9 0 0 0 14.8 3.4L21 16"]);
export const SafetyPin = makeIcon(["M7 17a3 3 0 1 1 4-4l7-7a2 2 0 0 1 3 3l-9 9"]);
export const ScriptureFolio = makeIcon(["M4 5a3 3 0 0 1 3-1h5v16H7a3 3 0 0 0-3 1V5z", "M20 5a3 3 0 0 0-3-1h-5v16h5a3 3 0 0 1 3 1V5z"]);
export const Search = makeIcon(["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M20 20l-4.2-4.2"]);
export const SearchIcon = Search;
export const ShieldCheck = makeIcon(["M12 3l8 4v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z", "M9 12l2 2 4-4"]);
export const SimpulNode = makeIcon(["M12 5a2 2 0 1 0 0.01 0", "M5 17a2 2 0 1 0 0.01 0", "M19 17a2 2 0 1 0 0.01 0", "M12 7v4", "M12 11l-5.5 4.5", "M12 11l5.5 4.5"]);
export const SkinPalette = makeIcon(["M12 3a9 9 0 1 0 0 18 2.5 2.5 0 0 0 0-5h-1a2 2 0 0 1 0-4h4a5 5 0 0 0-3-9z", "M7.5 10h.01", "M10.5 7h.01", "M15 8h.01"]);
export const SkullCrossbonesFunky = makeIcon(["M12 4a6 6 0 0 0-6 6c0 2.2 1.2 4 3 5v2h6v-2c1.8-1 3-2.8 3-5a6 6 0 0 0-6-6z", "M9.5 10h.01", "M14.5 10h.01", "M5 20l14-4", "M5 16l14 4"]);
export const Smiley = makeIcon(["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M8.5 9.5h.01", "M15.5 9.5h.01", "M8 14.5a4.5 4.5 0 0 0 8 0"]);
export const SnmpProbe = makeIcon(["M3 12h4l3-7 4 14 3-7h4", "M12 3v2", "M12 19v2"]);
export const Splatter = makeIcon("M12 3l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z");
export const SprayCan = makeIcon(["M8 8h8v13H8z", "M10 5h4v3h-4z", "M15 3l3-1", "M16 6l4 0"]);
export const Star4 = makeIcon("M12 2l2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2z");
export const StorageBucket = makeIcon(["M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3v10c0 1.7-3.6 3-8 3s-8-1.3-8-3V7z", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"]);
export const Sun = makeIcon(["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M12 2v2", "M12 20v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2 12h2", "M20 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4"]);
export const SyslogStream = makeIcon(["M4 6h16", "M4 11h12", "M4 16h16", "M17 11l3 2-3 2"]);
export const Upload = makeIcon(["M12 15V3", "M7 8l5-5 5 5", "M4 20h16"]);
export const VpnTunnel = makeIcon(["M7 11V7a5 5 0 0 1 10 0v4", "M5 11h14v9H5z", "M12 15v2"]);
export const X = makeIcon(["M6 6l12 12", "M18 6L6 18"]);

/* ---------- Sacred & Nine-World Emblems ---------- */
export const CrescentStarIcon = makeIcon([
  "M15.5 16.8A6.8 6.8 0 0 1 10.2 4.5a7.5 7.5 0 1 0 9.3 11.4 6.7 6.7 0 0 1-4 .9z",
  "M17.5 6.5l.8 1.8 1.9.3-1.4 1.3.3 1.9-1.6-.9-1.6.9.3-1.9-1.4-1.3 1.9-.3.8-1.8z",
]);
export const CrownEmblemIcon = makeIcon(["M3 18h18l-2-10-4.5 4L12 5l-2.5 7L5 8 3 18z", "M5 21h14"]);
export const DiamondStarOrnament = makeIcon("M12 2l2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2z");
export const OctagramMandalaIcon = makeIcon(["M6 6h12v12H6z", "M12 3l9 9-9 9-9-9 9-9z"]);
export const SearchLensIcon = Search;
export const PortalAstrolabeIcon = makeIcon(["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 6v12", "M6 12h12", "M12 9a3 3 0 1 0 0.01 0"]);
export const MoonwitnessCrestIcon = CrescentStarIcon;
export const ArsyTowerIcon = ArsyRelay;
export const QalamNibIcon = makeIcon(["M12 3l6 10-6 8-6-8 6-10z", "M12 13v8"]);
export const SidraPolyhedronIcon = makeIcon(["M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z", "M12 2v20", "M3.5 7L20.5 17", "M20.5 7L3.5 17"]);
export const RocksoulCubeIcon = makeIcon(["M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z", "M12 12l8-4.5", "M12 12v9", "M12 12L4 7.5"]);
export const CrayonPrismIcon = makeIcon(["M12 3l9 16H3L12 3z", "M12 9l4 7H8l4-7z"]);
export const SinCanMirrorIcon = makeIcon(["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 3v18", "M12 8a4 4 0 0 1 0 8"]);
export const MythosArchIcon = makeIcon(["M5 20V11a7 7 0 0 1 14 0v9", "M9 20v-7a3 3 0 0 1 6 0v7", "M3 20h18"]);
export const AwsScalesIcon = makeIcon(["M12 3v18", "M5 7h14", "M5 7l-2.5 6h5L5 7z", "M19 7l-2.5 6h5L19 7z", "M8 21h8"]);

export function WorldEmblemById({
  worldId,
  className = "h-6 w-6",
  ...props
}: IconProps & { worldId: string }) {
  switch (worldId) {
    case "moonwitness":
      return <MoonwitnessCrestIcon className={className} {...props} />;
    case "arsy":
      return <ArsyTowerIcon className={className} {...props} />;
    case "human-pen":
      return <QalamNibIcon className={className} {...props} />;
    case "sidra":
      return <SidraPolyhedronIcon className={className} {...props} />;
    case "rocksoul-dx":
      return <RocksoulCubeIcon className={className} {...props} />;
    case "crayon":
      return <CrayonPrismIcon className={className} {...props} />;
    case "sin-can":
      return <SinCanMirrorIcon className={className} {...props} />;
    case "mythos":
      return <MythosArchIcon className={className} {...props} />;
    case "angel-with-shotgun":
      return <AwsScalesIcon className={className} {...props} />;
    default:
      return <PortalAstrolabeIcon className={className} {...props} />;
  }
}
