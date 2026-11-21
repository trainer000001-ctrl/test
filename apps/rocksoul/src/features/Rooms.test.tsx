import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArchiveRoom from "./ArchiveRoom";
import { SignalRoom } from "./SignalRoom";
import { StudioRoom } from "./StudioRoom";

describe("RockSoul Companion Rooms", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves versioned drafts in StudioRoom preview storage", async () => {
    render(<StudioRoom />);

    fireEvent.change(screen.getByPlaceholderText("Draft title..."), {
      target: { value: "Dawn Witness Draft" },
    });
    fireEvent.change(screen.getByPlaceholderText("Write local draft..."), {
      target: { value: "Initial chronicle passage" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Version" }));

    await waitFor(() => {
      expect(screen.getByText("Saved v1")).toBeInTheDocument();
      expect(screen.getByText("Dawn Witness Draft")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Version" }));
    await waitFor(() => {
      expect(screen.getByText("Saved v2")).toBeInTheDocument();
    });
  });

  it("renders companion briefing and records research claims in SignalRoom", async () => {
    render(<SignalRoom />);

    await waitFor(() => {
      expect(screen.getByText(/RockSoul Sentinel: idle/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Research question..."), {
      target: { value: "Verify lunar boundary source" },
    });
    fireEvent.change(screen.getByPlaceholderText("Verified claim / finding..."), {
      target: { value: "Match confirmed across M6 benchmark" },
    });
    fireEvent.change(screen.getByPlaceholderText("Source citation / path..."), {
      target: { value: "packages/canon/src/mtime-engine.ts" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record Claim" }));

    await waitFor(() => {
      expect(screen.getByText("Verify lunar boundary source")).toBeInTheDocument();
      expect(screen.getByText("Source: packages/canon/src/mtime-engine.ts")).toBeInTheDocument();
    });
  });

  it("exports a validated Continuity sync bundle in ArchiveRoom", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<ArchiveRoom onReturn={vi.fn()} onCapture={vi.fn()} reducedMotion={false} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Midnight Signal Log" },
    });
    fireEvent.change(screen.getByLabelText("Content"), {
      target: { value: "Synced across MoonWitness Continuity contract." },
    });
    fireEvent.click(screen.getByRole("button", { name: "SAVE MEMORY" }));

    await waitFor(() => {
      expect(screen.getByText("Midnight Signal Log")).toBeInTheDocument();
    });

    const exportButton = screen.getByRole("button", { name: "EXPORT SYNC BUNDLE" });
    expect(exportButton).toBeEnabled();
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Prepared \d+ rocksoul-desktop record\(s\) for \/api\/v1\/memory\/sync\./),
      ).toBeInTheDocument();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const serialized = writeText.mock.calls[0]?.[0];
    expect(typeof serialized).toBe("string");
    const payload = JSON.parse(serialized as string) as {
      source: string;
      records: Array<{ title: string }>;
    };
    expect(payload.source).toBe("rocksoul-desktop");
    expect(payload.records.some((record) => record.title === "Midnight Signal Log")).toBe(true);
  });
});
