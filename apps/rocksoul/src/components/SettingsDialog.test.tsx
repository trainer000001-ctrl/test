import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib", () => ({ call: vi.fn() }));

import { call } from "../lib";
import SettingsDialog from "./SettingsDialog";

const mockedCall = call as unknown as ReturnType<typeof vi.fn>;

describe("SettingsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads backup and gateway status and triggers backup/restore/gateway actions", async () => {
    mockedCall.mockImplementation(async (command: string) => {
      if (command === "cloud_backup_status") {
        return { available: true, connected: true, account: "user@example.com", lastBackupAt: "2026-11-16T00:00:00Z", error: null };
      }
      if (command === "s3_gateway_status") {
        return { running: false, endpoint: null, bucket: "rocksoul", access_key: null, secret_key: null };
      }
      if (command === "backup_to_google_drive") {
        return { available: true, connected: true, account: "user@example.com", lastBackupAt: "2026-11-16T01:00:00Z", error: null };
      }
      if (command === "start_s3_gateway") {
        return { running: true, endpoint: "http://127.0.0.1:9000", bucket: "rocksoul", access_key: "ak", secret_key: "sk" };
      }
      return {};
    });

    render(<SettingsDialog onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/user@example.com/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "BACK UP NOW" }));
    await waitFor(() => expect(call).toHaveBeenCalledWith("backup_to_google_drive"));

    fireEvent.click(screen.getByRole("button", { name: /START S3 GATEWAY/i }));
    await waitFor(() => expect(call).toHaveBeenCalledWith("start_s3_gateway"));
  });
});
