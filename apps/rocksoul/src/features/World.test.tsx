import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Awakening, PreviewRoom, Threshold } from "./World";
import useMotionPreference from "./useMotionPreference";

vi.mock("./world/WorldCanvas", () => ({
  default: ({ destination }: { destination: string }) => (
    <div data-testid="world-canvas" data-destination={destination} />
  ),
}));

describe("Awakening", () => {
  it("enters the Threshold from the accessible action", () => {
    const onEnter = vi.fn();
    render(<Awakening onEnter={onEnter} reducedMotion />);

    expect(screen.getByRole("heading", { name: "ROCKSOUL DX" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ENTER THE UNKNOWN" }));
    expect(onEnter).toHaveBeenCalledOnce();
  });
});

describe("Threshold", () => {
  it("shows the canonical manifesto and emphasizes its fourth line", () => {
    render(<Threshold onNavigate={vi.fn()} reducedMotion={false} onToggleMotion={vi.fn()} />);

    expect(screen.getByText("01 — NO CLUE WHAT'S COMING.")).toBeInTheDocument();
    expect(screen.getByText("02 — NO IDEA HOW THIS ENDS.")).toBeInTheDocument();
    expect(screen.getByText("03 — COULD BE RIGHT. COULD BE WRONG.")).toBeInTheDocument();
    expect(screen.getByText("04 — BUT I KNOW WHO SAID: \"I'LL FINISH IT.\"")).toHaveClass("manifesto-climax");
  });

  it("offers direct destinations and routes the Riot Deck command entry", () => {
    const onNavigate = vi.fn();
    render(<Threshold onNavigate={onNavigate} reducedMotion onToggleMotion={vi.fn()} />);

    expect(screen.getByRole("navigation", { name: "Four destinations" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /WHAT ARE WE MAKING TODAY/ }));
    expect(onNavigate).toHaveBeenCalledWith("riot-deck");
  });

  it("filters destinations and opens the first match from the keyboard", () => {
    const onNavigate = vi.fn();
    render(<Threshold onNavigate={onNavigate} reducedMotion onToggleMotion={vi.fn()} />);

    const search = screen.getByRole("searchbox", { name: "Search destinations" });
    fireEvent.change(search, { target: { value: "signal" } });
    expect(screen.getByRole("button", { name: "Enter THE SIGNAL ROOM room preview" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enter THE ARCHIVE/ })).not.toBeInTheDocument();
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onNavigate).toHaveBeenCalledWith("signal-room");
  });

  it("exposes the reduced-motion state as a toggle", () => {
    const onToggleMotion = vi.fn();
    render(<Threshold onNavigate={vi.fn()} reducedMotion onToggleMotion={onToggleMotion} />);

    const control = screen.getByRole("button", { name: "LOW MOTION ON" });
    expect(control).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(control);
    expect(onToggleMotion).toHaveBeenCalledOnce();
  });
});

describe("PreviewRoom", () => {
  it("labels an unfinished room as preview and returns to the Threshold", () => {
    const onReturn = vi.fn();
    render(
      <PreviewRoom
        roomId="studio"
        onReturn={onReturn}
        onNavigate={vi.fn()}
        reducedMotion={false}
        systemReducedMotion={false}
        onToggleMotion={vi.fn()}
      />,
    );

    expect(screen.getByText("Studio workflows are not part of this visual foundation.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "RETURN TO THE THRESHOLD" }));
    expect(onReturn).toHaveBeenCalledOnce();
  });
});

describe("useMotionPreference", () => {
  it("toggles low motion locally and keeps the system preference authoritative", () => {
    const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
    const media = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => media) });

    try {
      const { result, unmount } = renderHook(() => useMotionPreference());
      expect(result.current.reducedMotion).toBe(true);
      expect(result.current.systemReducedMotion).toBe(true);
      act(() => result.current.toggleMotion());
      expect(result.current.reducedMotion).toBe(true);
      unmount();
    } finally {
      if (originalMatchMedia) Object.defineProperty(window, "matchMedia", originalMatchMedia);
      else Reflect.deleteProperty(window, "matchMedia");
    }

    const { result } = renderHook(() => useMotionPreference());
    act(() => result.current.toggleMotion());
    expect(result.current.reducedMotion).toBe(true);
    act(() => result.current.toggleMotion());
    expect(result.current.reducedMotion).toBe(false);
  });
});
