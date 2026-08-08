<#
  publish.ps1 — one-time setup to put DSAViz on GitHub Pages.

  Run it from this folder:      .\publish.ps1
  Safe to re-run: every step checks its own state first, so if something
  fails halfway you can just run it again.

  It will:
    1. check the GitHub CLI is installed and you are logged in
    2. rebuild the page so index.html matches src/
    3. create the public repo (if it does not exist yet) and push
    4. turn on GitHub Pages (main branch, root)
    5. wait until the site actually answers, then print the URL
#>

param(
    [string]$RepoName = 'dsa-visualizer',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Ok($msg)       { Write-Host "    $msg" -ForegroundColor Green }
function Info($msg)     { Write-Host "    $msg" -ForegroundColor DarkGray }
function Die($msg)      { Write-Host "`n$msg`n" -ForegroundColor Red; exit 1 }

# ── 1. tools + auth ────────────────────────────────────────────────────
Step 1 'Checking the GitHub CLI'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Die "The GitHub CLI is not installed. Get it from https://cli.github.com/ then run this again."
}

gh auth status *>$null
if ($LASTEXITCODE -ne 0) {
    Info 'Not logged in. Starting the login flow.'
    Info 'Choose: GitHub.com  ->  HTTPS  ->  Yes (authenticate Git)  ->  Login with a web browser'
    Info 'Copy the one-time code shown, press Enter, and paste it in the browser.'
    Write-Host ''
    gh auth login
    if ($LASTEXITCODE -ne 0) { Die 'Login did not complete. Run .\publish.ps1 again when ready.' }
}

$user = (gh api user --jq .login 2>$null)
if (-not $user) { Die 'Logged in, but could not read your GitHub username. Try: gh auth refresh' }
Ok "Signed in as $user"

# ── 2. build ───────────────────────────────────────────────────────────
Step 2 'Rebuilding the page'
if ($SkipBuild) {
    Info 'Skipped (-SkipBuild).'
} else {
    & (Join-Path $PSScriptRoot 'build.ps1') | Out-Null
    if ($LASTEXITCODE -ne 0) { Die 'The build failed. Fix that first, then run this again.' }
    Ok 'index.html is up to date with src/'
}

if (-not (Test-Path 'index.html')) { Die 'index.html is missing — the build did not produce it.' }

# ── 3. commit anything outstanding ─────────────────────────────────────
Step 3 'Checking for uncommitted changes'
$dirty = git status --porcelain
if ($dirty) {
    Info 'Committing the current working tree.'
    git add -A
    git commit -q -m 'Rebuild page for publishing'
    Ok 'Committed.'
} else {
    Ok 'Working tree is clean.'
}

# ── 4. repo ────────────────────────────────────────────────────────────
Step 4 "Creating $user/$RepoName"
$exists = $false
gh repo view "$user/$RepoName" *>$null
if ($LASTEXITCODE -eq 0) { $exists = $true }

if ($exists) {
    Info 'Repo already exists — pushing to it instead.'
    if (-not (git remote | Select-String -Quiet '^origin$')) {
        git remote add origin "https://github.com/$user/$RepoName.git"
    }
    git push -u origin main
    if ($LASTEXITCODE -ne 0) { Die 'Push failed. If the remote has commits you do not, run: git pull --rebase origin main' }
} else {
    gh repo create $RepoName --public --source=. --remote=origin --push `
        --description 'Learn DSA by watching algorithms run. Animated visualizations with synced flowcharts, side-by-side Python and Java, an in-browser Python runner, and a roadmap with 145 LeetCode problems.'
    if ($LASTEXITCODE -ne 0) { Die 'Could not create the repository.' }
}
Ok "Pushed to https://github.com/$user/$RepoName"

# ── 5. pages ───────────────────────────────────────────────────────────
Step 5 'Turning on GitHub Pages'
$pagesUrl = "https://$user.github.io/$RepoName/"

gh api "repos/$user/$RepoName/pages" *>$null
if ($LASTEXITCODE -eq 0) {
    Ok 'Pages was already enabled.'
} else {
    '{"source":{"branch":"main","path":"/"}}' |
        gh api -X POST "repos/$user/$RepoName/pages" --input - *>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    Could not enable Pages from here." -ForegroundColor Yellow
        Write-Host "    Do it in the browser: https://github.com/$user/$RepoName/settings/pages" -ForegroundColor Yellow
        Write-Host "    Source: 'Deploy from a branch'  ->  main  ->  / (root)" -ForegroundColor Yellow
    } else {
        Ok 'Pages enabled (main / root).'
    }
}

# ── 6. topics, homepage ────────────────────────────────────────────────
Step 6 'Setting the repo homepage and topics'
gh repo edit "$user/$RepoName" --homepage $pagesUrl `
    --add-topic dsa --add-topic algorithms --add-topic data-structures `
    --add-topic visualization --add-topic leetcode --add-topic education `
    --add-topic interview-preparation *>$null
if ($LASTEXITCODE -eq 0) { Ok 'Done.' } else { Info 'Skipped (not critical).' }

# ── 7. wait for the site ───────────────────────────────────────────────
Step 7 'Waiting for the first build (usually under a minute)'
$live = $false
foreach ($i in 1..30) {
    Start-Sleep -Seconds 10
    try {
        $r = Invoke-WebRequest -Uri $pagesUrl -Method Head -TimeoutSec 10 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $live = $true; break }
    } catch { }
    Write-Host "    still building... ($($i * 10)s)" -ForegroundColor DarkGray
}

Write-Host ''
if ($live) {
    Write-Host "  LIVE  $pagesUrl" -ForegroundColor Green
    Write-Host "  code  https://github.com/$user/$RepoName" -ForegroundColor Green
    try { Start-Process $pagesUrl } catch { }
} else {
    Write-Host "  Pushed successfully, but the site has not answered yet." -ForegroundColor Yellow
    Write-Host "  First builds can take a few minutes. Check:" -ForegroundColor Yellow
    Write-Host "    $pagesUrl" -ForegroundColor Yellow
    Write-Host "    https://github.com/$user/$RepoName/actions" -ForegroundColor Yellow
}
Write-Host ''
Write-Host "  From now on, publishing an update is just:" -ForegroundColor DarkGray
Write-Host "    .\build.ps1; git add -A; git commit -m 'your message'; git push" -ForegroundColor DarkGray
Write-Host ''
