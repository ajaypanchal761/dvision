# PowerShell script to update API import paths in modules
# Run this from the src directory

$modulesPath = "modules"

# Update student module imports - pages
Get-ChildItem -Path "$modulesPath\student\pages" -Recurse -Include "*.jsx", "*.js" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "from `"\.\./services/api`"", "from `"../../../services/api`""
  $content = $content -replace "from `'\.\./services/api`'", "from `'../../../services/api`'"
  $content = $content -replace "from `"\.\./\.\./services/api`"", "from `"../../../services/api`""
  $content = $content -replace "from `'\.\./\.\./services/api`'", "from `'../../../services/api`'"
  Set-Content -Path $_.FullName -Value $content -NoNewline
}

# Update student module imports - context
Get-ChildItem -Path "$modulesPath\student\context" -Recurse -Include "*.jsx", "*.js" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "from `"\.\./services/api`"", "from `"../../services/api`""
  $content = $content -replace "from `'\.\./services/api`'", "from `'../../services/api`'"
  Set-Content -Path $_.FullName -Value $content -NoNewline
}

# Update student module imports - utils
Get-ChildItem -Path "$modulesPath\student\utils" -Recurse -Include "*.jsx", "*.js" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "from `"\.\./services/api`"", "from `"../../services/api`""
  $content = $content -replace "from `'\.\./services/api`'", "from `'../../services/api`'"
  Set-Content -Path $_.FullName -Value $content -NoNewline
}

# Update admin module imports - pages
Get-ChildItem -Path "$modulesPath\admin\pages" -Recurse -Include "*.jsx", "*.js" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "from `"\.\./\.\./services/api`"", "from `"../../../services/api`""
  $content = $content -replace "from `'\.\./\.\./services/api`'", "from `'../../../services/api`'"
  Set-Content -Path $_.FullName -Value $content -NoNewline
}

# Update admin module imports - components
Get-ChildItem -Path "$modulesPath\admin\components" -Recurse -Include "*.jsx", "*.js" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "from `"\.\./\.\./services/api`"", "from `"../../../services/api`""
  $content = $content -replace "from `'\.\./\.\./services/api`'", "from `'../../../services/api`'"
  Set-Content -Path $_.FullName -Value $content -NoNewline
}

# Update admin module imports - utils
Get-ChildItem -Path "$modulesPath\admin\utils" -Recurse -Include "*.jsx", "*.js" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "from `"\.\./services/api`"", "from `"../../../services/api`""
  $content = $content -replace "from `'\.\./services/api`'", "from `'../../../services/api`'"
  Set-Content -Path $_.FullName -Value $content -NoNewline
}

# Update teacher module imports - pages
Get-ChildItem -Path "$modulesPath\teacher\pages" -Recurse -Include "*.jsx", "*.js" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "from `"\.\./services/api`"", "from `"../../../services/api`""
  $content = $content -replace "from `'\.\./services/api`'", "from `'../../../services/api`'"
  Set-Content -Path $_.FullName -Value $content -NoNewline
}

# Update teacher module imports - utils
Get-ChildItem -Path "$modulesPath\teacher\utils" -Recurse -Include "*.jsx", "*.js" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "from `"\.\./services/api`"", "from `"../../../services/api`""
  $content = $content -replace "from `'\.\./services/api`'", "from `'../../../services/api`'"
  Set-Content -Path $_.FullName -Value $content -NoNewline
}

Write-Host "Import paths updated successfully!"
