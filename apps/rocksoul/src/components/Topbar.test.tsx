import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SkinProvider } from "@moonwitness/ui";
import Topbar from "./Topbar";

describe("Topbar", () => {
  it("renders repositories and triggers repository, command, monitor, refresh, and settings callbacks", () => {
    const onRepositoryChange = vi.fn();
    const onCommand = vi.fn();
    const onSettings = vi.fn();
    const onOpenMonitor = vi.fn();
    const onRefresh = vi.fn();

    render(
      <Topbar
        repositories={[{ id: "repo-1", name: "moonwitness", path: "/tmp/mw", branch: "main", default_branch: "main", remote_url: "" }]}
        selectedRepository=""
        onRepositoryChange={onRepositoryChange}
        onCommand={onCommand}
        onSettings={onSettings}
        onOpenMonitor={onOpenMonitor}
        onRefresh={onRefresh}
        monitorSummary="12.5G · 2/5"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /12\.5G/ }));
    expect(onOpenMonitor).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Refresh workspace" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Selected repository"), {
      target: { value: "repo-1" },
    });
    expect(onRepositoryChange).toHaveBeenCalledWith("repo-1");

    fireEvent.click(screen.getByRole("button", { name: /CTRL \+ K/i }));
    expect(onCommand).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it("cycles @moonwitness/ui skin state inside SkinProvider", () => {
    render(
      <SkinProvider defaultSkin="riot" defaultDna="03-rocksoul" persist={false}>
        <Topbar
          repositories={[]}
          selectedRepository=""
          onRepositoryChange={vi.fn()}
          onCommand={vi.fn()}
          onSettings={vi.fn()}
        />
      </SkinProvider>,
    );

    const skinBtn = screen.getByRole("button", { name: /Switch skin \(riot\)/i });
    fireEvent.click(skinBtn);
    expect(screen.getByRole("button", { name: /Switch skin \(technical\)/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Select skin preset"), {
      target: { value: "sanctuary" },
    });
    expect(screen.getByRole("button", { name: /Switch skin \(sanctuary\)/i })).toBeInTheDocument();

    const themeBtn = screen.getByRole("button", { name: /Switch to light theme/i });
    fireEvent.click(themeBtn);
    expect(screen.getByRole("button", { name: /Switch to dark theme/i })).toBeInTheDocument();
  });

  it("supports optional MoonWitness ID sign-in and signed-in @username state", () => {
    const onSignIn = vi.fn();
    const onSignOut = vi.fn();

    const { rerender } = render(
      <Topbar
        repositories={[]}
        selectedRepository=""
        onRepositoryChange={vi.fn()}
        onCommand={vi.fn()}
        onSettings={vi.fn()}
        identity={null}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /SIGN IN/i }));
    expect(onSignIn).toHaveBeenCalledTimes(1);

    rerender(
      <Topbar
        repositories={[]}
        selectedRepository=""
        onRepositoryChange={vi.fn()}
        onCommand={vi.fn()}
        onSettings={vi.fn()}
        identity={{ username: "mwadmin", displayName: "MoonWitness Admin", role: "admin" }}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />,
    );

    expect(screen.getByText("@mwadmin")).toBeInTheDocument();
    expect(screen.getByText("MW")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out @mwadmin" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
