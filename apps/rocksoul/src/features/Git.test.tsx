import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib", () => ({ call: vi.fn() }));

import { call } from "../lib";
import { Git } from "./WorkspaceScreens";
import type { Repository } from "../lib/contracts";

describe("Git write confirmation", () => {
  it("previews repository state and runs an operation only after explicit confirmation", async () => {
    const callMock = vi.mocked(call as unknown as (command: string, args?: { view?: string }) => Promise<unknown>);
    callMock.mockImplementation(async (_command, args) => ({
      name: "test-repository",
      branch: "main",
      view: args?.view ?? "status",
      output: args?.view === "status" ? "## main" : "README.md | 1 +",
    }));
    const repository: Repository = {
      id: "repository-1",
      name: "test-repository",
      path: "C:/test-repository",
      remote_url: "",
      default_branch: "main",
      branch: "main",
    };
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<Git repositories={[repository]} onAddRepository={vi.fn()} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: "NEW BRANCH" }));
    expect(await screen.findByText(/DIFF SUMMARY/)).toHaveTextContent("README.md | 1 +");
    expect(call).toHaveBeenCalledWith("git_snapshot", { repositoryId: "repository-1", view: "status" });
    expect(call).toHaveBeenCalledWith("git_snapshot", { repositoryId: "repository-1", view: "diff" });
    expect(call).not.toHaveBeenCalledWith("git_execute", expect.anything());

    fireEvent.change(screen.getByLabelText("BRANCH NAME"), { target: { value: "feature/confirmed" } });
    fireEvent.click(screen.getByRole("button", { name: /CONFIRM CREATE BRANCH/ }));

    await waitFor(() =>
      expect(call).toHaveBeenCalledWith("git_execute", {
        repositoryId: "repository-1",
        operation: "create_branch",
        branch: "feature/confirmed",
        message: undefined,
      }),
    );
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("does not execute a cancelled operation", async () => {
    vi.mocked(call).mockResolvedValue({
      name: "test-repository",
      branch: "main",
      view: "status",
      output: "## main",
    });
    const repository: Repository = {
      id: "repository-1",
      name: "test-repository",
      path: "C:/test-repository",
      remote_url: "",
      default_branch: "main",
      branch: "main",
    };
    render(
      <Git
        repositories={[repository]}
        onAddRepository={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "PUSH" }));
    await screen.findByText("REPOSITORY PREVIEW");
    fireEvent.click(screen.getByRole("button", { name: "CANCEL" }));

    expect(call).not.toHaveBeenCalledWith("git_execute", expect.anything());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
