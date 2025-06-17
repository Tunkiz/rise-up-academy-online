$migrationsPath = ".\supabase\migrations"
Get-ChildItem $migrationsPath -Filter "*.sql" | ForEach-Object {
    $filename = $_.Name
    if ($filename -match "^(\d{14})-([a-f0-9-]+)\.sql$") {
        $timestamp = $matches[1]
        $newName = "$timestamp" + "_migration.sql"
        Rename-Item -Path $_.FullName -NewName $newName -Force
    }
    elseif ($filename -match "^(\d{14})-(.+)\.sql$") {
        $timestamp = $matches[1]
        $description = $matches[2]
        $newName = "$timestamp" + "_migration.sql"
        Rename-Item -Path $_.FullName -Force -NewName $newName
    }
    elseif ($filename -match "^(\d{8})(\d{6})-(.+)\.sql$") {
        $timestamp = $matches[1] + $matches[2]
        $description = $matches[3]
        $newName = "$timestamp" + "_migration.sql"
        Rename-Item -Path $_.FullName -NewName $newName -Force
    }
}
