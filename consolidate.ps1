# BioDegen consolidation workflow.
# Exports data from MongoDB, runs stats, rebuilds figures, and shows the report.
#
# Usage:
#   .\consolidate.ps1                         # uses timing_test collection
#   .\consolidate.ps1 -Collection my_batch    # explicit collection

param(
    [string]$Collection = "timing_test",
    [string]$DataDir    = "$PSScriptRoot\data"
)

$ErrorActionPreference = "Stop"
$runner = $PSScriptRoot

function Header($msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

# 1. Export
Header "Export: MongoDB ($Collection) to CSV"
node "$runner\export.js" --collection $Collection
if (-not $?) { Write-Host "Export failed." -ForegroundColor Red; exit 1 }

# 2. Stats
Header "Statistical analysis"
Push-Location $DataDir
python stats_analysis.py biodegen_perrun_all.csv
if (-not $?) { Pop-Location; Write-Host "Stats failed." -ForegroundColor Red; exit 1 }
Pop-Location

# 3. Figures
Header "Publication figures"
Push-Location $DataDir
python paper_figures.py biodegen_perrun_all.csv
if (-not $?) { Pop-Location; Write-Host "Figures failed." -ForegroundColor Red; exit 1 }
Pop-Location

# 4. Report
Header "Stats summary (stats_results.md)"
Write-Host ""
$report = "$DataDir\stats_results.md"
if (Test-Path $report) {
    Get-Content $report
} else {
    Write-Host "(stats_results.md not found -- check stats_analysis.py output)" -ForegroundColor Yellow
}

Header "Figures written"
Get-ChildItem "$DataDir\figs\*.pdf" | ForEach-Object { Write-Host "  $($_.Name)" }

# 5. Copy figures to paper directory
$paperDir = "D:\Chris's Documents\Documents\Latex Papers\Relaxed Selection"
Header "Copying figures to paper directory"
Get-ChildItem "$DataDir\figs\*.pdf" | ForEach-Object {
    Copy-Item $_.FullName -Destination $paperDir -Force
    Write-Host "  copied: $($_.Name)"
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
