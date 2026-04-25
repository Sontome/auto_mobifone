$path = "C:\auto_mobifone"

New-Item -ItemType Directory -Force -Path $path | Out-Null

$zip = "$env:TEMP\repo.zip"

Invoke-WebRequest `
"https://github.com/Sontome/auto_mobifone/archive/refs/heads/main.zip" `
-UseBasicParsing `
-OutFile $zip

Expand-Archive $zip -DestinationPath $env:TEMP -Force

Copy-Item "$env:TEMP\auto_mobifone\*" $path -Recurse -Force

cd $path

Set-Clipboard "chrome://extensions/"

Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show(
"Done  ",
"Installer",
"OK",
"Information"
)

