import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateIssueDialog from "./CreateIssueDialog";

describe("CreateIssueDialog", () => {
  it("submits the trimmed form values and closes the dialog", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <CreateIssueDialog
        onClose={onClose}
        onCreate={onCreate}
        projects={[{ id: "project-1", name: "Core", description: "", status: "active" }]}
        repositories={[{ id: "repo-1", name: "engine", path: "/tmp/engine", branch: "main", default_branch: "main", remote_url: "" }]}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Give this chaos a name..."), { target: { value: "  Ship it  " } });
    fireEvent.change(screen.getByPlaceholderText("Context, acceptance criteria, links..."), {
      target: { value: " Verify release " },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "PRIORITY" }), { target: { value: "P1" } });
    fireEvent.change(screen.getByRole("combobox", { name: "PROJECT" }), { target: { value: "project-1" } });
    fireEvent.change(screen.getByRole("combobox", { name: "REPOSITORY" }), { target: { value: "repo-1" } });

    fireEvent.click(screen.getByRole("button", { name: "CREATE ISSUE" }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        title: "Ship it",
        description: "Verify release",
        priority: "P1",
        projectId: "project-1",
        repositoryId: "repo-1",
      });
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("surfaces a creation error and stays open", async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error("Database unavailable"));
    const onClose = vi.fn();
    const { getByPlaceholderText } = render(<CreateIssueDialog onClose={onClose} onCreate={onCreate} />);

    fireEvent.change(getByPlaceholderText("Give this chaos a name..."), { target: { value: "Save this issue" } });
    fireEvent.click(screen.getByRole("button", { name: "CREATE ISSUE" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Database unavailable");
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
