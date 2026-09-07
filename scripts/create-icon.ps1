$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$target = Join-Path $PSScriptRoot '../build'
[IO.Directory]::CreateDirectory($target) | Out-Null
$images = @()
foreach ($size in @(16, 24, 32, 48, 64, 128, 256)) {
    $bitmap = New-Object Drawing.Bitmap($size, $size)
    $g = [Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.ScaleTransform(($size / 256.0), ($size / 256.0))
    $shape = New-Object Drawing.Drawing2D.GraphicsPath
    foreach ($arc in @(@(8,8,64,64,180,90), @(184,8,64,64,270,90), @(184,184,64,64,0,90), @(8,184,64,64,90,90))) {
        $shape.AddArc($arc[0],$arc[1],$arc[2],$arc[3],$arc[4],$arc[5])
    }
    $shape.CloseFigure()
    $blue = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(0,103,192))
    $g.FillPath($blue,$shape)
    $pen = New-Object Drawing.Pen([Drawing.Color]::White,14)
    $pen.StartCap = $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen,128,190,128,65)
    $g.DrawLines($pen,[Drawing.Point[]]@((New-Object Drawing.Point(128,151)),(New-Object Drawing.Point(80,122)),(New-Object Drawing.Point(80,94))))
    $g.DrawLines($pen,[Drawing.Point[]]@((New-Object Drawing.Point(128,128)),(New-Object Drawing.Point(176,101)),(New-Object Drawing.Point(176,78))))
    $g.FillEllipse([Drawing.Brushes]::White,110,176,36,36)
    $g.FillEllipse([Drawing.Brushes]::White,65,72,30,30)
    $g.FillRectangle([Drawing.Brushes]::White,163,60,26,26)
    $g.FillPolygon([Drawing.Brushes]::White,[Drawing.Point[]]@((New-Object Drawing.Point(128,40)),(New-Object Drawing.Point(106,72)),(New-Object Drawing.Point(150,72))))
    $stream = New-Object IO.MemoryStream
    $bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
    $images += ,$stream.ToArray()
    if ($size -eq 256) { [IO.File]::WriteAllBytes((Join-Path $target 'icon.png'),$stream.ToArray()) }
    $stream.Dispose(); $pen.Dispose(); $blue.Dispose(); $shape.Dispose(); $g.Dispose(); $bitmap.Dispose()
}
$output = [IO.File]::Create((Join-Path $target 'icon.ico'))
$writer = New-Object IO.BinaryWriter($output)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$images.Count)
$offset = 6 + 16 * $images.Count
$sizes = @(16,24,32,48,64,128,0)
for ($i=0; $i -lt $images.Count; $i++) {
    $writer.Write([byte]$sizes[$i]); $writer.Write([byte]$sizes[$i]); $writer.Write([uint16]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$images[$i].Length); $writer.Write([uint32]$offset)
    $offset += $images[$i].Length
}
foreach ($bytes in $images) { $writer.Write([byte[]]$bytes) }
$writer.Dispose()
