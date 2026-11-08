$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$msvcDir = "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Tools\MSVC\14.44.35207"
$sdkDir  = "C:\Program Files (x86)\Windows Kits\10"
$sdkVer  = "10.0.26100.0"

$env:PATH    = "$msvcDir\bin\Hostx64\x64;$sdkDir\bin\$sdkVer\x64;$env:PATH"
$env:INCLUDE = "$msvcDir\include;$sdkDir\Include\$sdkVer\ucrt;$sdkDir\Include\$sdkVer\shared;$sdkDir\Include\$sdkVer\um"
$env:LIB     = "$msvcDir\lib\x64;$sdkDir\Lib\$sdkVer\ucrt\x64;$sdkDir\Lib\$sdkVer\um\x64"

$outDir = Join-Path $env:TEMP "door_sensor_host_test"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$exePath = Join-Path $outDir "test_host.exe"

$projectRoot = Split-Path -Parent $PSScriptRoot
& "$msvcDir\bin\Hostx64\x64\cl.exe" /nologo /utf-8 /std:c11 /W4 `
    "/I$projectRoot\test\mocks" `
    "/I$projectRoot\main" `
    "$projectRoot\test\test_host.c" `
    "$projectRoot\main\door_sensor.c" `
    "/Fo$outDir\" "/Fe$exePath"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $exePath
exit $LASTEXITCODE
