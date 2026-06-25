$ports = @(3000, 3001, 3002)
Get-NetTCPConnection -LocalPort $ports -ErrorAction SilentlyContinue |
  Where-Object { $_.OwningProcess -gt 0 } |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
exit 0
