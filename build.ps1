# DSAViz build script
# Inlines every src/ asset into one self-contained DSAViz.html
# Usage:  .\build.ps1        (or)   .\build.ps1 -Watch

param([switch]$Watch)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$template = Join-Path $root "src\index.template.html"
$outFile = Join-Path $root "DSAViz.html"

function Build {
    $html = Get-Content $template -Raw -Encoding UTF8

    # Replace <!--INCLUDE:path--> markers with the file's contents
    $pattern = '<!--INCLUDE:(?<p>[^>]+?)-->'
    $evaluator = {
        param($m)
        $rel = $m.Groups['p'].Value.Trim()
        $full = Join-Path $root ("src\" + $rel)
        if (-not (Test-Path $full)) { throw "Missing include: $rel" }
        Write-Host ("  + " + $rel)
        return (Get-Content $full -Raw -Encoding UTF8)
    }
    $html = [regex]::Replace($html, $pattern, $evaluator)

    # Sanity: no markers left behind
    if ($html -match $pattern) { throw "Unresolved include marker remains" }

    [System.IO.File]::WriteAllText($outFile, $html, (New-Object System.Text.UTF8Encoding($false)))
    $kb = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
    Write-Host ("Built DSAViz.html  (" + $kb + " KB)") -ForegroundColor Green

    # Syntax-check the concatenated bundle. Catches duplicate top-level
    # declarations across files, which are only illegal once merged.
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $js = [regex]::Match($html, '(?s)<script>(.*)</script>').Groups[1].Value
        $tmp = Join-Path $env:TEMP ("dsaviz-check-" + [guid]::NewGuid().ToString("N") + ".js")
        [System.IO.File]::WriteAllText($tmp, $js, (New-Object System.Text.UTF8Encoding($false)))
        $err = & node --check $tmp 2>&1
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
        if ($LASTEXITCODE -ne 0) {
            Write-Host "JS SYNTAX ERROR in the bundle:" -ForegroundColor Red
            Write-Host $err -ForegroundColor Red
            throw "bundle does not parse"
        }
        Write-Host "  bundle parses cleanly" -ForegroundColor DarkGray
    }

    # GitHub Pages serves index.html at the repo root.
    $indexFile = Join-Path $root "index.html"
    [System.IO.File]::WriteAllText($indexFile, $html, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "  index.html written for GitHub Pages" -ForegroundColor DarkGray

    # Artifact variant: same page without the outer html/head/body skeleton,
    # because the Artifact host supplies its own.
    $inner = $html
    $inner = [regex]::Replace($inner, '(?s)^.*?<title>', '<title>')
    $inner = [regex]::Replace($inner, '(?s)</head>\s*<body>', '')
    $inner = [regex]::Replace($inner, '(?s)</body>\s*</html>\s*$', '')
    $artFile = Join-Path $root "DSAViz.artifact.html"
    [System.IO.File]::WriteAllText($artFile, $inner, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ("Built DSAViz.artifact.html  (" +
        [math]::Round((Get-Item $artFile).Length / 1KB, 1) + " KB)") -ForegroundColor DarkGray
}

Build

if ($Watch) {
    Write-Host "Watching src\ for changes. Ctrl+C to stop." -ForegroundColor Cyan
    $fsw = New-Object System.IO.FileSystemWatcher (Join-Path $root "src"), "*.*"
    $fsw.IncludeSubdirectories = $true
    $fsw.EnableRaisingEvents = $true
    while ($true) {
        $r = $fsw.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1000)
        if (-not $r.TimedOut) {
            Start-Sleep -Milliseconds 120
            try { Build } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
        }
    }
}
