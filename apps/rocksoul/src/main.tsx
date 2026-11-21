import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { SkinProvider } from "@moonwitness/ui";
import { SkinRoot } from "@moonwitness/ui/imperium";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/barlow-condensed/900.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import App from "./App";
import "./styles.css";
import "./design-system/tokens.css";
import "./design-system/primitives.css";
import "./design-system/layout.css";
import "./features/world.css";
import "./features/world/living-world.css";
import "./features/cinematic-shell.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SkinProvider defaultSkin="riot" defaultDna="03-rocksoul">
      <SkinRoot dnaId="03-rocksoul" className="min-h-full">
        <HashRouter>
          <App />
        </HashRouter>
      </SkinRoot>
    </SkinProvider>
  </React.StrictMode>,
);
