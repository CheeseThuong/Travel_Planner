# Vietnam Playful Travel Planner - Phase 0 / Phase 1 local audit bootstrap.
# Run in Windows PowerShell 5.1+ from any current directory.
# DOES NOT delete/reset/commit/push any files, modify Supabase or print .env values.
[CmdletBinding()]
param(
    [string]$Workspace = 'D:\Projects\travel_plan',
    [string]$Branch = 'fix/audit-and-upgrade',
    [switch]$SkipSkills,
    [switch]$SkipInstall,
    [switch]$SkipBrowserTests
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not (Test-Path -LiteralPath $Workspace -PathType Container)) { throw "Workspace not found: $Workspace" }
Set-Location -LiteralPath $Workspace
if (-not (Test-Path -LiteralPath '.git')) { throw 'Not a Git repository root' }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
# Evidence OUTSIDE repository so logs, browser reports and stdout are not accidentally staged.
$evidence = Join-Path (Split-Path -Parent $Workspace) ("travel_plan_audit_evidence_" + $stamp)
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
Write-Host "Evidence directory: $evidence"

git status --porcelain=v1 --untracked-files=normal | Out-File -FilePath (Join-Path $evidence 'git-before.txt') -Encoding utf8
git branch --show-current | Out-File -FilePath (Join-Path $evidence 'branch-before.txt') -Encoding utf8
$conflicts = @(git diff --name-only --diff-filter=U)
if ($conflicts.Count -gt 0) { throw ('Unresolved merge conflicts: ' + ($conflicts -join ', ')) }
$current = (git branch --show-current).Trim()
if ($current -ne $Branch) {
    # A local branch changes only HEAD, preserving current uncommitted changes.
    git show-ref --verify --quiet ("refs/heads/" + $Branch)
    if ($LASTEXITCODE -eq 0) {
        git switch $Branch
    } else {
        git switch -c $Branch
    }
    if ($LASTEXITCODE -ne 0) { throw 'Could not safely check out new audit branch; nothing was reset.' }
}

$ignorePath = Join-Path $Workspace '.gitignore'
if (-not (Test-Path -LiteralPath $ignorePath)) { throw '.gitignore missing' }
$ignoreText = Get-Content -LiteralPath $ignorePath -Raw
if ($ignoreText -notmatch '(?m)^\.agent-skills/\s*$') {
    Add-Content -LiteralPath $ignorePath -Value '.agent-skills/' -Encoding UTF8
}

if (-not $SkipSkills) {
    New-Item -ItemType Directory -Path '.agent-skills' -Force | Out-Null
    $sources = @(
        @('scroll-world','https://github.com/oso95/scroll-world.git'),
        @('threejs-skills','https://github.com/CloudAI-X/threejs-skills.git'),
        @('gsap-skills','https://github.com/greensock/gsap-skills.git')
    )
    foreach ($source in $sources) {
        $destination = Join-Path '.agent-skills' $source[0]
        if (-not (Test-Path -LiteralPath $destination)) {
            & git clone --depth 1 $source[1] $destination
            if ($LASTEXITCODE -ne 0) { Write-Warning "Clone failed: $($source[0])" }
        }
    }
    $skillReport = Join-Path $evidence 'skill-files.txt'
    Get-ChildItem -LiteralPath '.agent-skills' -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq 'README.md' -or $_.Name -eq 'SKILL.md' } |
        Select-Object -ExpandProperty FullName | Out-File -FilePath $skillReport -Encoding utf8
    Write-Host "Review README.md and relevant SKILL.md files listed in $skillReport"
}

$results = New-Object System.Collections.Generic.List[object]
function Invoke-Gate([string]$Name, [string]$Arguments) {
    $out = Join-Path $evidence ("$Name.stdout.log")
    $err = Join-Path $evidence ("$Name.stderr.log")
    Write-Host "RUN: npm.cmd $Arguments"
    try {
        $process = Start-Process -FilePath 'npm.cmd' -ArgumentList $Arguments -WorkingDirectory $Workspace -NoNewWindow -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
        $exitCode = $process.ExitCode
    } catch {
        $exitCode = -1
        $_.Exception.Message | Out-File -FilePath $err -Encoding utf8
    }
    $results.Add([pscustomobject]@{Gate=$Name;Command="npm.cmd $Arguments";ExitCode=$exitCode;Stdout=$out;Stderr=$err})
    Write-Host "$Name => exit $exitCode"
    return $exitCode
}

$env:NEXT_TELEMETRY_DISABLED = '1'
# Unique reporter names avoid overwriting historical evidence checked into the repository.
$env:DEMO_EVIDENCE_PREFIX = "AUDIT-${stamp}-demo"
$env:TYPOGRAPHY_EVIDENCE_PREFIX = "AUDIT-${stamp}-typography"
if (-not $SkipInstall) { [void](Invoke-Gate 'install' 'ci --strict-peer-deps') }
[void](Invoke-Gate 'lint' 'run lint')
[void](Invoke-Gate 'typecheck' 'run typecheck')
[void](Invoke-Gate 'test-unit' 'run test:unit')
[void](Invoke-Gate 'test-integration' 'run test:integration')
[void](Invoke-Gate 'build' 'run build')
if (-not $SkipBrowserTests) {
    # Playwright config starts a production server from the build. Missing Chrome shows up as FAIL, not a fake pass.
    [void](Invoke-Gate 'test-e2e' 'run test:e2e')
    [void](Invoke-Gate 'test-typography' 'run test:typography')
}
# Preserve newly generated browser JSON outside the repo. Never delete previous evidence.
foreach ($prefix in @($env:DEMO_EVIDENCE_PREFIX, $env:TYPOGRAPHY_EVIDENCE_PREFIX)) {
    $browserJson = Join-Path $Workspace ("docs/reports/evidence/$prefix-browser-results.json")
    if (Test-Path -LiteralPath $browserJson) {
        Move-Item -LiteralPath $browserJson -Destination (Join-Path $evidence ("$prefix-browser-results.json"))
    }
}
$results | Export-Csv -Path (Join-Path $evidence 'gate-summary.csv') -NoTypeInformation -Encoding UTF8
& git status --short | Out-File -FilePath (Join-Path $evidence 'git-after.txt') -Encoding utf8
Write-Host "Completed audit command collection. Evidence: $evidence"
Write-Host "NO COMMIT OR PUSH performed. Review failures and package.json/package-lock.json modifications before staging."
