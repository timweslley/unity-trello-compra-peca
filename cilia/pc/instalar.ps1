# Instala/atualiza o módulo Cilia neste PC: baixa os arquivos do GitHub, cria a tarefa agendada diária (00:15)
# e o atalho "Cadastrar tokens Cilia" na Área de Trabalho. Pode rodar de novo para atualizar.
$ErrorActionPreference = 'Stop'
$base = Join-Path $env:USERPROFILE 'UnityCilia'
$raw  = 'https://raw.githubusercontent.com/timweslley/unity-trello-compra-peca/main/cilia'
New-Item -ItemType Directory -Force (Join-Path $base 'pc'), (Join-Path $base 'src'), (Join-Path $base 'tokens') | Out-Null
$arquivos = @{
  'src\cilia.mjs'          = "$raw/src/cilia.mjs"
  'pc\sincronizar-pc.mjs'  = "$raw/pc/sincronizar-pc.mjs"
  'rodar.ps1'              = "$raw/pc/rodar.ps1"
  'cadastrar-tokens.ps1'   = "$raw/pc/cadastrar-tokens.ps1"
}
foreach ($k in $arquivos.Keys) {
  Invoke-WebRequest -Uri ($arquivos[$k] + '?t=' + [DateTime]::Now.Ticks) -OutFile (Join-Path $base $k) -UseBasicParsing
}
Set-Content -Path (Join-Path $base 'package.json') -Value '{ "type": "module" }' -Encoding ASCII
New-Item -ItemType Directory -Force ('G:\Meu Drive\Arquivos de IA\Claude\Rotina Unity\Or' + [char]0x00E7 + 'amentos\Cilia') | Out-Null   # 15/10/2026: pasta Orcamentos (Cilia, HDI, SOMA)

# tarefa agendada: todo dia 00:15, com o usuário logado (o PC fica sempre ligado)
$acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\rodar.ps1`""
$quando = New-ScheduledTaskTrigger -Daily -At '00:15'
$opcoes = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
Register-ScheduledTask -TaskName 'Unity - Cilia 00h15' -Action $acao -Trigger $quando -Settings $opcoes -Description 'Consulta diaria da API oficial do Cilia (4 casas) - salva PDFs e resumo no Drive' -Force | Out-Null

# atalho na Área de Trabalho para cadastrar os tokens
$area = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
$at = $ws.CreateShortcut((Join-Path $area 'Cadastrar tokens Cilia.lnk'))
$at.TargetPath = 'powershell.exe'
$at.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$base\cadastrar-tokens.ps1`""
$at.WorkingDirectory = $base
$at.Save()
Write-Host 'Instalado: tarefa "Unity - Cilia 00h15" e atalho "Cadastrar tokens Cilia" na Area de Trabalho.'
