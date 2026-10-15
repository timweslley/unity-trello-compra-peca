# Rodada diária do Cilia (chamada pela tarefa agendada "Unity - Cilia 00h15" ou pelo cadastro de tokens).
# Abre os tokens do cofre do Windows só para esta execução e roda o programa. Nunca imprime token.
param([string]$Casas = '')
$ErrorActionPreference = 'Stop'
$base = Join-Path $env:USERPROFILE 'UnityCilia'
$log  = Join-Path $base 'ultima-rodada.log'
foreach ($c in 'TOLEDO','CASCAVEL','RONDON','MOURAO') {
  $arq = Join-Path $base "tokens\$c.dat"
  if (Test-Path $arq) {
    $s = Get-Content $arq | ConvertTo-SecureString
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
    try { Set-Item -Path "Env:CILIA_TOKEN_$c" -Value ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
  }
}
# 15/10/2026 (Weslley): a pasta Cilia virou Rotina Unity\Orcamentos\Cilia ([char]0x00E7 = c-cedilha, sem depender da codificacao deste arquivo)
$env:CILIA_SAIDA = 'G:\Meu Drive\Arquivos de IA\Claude\Rotina Unity\Or' + [char]0x00E7 + 'amentos\Cilia'
if ($Casas) { $env:CASAS = $Casas }
$inicio = Get-Date
$saida = & node (Join-Path $base 'pc\sincronizar-pc.mjs') 2>&1 | Out-String
$codigo = $LASTEXITCODE
foreach ($c in 'TOLEDO','CASCAVEL','RONDON','MOURAO') { Remove-Item "Env:CILIA_TOKEN_$c" -ErrorAction SilentlyContinue }
$texto = "[$($inicio.ToString('yyyy-MM-dd HH:mm'))] codigo $codigo`r`n$saida"
Set-Content -Path $log -Value $texto -Encoding UTF8
Write-Host $saida
exit $codigo
