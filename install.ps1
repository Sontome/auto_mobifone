```powershell
$path = "C:\auto_mobifone"
$temp = "$env:TEMP\auto_mobifone_install"
$zip = "$temp\repo.zip"

# Reset temp
Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $temp | Out-Null

# Tạo thư mục đích
New-Item -ItemType Directory -Force -Path $path | Out-Null

# Download zip
Invoke-WebRequest `
"https://github.com/Sontome/auto_mobifone/archive/refs/heads/main.zip" `
-OutFile $zip

# Giải nén
Expand-Archive $zip -DestinationPath $temp -Force

# Copy source đúng folder
Copy-Item "$temp\auto_mobifone-main\*" $path -Recurse -Force

# Vào thư mục
Set-Location $path

# Copy link chrome extension
Set-Clipboard "chrome://extensions/"

Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show(
"Đã cài xong vào C:\auto_mobifone`nClipboard đã copy chrome://extensions/",
"Installer",
"OK",
"Information"
)
```
