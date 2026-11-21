"use client";

import { Star4 } from "@moonwitness/ui/icons";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { mapCities, modules, projects, quickActions } from "@/lib/data";
import { Collections } from "./collections";
import { CommandHero } from "./hero";
import { CrewOrbit } from "./crew";
import { IdeasInMotion } from "./ideas";
import { ItemDrawer } from "./item-drawer";
import { MissionLog } from "./log";
import { ModuleDrawer } from "./module-drawer";
import { Pipeline } from "./pipeline";
import { ProjectUniverse } from "./projects";
import { QuickActions } from "./quick-actions";
import { Studios } from "./studios";
import { UniverseMap } from "./map";
import { UniverseStatus } from "./status";
import { NocProbesPanel } from "./noc-probes";
import { Workspace } from "./workspace";
import { StewardshipPanel } from "./StewardshipPanel";
import { useCommandCenter } from "./use-command-center";

export function CommandCenter() {
  const cc = useCommandCenter();
  const featuredProject = projects[0];

  if (!featuredProject) {
    throw new Error("Command center requires a featured project.");
  }

  return (
    <ConsoleShellAdapter
      breadcrumb="Shadow Command Center"
      search={{
        value: cc.query,
        onChange: cc.setQuery,
        placeholder: "Search projects, stories, research, or people…",
      }}
    >
      <CommandHero project={featuredProject} />
      <div className="px-4 py-6 sm:px-8">
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(16rem,1fr)]">
          <UniverseMap
            cities={mapCities}
            selectedId={cc.selectedCity}
            onSelect={cc.setSelectedCity}
          />
          <div className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-1">
            <UniverseStatus stats={cc.stats} status={cc.statsStatus} />
            <QuickActions actions={quickActions} onAction={cc.onAction} />
          </div>
        </div>

        {/* Row 2: Recent Workspace | Editorial Pipeline (2 cols) */}
        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Workspace items={cc.visible.workspace} onOpenItem={cc.onOpenWorkspaceItem} />
          <Pipeline
            columns={cc.visible.pipeline}
            onOpenCard={cc.onOpenCard}
            onMoveCard={cc.onMoveCard}
            pendingCardIds={cc.pendingPipelineIds}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
          <Collections
            collections={cc.visible.collections}
            onOpenCollection={cc.onOpenCollection}
          />
          <Studios modules={modules} onOpen={cc.onOpenModule} />
          <div className="md:col-span-2 xl:col-span-1">
            <IdeasInMotion />
          </div>
        </div>

        {/* Row 4: Project Universe | Crew Orbit */}
        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <ProjectUniverse projects={cc.visible.projects} />
          <CrewOrbit />
        </div>

        {/* Row 5: Mission Log (full width) */}
        <div className="mt-4">
          <MissionLog
            feed={cc.visible.feed}
            alerts={cc.alerts}
            workflows={cc.visible.workflows}
            onDismissAlert={cc.onDismissAlert}
            onToggleWorkflow={cc.onToggleWorkflow}
          />
        </div>

        <div className="mt-6">
          <AutoModelConsole
            model="command.workflow"
            searchQuery={cc.query}
            title="Command Center Workflows (Live ORM)"
          />
        </div>

        <NocProbesPanel />

        <StewardshipPanel />
      </div>

      {cc.openModule && (
        <ModuleDrawer
          module={cc.openModule}
          projects={projects}
          onQueue={cc.onQueue}
          onClose={cc.closeOverlays}
        />
      )}
      {cc.detail && <ItemDrawer detail={cc.detail} onClose={cc.closeOverlays} />}

      {cc.toast && (
        <div
          role="status"
          className="sticker sticker-yellow fixed bottom-[calc(var(--hud-bottom-space,0px)+1.5rem)] left-1/2 z-[60] -translate-x-1/2 px-5 py-2.5 font-brush text-sm"
        >
          {cc.toast}
        </div>
      )}

      <Star4 className="pointer-events-none fixed bottom-24 right-6 hidden h-6 w-6 text-[var(--primary)] opacity-50 xl:block" />
    </ConsoleShellAdapter>
  );
}
