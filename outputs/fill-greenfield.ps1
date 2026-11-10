$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$root=Join-Path $PSScriptRoot 'greenfield-fc'
$z=[IO.Compression.ZipFile]::Open("$root/data/danh_sach_cau_thu.xlsx",[IO.Compression.ZipArchiveMode]::Update)
$ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
function Read-Part($name){$r=[IO.StreamReader]::new($z.GetEntry($name).Open());try{[xml]$r.ReadToEnd()}finally{$r.Dispose()}}
function Write-Part($name,$doc){$z.GetEntry($name).Delete();$e=$z.CreateEntry($name);$s=$e.Open();$settings=[Xml.XmlWriterSettings]::new();$settings.Encoding=[Text.UTF8Encoding]::new($false);$w=[Xml.XmlWriter]::Create($s,$settings);try{$doc.Save($w)}finally{$w.Dispose();$s.Dispose()}}
function Add-Node($parent,$name){$n=$parent.OwnerDocument.CreateElement('x',$name,$ns);[void]$parent.AppendChild($n);return $n}
function Get-Val($row,$column){$row.SelectSingleNode("*[local-name()='c'][@r='$column$($row.r)']/*[local-name()='v']").InnerText}
function Set-Cell($row,$column,$formula,$value,$type='n'){
    $address="$column$($row.r)";$c=$row.SelectSingleNode("*[local-name()='c'][@r='$address']")
    if(!$c){$c=Add-Node $row 'c'}
    $c.RemoveAll();$c.SetAttribute('r',$address);$c.SetAttribute('t',$type)
    if($formula){$f=Add-Node $c 'f';$f.InnerText=$formula}
    $v=Add-Node $c 'v';$v.InnerText=[string]$value;return $c
}
function Set-Filter($table,$col,$val){
    $f=$table.DocumentElement.SelectSingleNode("*[local-name()='autoFilter']");$f.RemoveAll();$f.SetAttribute('ref',$table.DocumentElement.ref)
    $c=Add-Node $f 'filterColumn';$c.SetAttribute('colId',[string]$col)
    $custom=Add-Node $c 'customFilters';$rule=Add-Node $custom 'customFilter';$rule.SetAttribute('operator','greaterThanOrEqual');$rule.SetAttribute('val',[string]$val)
}
try{
    $p=Read-Part 'xl/worksheets/sheet1.xml';$t=Read-Part 'xl/worksheets/sheet2.xml';$m=Read-Part 'xl/worksheets/sheet3.xml';$styles=Read-Part 'xl/styles.xml'
    $teamRows=@($t.SelectNodes("//*[local-name()='sheetData']/*"));$teams=@{};foreach($r in $teamRows|Select-Object -Skip 1){$teams[(Get-Val $r 'A')]=Get-Val $r 'B'}
    $teamLast=$teamRows.Count
    $xfs=$styles.DocumentElement.SelectSingleNode("*[local-name()='cellXfs']");$styleId=$xfs.ChildNodes.Count;$xf=Add-Node $xfs 'xf'
    foreach($key in @('fontId','fillId','borderId','xfId')){$xf.SetAttribute($key,'0')};$xf.SetAttribute('numFmtId','10');$xf.SetAttribute('applyNumberFormat','1');$xfs.SetAttribute('count',[string]$xfs.ChildNodes.Count)
    $rows=@($p.SelectNodes("//*[local-name()='sheetData']/*"));$last=$rows.Count;$counts=@{};$visiblePlayers=0
    [void](Set-Cell $rows[0] 'J' '' 'ten_doi' 'str')
    foreach($r in $rows|Select-Object -Skip 1){
        $i=$r.r;$team=Get-Val $r 'E';$counts[$team]++;$games=[double](Get-Val $r 'G');$goals=[double](Get-Val $r 'H');$ratio=if($games -eq 0){0}else{$goals/$games}
        $c=Set-Cell $r 'I' "IFERROR(H$i/G$i,0)" ($ratio.ToString('R',[Globalization.CultureInfo]::InvariantCulture));$c.SetAttribute('s',[string]$styleId)
        [void](Set-Cell $r 'J' ('VLOOKUP(E'+$i+',DoiBong!$A$2:$C$'+$teamLast+',2,FALSE)') $teams[$team] 'str')
        if($ratio -lt 0.25){$r.SetAttribute('hidden','1')}else{$visiblePlayers++}
    }
    $pt=Read-Part 'xl/tables/table1.xml';$pt.DocumentElement.SetAttribute('ref',"A1:J$last");$cols=$pt.DocumentElement.SelectSingleNode("*[local-name()='tableColumns']");$col=Add-Node $cols 'tableColumn';$col.SetAttribute('id','10');$col.SetAttribute('name','ten_doi');$cols.SetAttribute('count','10');Set-Filter $pt 8 '0.25'
    $visibleMatches=0
    foreach($r in @($m.SelectNodes("//*[local-name()='sheetData']/*"))|Select-Object -Skip 1){
        $i=$r.r;$team=Get-Val $r 'C';$result=Get-Val $r 'E';$points=if($result.StartsWith('W')){3}elseif($result.StartsWith('D')){1}else{0}
        [void](Set-Cell $r 'F' ('VLOOKUP(C'+$i+',DoiBong!$A$2:$C$'+$teamLast+',2,FALSE)') $teams[$team] 'str')
        [void](Set-Cell $r 'G' ('COUNTIF(CauThu!$E$2:$E$'+$last+',C'+$i+')') $counts[$team])
        [void](Set-Cell $r 'H' ('IF(LEFT(E'+$i+',1)="W",3,IF(LEFT(E'+$i+',1)="D",1,0))') $points)
        if($points -lt 3){$r.SetAttribute('hidden','1')}else{$visibleMatches++}
    }
    $mt=Read-Part 'xl/tables/table3.xml';Set-Filter $mt 7 '3'
    foreach($sheet in @($p,$m)){$pr=$sheet.CreateElement('x','sheetPr',$ns);$pr.SetAttribute('filterMode','1');[void]$sheet.DocumentElement.PrependChild($pr)}
    $wb=Read-Part 'xl/workbook.xml';$calc=$wb.DocumentElement.SelectSingleNode("*[local-name()='calcPr']");if(!$calc){$calc=Add-Node $wb.DocumentElement 'calcPr'};$calc.SetAttribute('calcMode','auto');$calc.SetAttribute('fullCalcOnLoad','1')
    Write-Part 'xl/worksheets/sheet1.xml' $p;Write-Part 'xl/worksheets/sheet3.xml' $m;Write-Part 'xl/tables/table1.xml' $pt;Write-Part 'xl/tables/table3.xml' $mt;Write-Part 'xl/styles.xml' $styles;Write-Part 'xl/workbook.xml' $wb
    Write-Output "PASS: $visiblePlayers players >=25%; $visibleMatches matches >=3; GF=$($counts['GF']); AC=$($counts['AC'])"
}finally{$z.Dispose()}
