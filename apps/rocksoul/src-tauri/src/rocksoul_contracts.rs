use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RocksoulDomain {
    Threshold,
    Archive,
    Studio,
    RiotDeck,
    SignalRoom,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RocksoulPolicyMode {
    Assisted,
    Supervised,
    Autonomous,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RocksoulRisk {
    ReadOnly,
    LocalWrite,
    External,
    Destructive,
    Irreversible,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RocksoulToolAction {
    ReadRepository,
    ReadSelectedPath,
    CreateWorktree,
    WriteWorktree,
    RunDeclaredCheck,
    ReadCredential,
    CommitIsolatedBranch,
    PushOwnerBranch,
    MergeOwnerBranch,
    DeleteData,
    RequestNetwork,
    ExportArtifact,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RocksoulApprovalStatus {
    Pending,
    Granted,
    Denied,
    Expired,
    Revoked,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RocksoulEventEnvelope {
    pub event_id: String,
    pub objective_id: Option<String>,
    pub plan_id: Option<String>,
    pub run_id: Option<String>,
    pub step_id: Option<String>,
    pub artifact_id: Option<String>,
    pub domain: RocksoulDomain,
    pub kind: String,
    pub timestamp: String,
    pub actor: String,
    pub reason: String,
    pub provenance: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RocksoulProviderSpec {
    pub provider_id: String,
    pub version: String,
    pub executable: String,
    pub argv_template: Vec<String>,
    pub cwd_scope: String,
    pub network_allowed: bool,
    pub timeout_ms: u64,
    pub max_output_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RocksoulToolRequest {
    pub action: RocksoulToolAction,
    pub target: String,
    pub arguments: serde_json::Value,
    pub risk: RocksoulRisk,
    pub run_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RocksoulApproval {
    pub approval_id: String,
    pub action: RocksoulToolAction,
    pub target: String,
    pub arguments: serde_json::Value,
    pub risk: RocksoulRisk,
    pub run_id: String,
    pub status: RocksoulApprovalStatus,
    pub expires_at: DateTime<Utc>,
}

pub fn approval_matches(
    approval: &RocksoulApproval,
    request: &RocksoulToolRequest,
    now: DateTime<Utc>,
) -> bool {
    approval.status == RocksoulApprovalStatus::Granted
        && approval.expires_at > now
        && approval.action == request.action
        && approval.target == request.target
        && approval.arguments == request.arguments
        && approval.risk == request.risk
        && approval.run_id == request.run_id.as_deref().unwrap_or_default()
}

pub fn default_policy_allows(action: RocksoulToolAction) -> Option<RocksoulPolicyMode> {
    match action {
        RocksoulToolAction::ReadRepository
        | RocksoulToolAction::ReadSelectedPath
        | RocksoulToolAction::CreateWorktree
        | RocksoulToolAction::RunDeclaredCheck => Some(RocksoulPolicyMode::Supervised),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> RocksoulToolRequest {
        RocksoulToolRequest {
            action: RocksoulToolAction::WriteWorktree,
            target: "Z:\\repo\\sample".into(),
            arguments: serde_json::json!({"relativePath": "src/main.rs", "operation": "replace"}),
            risk: RocksoulRisk::LocalWrite,
            run_id: Some("run-1".into()),
        }
    }

    fn approval() -> RocksoulApproval {
        RocksoulApproval {
            approval_id: "approval-1".into(),
            action: RocksoulToolAction::WriteWorktree,
            target: "Z:\\repo\\sample".into(),
            arguments: serde_json::json!({"relativePath": "src/main.rs", "operation": "replace"}),
            risk: RocksoulRisk::LocalWrite,
            run_id: "run-1".into(),
            status: RocksoulApprovalStatus::Granted,
            expires_at: Utc::now() + chrono::Duration::minutes(5),
        }
    }

    #[test]
    fn approval_matches_exact_request() {
        assert!(approval_matches(&approval(), &request(), Utc::now()));
    }

    #[test]
    fn approval_rejects_changed_arguments_target_or_run() {
        let mut changed = request();
        changed.arguments =
            serde_json::json!({"relativePath": "src/secret.rs", "operation": "replace"});
        assert!(!approval_matches(&approval(), &changed, Utc::now()));

        let mut changed = request();
        changed.target = "Z:\\repo\\other".into();
        assert!(!approval_matches(&approval(), &changed, Utc::now()));

        let mut changed = request();
        changed.run_id = Some("run-2".into());
        assert!(!approval_matches(&approval(), &changed, Utc::now()));
    }

    #[test]
    fn approval_rejects_expiry_revocation_and_denial() {
        let now = Utc::now();
        let mut expired = approval();
        expired.expires_at = now - chrono::Duration::seconds(1);
        assert!(!approval_matches(&expired, &request(), now));

        let mut revoked = approval();
        revoked.status = RocksoulApprovalStatus::Revoked;
        assert!(!approval_matches(&revoked, &request(), now));

        let mut denied = approval();
        denied.status = RocksoulApprovalStatus::Denied;
        assert!(!approval_matches(&denied, &request(), now));
    }

    #[test]
    fn default_policy_is_deny_first() {
        assert_eq!(
            default_policy_allows(RocksoulToolAction::ReadRepository),
            Some(RocksoulPolicyMode::Supervised)
        );
        assert_eq!(
            default_policy_allows(RocksoulToolAction::WriteWorktree),
            None
        );
        assert_eq!(
            default_policy_allows(RocksoulToolAction::PushOwnerBranch),
            None
        );
        assert_eq!(
            default_policy_allows(RocksoulToolAction::RequestNetwork),
            None
        );
    }
}
