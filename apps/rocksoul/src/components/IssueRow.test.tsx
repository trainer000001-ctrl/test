import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Issue } from "../lib/contracts";
import IssueRow from "./IssueRow";

const mockIssue: Issue = {
  id: "test-id",
  issue_key: "DX-001",
  title: "A sample issue",
  description: "Description",
  priority: "P1",
  status: "open",
  assignee: "",
  repository_id: null,
  repository_name: "",
  updated_at: "2026-11-15T00:00:00Z",
  project_id: null,
};

describe("IssueRow", () => {
  it("renders issue fields and triggers onStatusChange when status changes", () => {
    const onStatusChange = vi.fn();
    render(<IssueRow issue={mockIssue} onStatusChange={onStatusChange} />);

    expect(screen.getByText("DX-001")).toBeInTheDocument();
    expect(screen.getByText("A sample issue")).toBeInTheDocument();

    const select = screen.getByLabelText("Status for DX-001");
    fireEvent.change(select, { target: { value: "done" } });

    expect(onStatusChange).toHaveBeenCalledWith("test-id", "done");
  });

  it("triggers onEdit and onDelete callbacks", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<IssueRow issue={mockIssue} onEdit={onEdit} onDelete={onDelete} />);

    fireEvent.click(screen.getByLabelText("Edit DX-001"));
    expect(onEdit).toHaveBeenCalledWith(mockIssue);

    fireEvent.click(screen.getByLabelText("Delete DX-001"));
    expect(onDelete).toHaveBeenCalledWith(mockIssue);
  });
});
