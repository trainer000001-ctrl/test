import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Issue } from "../lib/contracts";
import EditIssueDialog from "./EditIssueDialog";

const sampleIssue: Issue = {
  id: "test-id",
  issue_key: "DX-001",
  title: "First pass",
  description: "Initial description",
  priority: "P2",
  status: "open",
  assignee: "",
  repository_id: "repo-1",
  repository_name: "core-repo",
  updated_at: "2026-11-15T00:00:00Z",
  project_id: "project-1",
};

describe("EditIssueDialog", () => {
  it("submits the updated issue payload and closes the dialog", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <EditIssueDialog
        issue={sampleIssue}
        projects={[
          { id: "project-1", name: "Core", description: "", status: "active" },
          { id: "project-2", name: "Secondary", description: "", status: "active" },
        ]}
        repositories={[
          { id: "repo-1", name: "core-repo", path: "/tmp/repo", branch: "main", default_branch: "main", remote_url: "" },
          { id: "repo-2", name: "other-repo", path: "/tmp/other", branch: "main", default_branch: "main", remote_url: "" },
        ]}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "TITLE" }), { target: { value: "Second pass" } });
    fireEvent.change(screen.getByRole("textbox", { name: "DESCRIPTION" }), {
      target: { value: "Updated description" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "PRIORITY" }), { target: { value: "P1" } });
    fireEvent.change(screen.getByRole("combobox", { name: "PROJECT" }), { target: { value: "project-2" } });
    fireEvent.change(screen.getByRole("combobox", { name: "REPOSITORY" }), { target: { value: "repo-2" } });
    fireEvent.click(screen.getByRole("button", { name: "SAVE CHANGES" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        issueId: "test-id",
        title: "Second pass",
        description: "Updated description",
        priority: "P1",
        projectId: "project-2",
        repositoryId: "repo-2",
      });
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("surfaces update failures and allows retry", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("Update rejected"))
      .mockResolvedValueOnce(undefined);
    const onClose = vi.fn();

    render(
      <EditIssueDialog
        issue={sampleIssue}
        projects={[{ id: "project-1", name: "Core", description: "", status: "active" }]}
        repositories={[{ id: "repo-1", name: "core-repo", path: "/tmp/repo", branch: "main", default_branch: "main", remote_url: "" }]}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "SAVE CHANGES" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Update rejected");
    });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "SAVE CHANGES" }));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it("closes when clicking the backdrop, cancel button, or pressing escape", () => {
    const onClose = vi.fn();
    const { container } = render(
      <EditIssueDialog
        issue={sampleIssue}
        projects={[]}
        repositories={[]}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    const backdrop = container.querySelector(".modal-backdrop")!;
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(backdrop, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
