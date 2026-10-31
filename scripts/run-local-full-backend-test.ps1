$ErrorActionPreference = "Stop"

function ConvertFrom-SecureValue {
  param([Security.SecureString]$Value)
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

if (-not (Test-Path .\.env.local)) { throw "Missing .env.local" }
foreach ($line in Get-Content .\.env.local) {
  if ($line -match '^\s*(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)\s*=\s*(.*)\s*$') {
    $value = $Matches[2].Trim().Trim('"').Trim("'")
    Set-Item "Env:$($Matches[1])" $value
  }
}

Write-Host "WARNING: This creates permanent E2E DEMO rows and runs billing on ALL due subscriptions."
Write-Host "The JavaScript preflight aborts when existing due subscriptions are detected."
$answer = Read-Host "Type RUN to authorize the test data writes, or Enter to cancel"
if ($answer -ne "RUN") { Write-Host "Cancelled"; exit 0 }

try {
  $env:SUBFLOW_E2E_CONFIRM = "RUN"
  $env:SUBFLOW_API_BASE_URL = if ($env:SUBFLOW_API_BASE_URL) { $env:SUBFLOW_API_BASE_URL } else { "http://localhost:5000" }
  $env:SUBFLOW_TEST_ADMIN_EMAIL = Read-Host "Admin email"
  $env:SUBFLOW_TEST_ADMIN_PASSWORD = ConvertFrom-SecureValue (Read-Host "New Admin password" -AsSecureString)
  $env:SUBFLOW_TEST_CUSTOMER_EMAIL = Read-Host "Customer email (Enter to skip customer tests)"
  if ($env:SUBFLOW_TEST_CUSTOMER_EMAIL) {
    $env:SUBFLOW_TEST_CUSTOMER_PASSWORD = ConvertFrom-SecureValue (Read-Host "Customer password" -AsSecureString)
  }
  node .\scripts\local-full-backend-test.mjs
  if ($LASTEXITCODE -ne 0) { throw "Live backend test failed with exit code $LASTEXITCODE" }
} finally {
  foreach ($name in @(
    "SUBFLOW_E2E_CONFIRM", "SUBFLOW_API_BASE_URL", "SUBFLOW_TEST_ADMIN_EMAIL", "SUBFLOW_TEST_ADMIN_PASSWORD",
    "SUBFLOW_TEST_CUSTOMER_EMAIL", "SUBFLOW_TEST_CUSTOMER_PASSWORD"
  )) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
}
