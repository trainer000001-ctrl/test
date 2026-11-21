import { useEffect, useState } from "react";
import { Cloud, Database, Server, ShieldCheck, X } from "@moonwitness/ui/icons";
import { call } from "../lib";
import type { CloudBackupStatus, S3GatewayStatus } from "../lib/contracts";

export interface SettingsDialogProps {
  onClose: () => void;
}

export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const [backupStatus, setBackupStatus] = useState<CloudBackupStatus | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<S3GatewayStatus | null>(null);
  const [gatewayBusy, setGatewayBusy] = useState(false);

  useEffect(() => {
    let active = true;
    call("cloud_backup_status").then(
      (status) => {
        if (active) setBackupStatus(status);
      },
      (error) => {
        if (active) {
          setBackupStatus({
            available: false,
            connected: false,
            account: null,
            lastBackupAt: null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
    call("s3_gateway_status").then(
      (status) => {
        if (active) setGatewayStatus(status);
      },
      () => {
        if (active) {
          setGatewayStatus({
            running: false,
            endpoint: null,
            bucket: "rocksoul",
            access_key: null,
            secret_key: null,
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  async function connectDrive() {
    setBackupBusy(true);
    try {
      setBackupStatus(await call("connect_google_drive"));
    } catch (error) {
      setBackupStatus((previous) => ({
        available: previous?.available ?? false,
        connected: previous?.connected ?? false,
        account: previous?.account ?? null,
        lastBackupAt: previous?.lastBackupAt ?? null,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setBackupBusy(false);
    }
  }

  async function disconnectDrive() {
    setBackupBusy(true);
    try {
      setBackupStatus(await call("disconnect_google_drive"));
    } catch (error) {
      setBackupStatus((previous) => ({
        available: previous?.available ?? false,
        connected: previous?.connected ?? false,
        account: previous?.account ?? null,
        lastBackupAt: previous?.lastBackupAt ?? null,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setBackupBusy(false);
    }
  }

  async function backUpNow() {
    setBackupBusy(true);
    try {
      setBackupStatus(await call("backup_to_google_drive"));
    } catch (error) {
      setBackupStatus((previous) => ({
        available: previous?.available ?? false,
        connected: previous?.connected ?? false,
        account: previous?.account ?? null,
        lastBackupAt: previous?.lastBackupAt ?? null,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setBackupBusy(false);
    }
  }

  async function restoreBackup() {
    if (
      !window.confirm(
        "Restore local database from encrypted Google Drive backup? Current local data will be replaced.",
      )
    ) {
      return;
    }
    setBackupBusy(true);
    try {
      setBackupStatus(await call("restore_from_google_drive"));
      window.location.reload();
    } catch (error) {
      setBackupStatus((previous) => ({
        available: previous?.available ?? false,
        connected: previous?.connected ?? false,
        account: previous?.account ?? null,
        lastBackupAt: previous?.lastBackupAt ?? null,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setBackupBusy(false);
    }
  }

  async function toggleS3Gateway() {
    setGatewayBusy(true);
    try {
      setGatewayStatus(await call(gatewayStatus?.running ? "stop_s3_gateway" : "start_s3_gateway"));
    } finally {
      setGatewayBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="settings-dialog">
        <header className="dialog-head">
          <div>
            <span className="eyebrow">SYSTEM / LOCAL CONFIGURATION</span>
            <h2>RIOT SWITCHBOARD</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings">
            <X />
          </button>
        </header>
        <div className="settings-status">
          <span className="local-pill">
            <i /> LOCAL DATABASE ACTIVE
          </span>
          <span className="micro-label">
            {backupStatus?.connected ? "GOOGLE DRIVE BACKUP CONNECTED" : "CLOUD BACKUP OPTIONAL"}
          </span>
        </div>
        <div className="settings-section">
          <h3>
            <Database size={16} /> DATA & STORAGE
          </h3>
          <div className="settings-row">
            <span>Operational database</span>
            <b>SQLite / WAL</b>
          </div>
          <div className="settings-row">
            <span>Storage location</span>
            <b>OS APPLICATION DATA</b>
          </div>
          <div className="settings-row">
            <span>Repository state</span>
            <b>LOCAL CHECKOUTS</b>
          </div>
        </div>
        <div className="settings-section">
          <h3>
            <Cloud size={16} /> GOOGLE DRIVE BACKUP
          </h3>
          <p className="storage-description">
            Encrypted backup of your local database. Google Drive is backup storage only; your app continues to work
            locally.
          </p>
          <div className="settings-row">
            <span>Connection</span>
            <b>
              {backupStatus?.connected
                ? backupStatus.account || "CONNECTED"
                : backupStatus?.available === false
                  ? "NOT CONFIGURED"
                  : "DISCONNECTED"}
            </b>
          </div>
          <div className="settings-row">
            <span>Last backup</span>
            <b>{backupStatus?.lastBackupAt ? new Date(backupStatus.lastBackupAt).toLocaleString() : "NEVER"}</b>
          </div>
          {backupStatus?.error && (
            <p className="storage-error" role="alert">
              {backupStatus.error}
            </p>
          )}
          <div className="storage-actions">
            {backupStatus?.connected ? (
              <>
                <button className="outline-button" disabled={backupBusy} onClick={backUpNow}>
                  {backupBusy ? "BACKING UP…" : "BACK UP NOW"}
                </button>
                <button className="outline-button" disabled={backupBusy} onClick={restoreBackup}>
                  RESTORE BACKUP
                </button>
                <button className="outline-button" disabled={backupBusy} onClick={disconnectDrive}>
                  DISCONNECT
                </button>
              </>
            ) : (
              <button
                className="outline-button"
                disabled={backupBusy || backupStatus?.available === false}
                onClick={connectDrive}
              >
                {backupBusy ? "CONNECTING…" : "CONNECT GOOGLE DRIVE"}
              </button>
            )}
          </div>
        </div>
        <div className="settings-section">
          <h3>
            <Server size={16} /> S3-COMPATIBLE LOCAL GATEWAY
          </h3>
          <p className="storage-description">
            Local S3 object API backed by your private Google Drive app-data area. The listener binds to loopback only;
            use this same-machine endpoint with basic S3 tools.
          </p>
          <div className="settings-row">
            <span>Gateway</span>
            <b>{gatewayStatus?.running ? "RUNNING / LOOPBACK ONLY" : "STOPPED"}</b>
          </div>
          {gatewayStatus?.running && (
            <div className="settings-row">
              <span>Endpoint</span>
              <b>{gatewayStatus.endpoint}</b>
            </div>
          )}
          <div className="settings-row">
            <span>Bucket</span>
            <b>{gatewayStatus?.bucket || "rocksoul"}</b>
          </div>
          {gatewayStatus?.running && (
            <>
              <div className="settings-row">
                <span>Access key</span>
                <b>{gatewayStatus.access_key}</b>
              </div>
              <div className="settings-row">
                <span>Secret key</span>
                <b>{gatewayStatus.secret_key}</b>
              </div>
            </>
          )}
          {gatewayStatus?.running && backupStatus?.connected === false && (
            <p className="storage-error" role="alert">
              Connect Google Drive before writing or reading objects.
            </p>
          )}
          <div className="storage-actions">
            <button className="outline-button" disabled={gatewayBusy} onClick={toggleS3Gateway}>
              {gatewayBusy ? "UPDATING…" : gatewayStatus?.running ? "STOP S3 GATEWAY" : "START S3 GATEWAY"}
            </button>
          </div>
        </div>
        <div className="settings-note">
          <ShieldCheck size={17} />
          <span>
            Git write operations are local, explicitly confirmed, and limited to the controls shown in the Git
            workspace.
          </span>
        </div>
        <footer>
          <span>ROCKSOUL - DX / 0.1.0</span>
          <span>YOUR MACHINE / YOUR RULES</span>
        </footer>
      </section>
    </div>
  );
}
