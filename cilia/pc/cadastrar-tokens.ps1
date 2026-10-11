# Cadastrar (ou trocar) os tokens da API do Cilia neste PC.
# Cada token fica criptografado pelo Windows (DPAPI, só este usuário neste computador consegue abrir).
# Ninguém mais vê: nem o Claude, nem o GitHub, nem o Google.
$ErrorActionPreference = 'Stop'
$pasta = Join-Path $env:USERPROFILE 'UnityCilia\tokens'
New-Item -ItemType Directory -Force $pasta | Out-Null
$casas = [ordered]@{
  TOLEDO   = 'Toledo   (CNPJ 43.473.287/0001-80)'
  CASCAVEL = 'Cascavel (CNPJ 43.473.287/0003-41)'
  MOURAO   = 'Mourao   (CNPJ 43.473.287/0002-60)'
  RONDON   = 'Rondon   (CNPJ 48.777.901/0001-10)'
}
Write-Host ''
Write-Host 'Cadastro dos tokens da API do Cilia' -ForegroundColor Cyan
Write-Host 'Cole o token de cada casa e aperte Enter. Para pular uma casa, so aperte Enter.'
Write-Host ''
foreach ($c in $casas.Keys) {
  $seguro = Read-Host -AsSecureString ("Token " + $casas[$c])
  if ($seguro.Length -eq 0) { Write-Host "  (pulado: $c)" -ForegroundColor DarkGray; continue }
  $seguro | ConvertFrom-SecureString | Set-Content -Path (Join-Path $pasta "$c.dat") -Encoding ASCII
  Write-Host "  ok: $c guardado" -ForegroundColor Green
}
Write-Host ''
Write-Host 'Pronto. Testando agora a consulta...' -ForegroundColor Cyan
& (Join-Path $env:USERPROFILE 'UnityCilia\rodar.ps1')
Write-Host ''
Read-Host 'Aperte Enter para fechar'
