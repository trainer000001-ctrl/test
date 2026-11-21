"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyStateArt,
  Input,
  LoadingConstellation,
  NativeSelect,
  ScrollArea,
  SkinArtworkFrame,
  SkinScope,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  WorldArtwork,
  type auditDnaContrast,
  type getDnaWorld,
  type useSkin,
} from "@moonwitness/ui";

interface SkinLabFocusViewProps {
  activeSkin: ReturnType<typeof useSkin>["skin"];
  activeWorld: ReturnType<typeof getDnaWorld>;
  activeAudit: ReturnType<typeof auditDnaContrast>;
}

export function SkinLabFocusView({ activeSkin, activeWorld, activeAudit }: SkinLabFocusViewProps) {
  const [selectValue, setSelectValue] = useState("witness");
  const [sampleInput, setSampleInput] = useState("Witness frame verification");

  return (
    <SkinScope dnaId={activeWorld.id} className="space-y-6 border p-5 transition-colors sm:p-7">
      <div
        className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center"
        style={{ borderColor: activeWorld.palette.border }}
      >
        <div>
          <div
            className="font-mono text-xs uppercase tracking-widest"
            style={{ color: activeWorld.palette.mutedText }}
          >
            DNA {activeWorld.numeral} · {activeWorld.primaryIdentity}
          </div>
          <h2
            className="mt-1 text-2xl font-bold tracking-wide"
            style={{ color: activeWorld.palette.text }}
          >
            {activeWorld.name}
          </h2>
          <p className="mt-1 text-sm" style={{ color: activeWorld.palette.mutedText }}>
            {activeWorld.metaphor} — {activeWorld.shapeLanguage}
          </p>
        </div>
        <div className="w-full shrink-0 space-y-2 sm:w-72">
          <WorldArtwork dnaId={activeWorld.id} />
          <SkinArtworkFrame
            skin={activeSkin}
            dnaId={activeWorld.id}
            preferDnaArtwork
            sizes="288px"
            className="h-24 w-full border border-[var(--border)]"
          />
        </div>
      </div>

      {/* 9 Required Components Mapping (docs/dna/07-COMPONENT-MAPPING.md) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* 1. Button + 2. Badge */}
        <div className={`space-y-3 p-4 ${activeWorld.cardClass}`}>
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: activeWorld.palette.mutedText }}
            >
              01 BUTTON · 02 BADGE
            </span>
            <Badge
              variant={activeWorld.id === "01-imperium-lumen" ? "imperium" : "dna"}
              className={activeWorld.badgeClass}
            >
              {activeAudit.passed ? "WCAG AA PASS" : "CHECK"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant={activeWorld.id === "01-imperium-lumen" ? "imperiumPrimary" : "dna"}
              className={activeWorld.id === "01-imperium-lumen" ? "px-6" : activeWorld.buttonClass}
            >
              Primary Action
            </Button>
            <Button
              type="button"
              variant="outline"
              style={{
                borderColor: activeWorld.palette.border,
                color: activeWorld.palette.text,
                backgroundColor: activeWorld.palette.surfaceElevated,
              }}
            >
              Secondary
            </Button>
          </div>
        </div>

        {/* 3. Card */}
        <Card
          skin={activeWorld.id === "01-imperium-lumen" ? "imperium" : "dna"}
          className={activeWorld.cardClass}
        >
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base" style={{ color: activeWorld.palette.text }}>
              03 CARD · World Container
            </CardTitle>
            <CardDescription style={{ color: activeWorld.palette.mutedText }}>
              Motion: {activeWorld.motionGrammar}
            </CardDescription>
          </CardHeader>
          <CardContent
            className="p-4 pt-1 text-xs"
            style={{ color: activeWorld.palette.mutedText }}
          >
            Surface token paired cleanly with high-contrast ink.
          </CardContent>
        </Card>

        {/* 4. Input + 9. Native Select (D-012) */}
        <div className={`space-y-3 p-4 ${activeWorld.cardClass}`}>
          <div
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: activeWorld.palette.mutedText }}
          >
            04 INPUT · 09 NATIVE SELECT
          </div>
          <Input
            type="text"
            aria-label="DNA sample input"
            value={sampleInput}
            onChange={(e) => setSampleInput(e.target.value)}
            className={`min-h-11 w-full px-3 py-2 text-sm outline-none ${activeWorld.inputClass}`}
          />
          <NativeSelect
            aria-label="DNA sample lens"
            value={selectValue}
            onChange={(e) => setSelectValue(e.target.value)}
            className={`min-h-11 w-full px-3 py-2 text-sm outline-none ${activeWorld.inputClass}`}
          >
            <option value="witness">Lens 01 · Witness</option>
            <option value="promise">Lens 02 · Heart &amp; Promise</option>
            <option value="research">Lens 04 · Research &amp; Journey</option>
          </NativeSelect>
        </div>

        {/* 5. Tabs */}
        <div className={`space-y-2 p-4 ${activeWorld.cardClass}`}>
          <div
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: activeWorld.palette.mutedText }}
          >
            05 TABS
          </div>
          <Tabs defaultValue="telemetry">
            <TabsList
              className="grid w-full grid-cols-2"
              style={{ backgroundColor: activeWorld.palette.surfaceElevated }}
            >
              <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
              <TabsTrigger value="provenance">Provenance</TabsTrigger>
            </TabsList>
            <TabsContent
              value="telemetry"
              className="pt-2 text-xs"
              style={{ color: activeWorld.palette.text }}
            >
              Clean tab switch under {activeWorld.name} surface tokens.
            </TabsContent>
            <TabsContent
              value="provenance"
              className="pt-2 text-xs"
              style={{ color: activeWorld.palette.mutedText }}
            >
              Preset mapping: <span className="font-mono">{activeWorld.mappedSkinPreset}</span>
            </TabsContent>
          </Tabs>
        </div>

        {/* 6. Dialog + 7. Tooltip */}
        <div className={`space-y-3 p-4 ${activeWorld.cardClass}`}>
          <div
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: activeWorld.palette.mutedText }}
          >
            06 DIALOG · 07 TOOLTIP
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" className={activeWorld.buttonClass}>
                  Open Dialog
                </Button>
              </DialogTrigger>
              <DialogContent
                style={{
                  backgroundColor: activeWorld.palette.surface,
                  color: activeWorld.palette.text,
                  borderColor: activeWorld.palette.border,
                }}
              >
                <DialogHeader>
                  <DialogTitle>{activeWorld.name} · Dialog Overlay</DialogTitle>
                  <DialogDescription style={{ color: activeWorld.palette.mutedText }}>
                    Keyboard-trapped modal surface inheriting {activeWorld.id} tokens.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    style={{
                      borderColor: activeWorld.palette.border,
                      color: activeWorld.palette.text,
                    }}
                  >
                    Hover / Focus Tip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{activeWorld.metaphor}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* 8. ScrollArea + Artwork States */}
        <div className={`space-y-2 p-4 ${activeWorld.cardClass}`}>
          <div
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: activeWorld.palette.mutedText }}
          >
            08 SCROLL AREA · ARTWORK STATES
          </div>
          <ScrollArea className="h-36 pr-3">
            <div className="flex flex-wrap items-center gap-4">
              <EmptyStateArt className="w-24 shrink-0" />
              <LoadingConstellation className="w-20 shrink-0" />
              <ul className="space-y-1 font-mono text-[11px]">
                {activeAudit.pairs.map((pair) => (
                  <li key={pair.pairName}>
                    {pair.pairName}: <strong>{pair.ratio}:1</strong>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>
        </div>
      </div>
    </SkinScope>
  );
}
