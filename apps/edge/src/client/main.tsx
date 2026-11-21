import React from "react";
import ReactDOM from "react-dom/client";
import { SkinProvider, SkinRoot } from "@moonwitness/ui";
import { EdgeTasksApp } from "./App";
import "./styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element '#root' not found");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <SkinProvider defaultSkin="riot" defaultDna="03-rocksoul">
      <SkinRoot dnaId="03-rocksoul" className="min-h-screen bg-background text-foreground">
        <EdgeTasksApp />
      </SkinRoot>
    </SkinProvider>
  </React.StrictMode>,
);
