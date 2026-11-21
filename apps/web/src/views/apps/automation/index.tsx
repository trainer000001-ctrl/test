"use client";

import { useEffect, useState, type FormEvent } from "react";
import { requestApiJson } from "@moonwitness/contracts/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CutoutArtwork,
  Input,
  SkinOrnament,
} from "@moonwitness/ui";
import { AutoModelConsole } from "@/components/meta/auto-model-console";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { useTranslation } from "@/hocs/TranslationWrapper";

interface KhidraSummary {
  automations?: number;
  webhooks?: number;
  webhookLogs?: number;
}

export function AutomationKhidraView() {
  const { dictionary } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeModel, setActiveModel] = useState<
    "ir.automation" | "ir.webhook" | "ir.webhook.log" | "mail.message" | "mail.tracking.value"
  >("ir.automation");
  const [summary, setSummary] = useState<KhidraSummary | null>(null);
  const [triggerEvent, setTriggerEvent] = useState("on_create");
  const [triggerModel, setTriggerModel] = useState("timeline.event");
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  async function loadSummary() {
    const res = await requestApiJson<KhidraSummary>("/api/v1/khidra/summary").catch(() => null);
    if (res) setSummary(res);
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  async function handleFireTrigger(e: FormEvent) {
    e.preventDefault();
    setTriggerStatus(null);
    const normalizedTrigger =
      triggerEvent === "on_update" || triggerEvent === "on_time" ? triggerEvent : "on_create";
    try {
      const res = await requestApiJson<{ executed?: number | unknown[] }>(
        "/api/v1/khidra/trigger",
        {
          method: "POST",
          body: JSON.stringify({
            model: triggerModel.trim(),
            trigger: normalizedTrigger,
            record: { source: "automation-studio" },
          }),
        },
      );
      const count = Array.isArray(res?.executed) ? res.executed.length : (res?.executed ?? 0);
      setTriggerStatus(
        `Dispatched ${normalizedTrigger} on ${triggerModel} (executed ${count} automation rule(s)).`,
      );
      await loadSummary();
    } catch (err) {
      setTriggerStatus(err instanceof Error ? err.message : "Failed to dispatch Khidra trigger.");
    }
  }

  return (
    <ConsoleShellAdapter
      breadcrumb={dictionary.navigation.automation}
      plane="creator"
      activeOverride="automation"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: dictionary.shell.searchPlaceholder,
      }}
    >
      <div className="space-y-4">
        <Card className="relative overflow-hidden">
          <SkinOrnament slot="corner" className="start-2 top-2" />
          <CutoutArtwork
            id="patch-cable-jack"
            decorative
            className="pointer-events-none absolute -top-2 hidden h-24 w-24 opacity-20 sm:block ltr:-right-4 rtl:-left-4"
          />
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">KHIDRA AUTOMATION ENGINE</Badge>
              <Badge variant="default">ACTIVE RULES: {summary?.automations ?? 0}</Badge>
              <Badge variant="secondary">
                WEBHOOKS: {summary?.webhooks ?? 0} · LOGS: {summary?.webhookLogs ?? 0}
              </Badge>
            </div>
            <h1 className="font-semibold leading-none tracking-tight text-lg uppercase">
              {dictionary.apps.automationTitle}
            </h1>
            <CardDescription>{dictionary.apps.automationSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              onSubmit={(e) => void handleFireTrigger(e)}
              className="flex flex-wrap items-center gap-2 border border-[var(--border)] bg-[var(--background)] p-3"
            >
              <Input
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                placeholder="on_create | on_update | on_time"
                aria-label="Trigger Event"
                className="max-w-xs"
              />
              <Input
                value={triggerModel}
                onChange={(e) => setTriggerModel(e.target.value)}
                placeholder="Target Model"
                aria-label="Target Model"
                className="max-w-xs"
              />
              <Button type="submit" size="sm">
                Dispatch Event Trigger
              </Button>
            </form>
            {triggerStatus ? (
              <div className="font-mono text-xs text-[var(--primary)]">{triggerStatus}</div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "ir.automation", label: "Automation Rules" },
                  { id: "ir.webhook", label: "Webhooks" },
                  { id: "ir.webhook.log", label: "Webhook Logs" },
                  { id: "mail.message", label: "Chatter Messages" },
                  { id: "mail.tracking.value", label: "Field Tracking Diffs" },
                ] as const
              ).map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  size="sm"
                  variant={activeModel === m.id ? "default" : "outline"}
                  onClick={() => setActiveModel(m.id)}
                >
                  {m.label} ({m.id})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <AutoModelConsole
          model={activeModel}
          searchQuery={search}
          domainIcon="khidra"
          cutoutId="patch-cable-jack"
        />
      </div>
    </ConsoleShellAdapter>
  );
}
export default AutomationKhidraView;
