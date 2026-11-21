import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RiotRail from "./RiotRail";

describe("RiotRail", () => {
  it("highlights the active page and triggers navigation and switchboard", () => {
    const onNavigate = vi.fn();
    const onSwitchboard = vi.fn();

    render(<RiotRail page="pit" onNavigate={onNavigate} onSwitchboard={onSwitchboard} />);

    expect(screen.getByTitle("PIT")).toHaveClass("active");
    fireEvent.click(screen.getByTitle("OVERSEER"));
    expect(onNavigate).toHaveBeenCalledWith("monitor");
    fireEvent.click(screen.getByTitle("GIT"));
    expect(onNavigate).toHaveBeenCalledWith("git");

    fireEvent.click(screen.getByTitle("Open command switchboard"));
    expect(onSwitchboard).toHaveBeenCalledTimes(1);
  });
});
