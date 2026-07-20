param(
  [string]$SourceDirectory = (Join-Path $env:USERPROFILE 'Downloads\Collectables\Badges'),
  [string]$DestinationDirectory = (Join-Path $PSScriptRoot '..\public\badges\collection'),
  [int]$Size = 1200
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $SourceDirectory)) {
  throw "Badgebronmap niet gevonden: $SourceDirectory"
}

$destination = [System.IO.Path]::GetFullPath($DestinationDirectory)
[System.IO.Directory]::CreateDirectory($destination) | Out-Null

$candidates = foreach ($file in Get-ChildItem -LiteralPath $SourceDirectory -File) {
  if ($file.Name -match '^(?<park>disneyland|adventure)[ -](?<rarity>common|uncommon|rare|epic|legendary)-?(?<number>\d+)') {
    $park = $Matches.park.ToLowerInvariant()
    $rarity = $Matches.rarity.ToLowerInvariant()
    $number = [int]$Matches.number
    $version = 1
    # Een versienummer mag direct achter het slotnummer staan, of achter de lange badgenaam.
    # Voorbeelden: common-1_3.png en common-1.png — Badge Name_3.png.
    if ($file.BaseName -match '_(?<assetVersion>\d+)$') {
      $version = [int]$Matches.assetVersion
    }

    [PSCustomObject]@{
      File = $file
      Park = $park
      Rarity = $rarity
      Number = $number
      Version = $version
      Key = "$park-$rarity-$number"
    }
  }
}

$latest = $candidates |
  Group-Object Key |
  ForEach-Object { $_.Group | Sort-Object Version, @{ Expression = { $_.File.LastWriteTimeUtc } } -Descending | Select-Object -First 1 } |
  Sort-Object Key

foreach ($badge in $latest) {
  $targetPath = Join-Path $destination "$($badge.Key).png"
  $sourceImage = [System.Drawing.Image]::FromFile($badge.File.FullName)
  try {
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb))
    try {
      $bitmap.SetResolution(96, 96)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($sourceImage, 0, 0, $Size, $Size)
      } finally {
        $graphics.Dispose()
      }
      $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $sourceImage.Dispose()
  }

  Write-Host ("{0} <= versie {1}: {2}" -f $badge.Key, $badge.Version, $badge.File.Name)
}

Write-Host ("{0} nieuwste badgeafbeeldingen geïmporteerd." -f $latest.Count)
