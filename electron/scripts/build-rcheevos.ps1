$ErrorActionPreference = 'Stop'

$cmakeCommand = Get-Command cmake -ErrorAction SilentlyContinue
if ($cmakeCommand) {
  $cmakePath = $cmakeCommand.Source
} else {
  $vswherePath = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
  if (-not (Test-Path $vswherePath)) {
    throw 'CMake não encontrado. Instale CMake ou o componente C++ do Visual Studio Build Tools.'
  }

  $cmakePath = & $vswherePath -latest -products '*' -find 'Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe' |
    Select-Object -First 1
  if (-not $cmakePath) {
    throw 'CMake não encontrado na instalação do Visual Studio Build Tools.'
  }
}

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$source = Join-Path $workspaceRoot 'electron\vendor\rcheevos'
$build = Join-Path $workspaceRoot 'build\rcheevos'

& $cmakePath -S $source -B $build -A x64
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $cmakePath --build $build --config Release
exit $LASTEXITCODE