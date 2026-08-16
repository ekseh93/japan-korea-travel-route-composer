param(
  [string]$Repo = "ekseh93/japan-korea-travel-route-composer"
)

$ErrorActionPreference = "Stop"

function Assert-GhSuccess([string]$Message) {
  if ($LASTEXITCODE -ne 0) {
    throw $Message
  }
}

gh auth status | Out-Host
Assert-GhSuccess "GitHub CLI authentication check failed."

$budgetEmail = Read-Host "Approved Budget notification email"
if ($budgetEmail -notmatch '^[^@]+@[^@]+\.[^@]+$') {
  throw "Budget email format is invalid."
}

$monthlyBudgetUsd = Read-Host "Approved monthly budget in whole USD (1-100)"
if ($monthlyBudgetUsd -notmatch '^([1-9][0-9]?|100)$') {
  throw "Monthly budget must be an approved integer from 1 to 100."
}

$artifactKey = Read-Host "Immutable Lambda artifact key (40-char SHA/lambda.zip)"
if ($artifactKey -notmatch '^[0-9a-f]{40}/lambda\.zip$') {
  throw "Lambda artifact key format is invalid."
}

$sourceCodeHash = Read-Host "Immutable Lambda Base64 SHA-256"
if ($sourceCodeHash -notmatch '^[A-Za-z0-9+/]{43}=$') {
  throw "Lambda source code hash must be a Base64 SHA-256 digest."
}

# Pipe the secret through stdin so it is not included in the gh command line.
$budgetEmail | gh secret set BUDGET_EMAIL --repo $Repo
Assert-GhSuccess "Failed to set BUDGET_EMAIL."
gh variable set MONTHLY_BUDGET_USD --repo $Repo --body $monthlyBudgetUsd
Assert-GhSuccess "Failed to set MONTHLY_BUDGET_USD."
gh variable set LAMBDA_ARTIFACT_KEY --repo $Repo --body $artifactKey
Assert-GhSuccess "Failed to set LAMBDA_ARTIFACT_KEY."
gh variable set LAMBDA_SOURCE_CODE_HASH --repo $Repo --body $sourceCodeHash
Assert-GhSuccess "Failed to set LAMBDA_SOURCE_CODE_HASH."

Write-Host "GitHub input names configured. Values are intentionally not printed."
gh secret list --repo $Repo
gh variable list --repo $Repo
