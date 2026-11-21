$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$workspaceRoot = Resolve-Path (Join-Path $projectRoot "..\..")
$lockfileDir = if (Test-Path (Join-Path $projectRoot "pnpm-lock.yaml")) { $projectRoot } elseif (Test-Path (Join-Path $workspaceRoot "pnpm-lock.yaml")) { $workspaceRoot } else { $projectRoot }
Push-Location $projectRoot

try {
    $checks = @(
        @{ Name = "Frozen dependency install"; Command = "pnpm.cmd"; Arguments = @("install", "--frozen-lockfile"); WorkingDirectory = $lockfileDir },
        @{ Name = "Dependency security audit"; Command = "pnpm.cmd"; Arguments = @("audit", "--prod", "--audit-level", "high"); WorkingDirectory = $lockfileDir },
        @{ Name = "Project configuration validation"; Command = "pnpm.cmd"; Arguments = @("check:config") },
        @{ Name = "Frontend dependency boundaries"; Command = "pnpm.cmd"; Arguments = @("check:boundaries") },
        @{ Name = "Native command contract parity"; Command = "pnpm.cmd"; Arguments = @("check:commands") },
        @{ Name = "Frontend lint"; Command = "pnpm.cmd"; Arguments = @("lint") },
        @{ Name = "Frontend TypeScript typecheck"; Command = "pnpm.cmd"; Arguments = @("typecheck") },
        @{ Name = "Frontend tests and coverage"; Command = "pnpm.cmd"; Arguments = @("test:coverage") },
        @{ Name = "Frontend production build"; Command = "pnpm.cmd"; Arguments = @("build") },
        @{ Name = "Rust formatting"; Command = "cargo"; Arguments = @("fmt", "--manifest-path", "src-tauri/Cargo.toml", "--", "--check", "--style-edition", "2021") },
        @{ Name = "Rust tests"; Command = "cargo"; Arguments = @("test", "--manifest-path", "src-tauri/Cargo.toml", "--locked") },
        @{ Name = "Rust check"; Command = "cargo"; Arguments = @("check", "--manifest-path", "src-tauri/Cargo.toml", "--locked") },
        @{ Name = "Rust Clippy"; Command = "cargo"; Arguments = @("clippy", "--manifest-path", "src-tauri/Cargo.toml", "--locked", "--all-targets", "--all-features", "--", "-D", "warnings") },
        @{ Name = "Patch whitespace"; Command = "git"; Arguments = @("diff", "--check") }
    )

    foreach ($check in $checks) {
        Write-Host "`n=== $($check.Name) ===" -ForegroundColor Cyan
        $pushedCheckDir = $false
        if ($check.ContainsKey("WorkingDirectory") -and $check.WorkingDirectory) {
            Push-Location $check.WorkingDirectory
            $pushedCheckDir = $true
        }
        try {
            & $check.Command @($check.Arguments)
            if ($LASTEXITCODE -ne 0) {
                throw "$($check.Name) failed with exit code $LASTEXITCODE."
            }
        }
        finally {
            if ($pushedCheckDir) {
                Pop-Location
            }
        }
    }

    Write-Host "`nALL LOCAL QUALITY GATES PASSED." -ForegroundColor Green
    Write-Host "Frontend coverage report: coverage/index.html" -ForegroundColor Green
}
catch {
    Write-Error $_
    exit 1
}
finally {
    Pop-Location
}
