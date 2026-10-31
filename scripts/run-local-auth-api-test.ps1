$ErrorActionPreference = "Stop"

function ConvertFrom-SecureStringValue {
  param([Security.SecureString]$Value)

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Import-LocalEnvironment {
  if (-not (Test-Path .\.env.local)) {
    throw "Missing .env.local. Copy .env.example and configure the Supabase public variables first."
  }

  $allowedNames = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  )

  foreach ($line in Get-Content .\.env.local) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $name = $Matches[1]
      if ($allowedNames -notcontains $name) {
        continue
      }
      $value = $Matches[2].Trim()
      if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
      } elseif ($value.Length -ge 2 -and $value.StartsWith("'") -and $value.EndsWith("'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

function Remove-TestEnvironment {
  foreach ($name in @(
    "SUBFLOW_TEST_ADMIN_EMAIL",
    "SUBFLOW_TEST_ADMIN_PASSWORD",
    "SUBFLOW_TEST_CUSTOMER_EMAIL",
    "SUBFLOW_TEST_CUSTOMER_PASSWORD"
  )) {
    Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
  }
}

Import-LocalEnvironment
$env:SUBFLOW_API_BASE_URL = if ($env:SUBFLOW_API_BASE_URL) { $env:SUBFLOW_API_BASE_URL } else { "http://localhost:5000" }

try {
  $env:SUBFLOW_TEST_ADMIN_EMAIL = Read-Host "Admin email"
  $env:SUBFLOW_TEST_ADMIN_PASSWORD = ConvertFrom-SecureStringValue (Read-Host "Admin password" -AsSecureString)

  $customerEmail = Read-Host "Customer email (press Enter to skip customer tests)"
  if ($customerEmail) {
    $env:SUBFLOW_TEST_CUSTOMER_EMAIL = $customerEmail
    $env:SUBFLOW_TEST_CUSTOMER_PASSWORD = ConvertFrom-SecureStringValue (Read-Host "Customer password" -AsSecureString)
  }

  node .\scripts\local-auth-api-test.mjs
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Remove-TestEnvironment
  Remove-Item Env:SUBFLOW_API_BASE_URL -ErrorAction SilentlyContinue
}
