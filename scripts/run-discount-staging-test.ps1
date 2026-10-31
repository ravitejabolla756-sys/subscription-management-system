$ErrorActionPreference = "Stop"

function ConvertFrom-SecureValue {
  param([Security.SecureString]$Value)
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Read-PublicEnvironment {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { throw "Missing staging environment file: $Path" }
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)\s*=\s*(.*)\s*$') {
      $value = $Matches[2].Trim().Trim('"').Trim("'")
      $values[$Matches[1]] = $value
    }
  }
  if (-not $values.NEXT_PUBLIC_SUPABASE_URL -or -not $values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw "Staging environment must define the two public Supabase variables"
  }
  return $values
}

$stagingFile = if ($env:SUBFLOW_STAGING_ENV_FILE) { $env:SUBFLOW_STAGING_ENV_FILE } else { ".\.env.staging.local" }
$staging = Read-PublicEnvironment $stagingFile
$productionUrl = $null
if (Test-Path -LiteralPath ".\.env.local") {
  $production = Read-PublicEnvironment ".\.env.local"
  $productionUrl = $production.NEXT_PUBLIC_SUPABASE_URL
}
if ($productionUrl -and $productionUrl -eq $staging.NEXT_PUBLIC_SUPABASE_URL) {
  throw "Refusing to run: staging Supabase URL matches .env.local"
}

if (-not $env:SUBFLOW_API_BASE_URL) { $env:SUBFLOW_API_BASE_URL = "http://localhost:5001" }
if ($env:SUBFLOW_API_BASE_URL -eq "http://localhost:5000") {
  throw "Refusing to run against localhost:5000; use a separate staging Next.js server on port 5001+"
}

Write-Host "WARNING: this creates persistent demo records in the separate staging project and exercises billing."
$confirmation = Read-Host "Type RUN to authorize staging writes, or press Enter to cancel"
if ($confirmation -ne "RUN") { Write-Host "Cancelled"; exit 0 }

try {
  Set-Item "Env:NEXT_PUBLIC_SUPABASE_URL" $staging.NEXT_PUBLIC_SUPABASE_URL
  Set-Item "Env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" $staging.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  $env:SUBFLOW_DISCOUNT_CONFIRM = "RUN"
  $env:SUBFLOW_TEST_ADMIN_EMAIL = Read-Host "Admin email"
  $env:SUBFLOW_TEST_ADMIN_PASSWORD = ConvertFrom-SecureValue (Read-Host "Admin password" -AsSecureString)
  $env:SUBFLOW_TEST_STAFF_EMAIL = Read-Host "Staff email (Enter to skip staff tests)"
  if ($env:SUBFLOW_TEST_STAFF_EMAIL) {
    $env:SUBFLOW_TEST_STAFF_PASSWORD = ConvertFrom-SecureValue (Read-Host "Staff password" -AsSecureString)
  }
  $env:SUBFLOW_TEST_CUSTOMER_EMAIL = Read-Host "Customer email (Enter to skip customer tests)"
  if ($env:SUBFLOW_TEST_CUSTOMER_EMAIL) {
    $env:SUBFLOW_TEST_CUSTOMER_PASSWORD = ConvertFrom-SecureValue (Read-Host "Customer password" -AsSecureString)
  }
  node .\scripts\local-discount-staging-test.mjs
  if ($LASTEXITCODE -ne 0) { throw "Discount staging test failed with exit code $LASTEXITCODE" }
} finally {
  foreach ($name in @(
    "SUBFLOW_DISCOUNT_CONFIRM", "SUBFLOW_API_BASE_URL", "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUBFLOW_TEST_ADMIN_EMAIL",
    "SUBFLOW_TEST_ADMIN_PASSWORD", "SUBFLOW_TEST_STAFF_EMAIL",
    "SUBFLOW_TEST_STAFF_PASSWORD", "SUBFLOW_TEST_CUSTOMER_EMAIL",
    "SUBFLOW_TEST_CUSTOMER_PASSWORD"
  )) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
}
