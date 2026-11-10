# Script: tong_hop.ps1
# Tac gia: Phạm Ngọc Linh
# Ngay tao: 2026-11-05
$ErrorActionPreference = 'Stop'
echo 'Dang tao bao cao...'
'=== BAO CAO GREENFIELD FC ===' | Set-Content .\logs\tong_hop.txt -Encoding UTF8
Get-Content .\logs\access.log | Select-String '(^|\s)status=404(?=\s|$)' | ForEach-Object { $_.Line } | Add-Content .\logs\tong_hop.txt -Encoding UTF8
(Get-Content .\logs\access.log | Select-String '(^|\s)status=500(?=\s|$)' | Measure-Object).Count | Add-Content .\logs\tong_hop.txt -Encoding UTF8
