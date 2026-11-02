param(
    [string]$BaseUrl = "http://host.docker.internal:8080"
)

$envFile = Join-Path $PSScriptRoot "../../../.env"
if (-not (Test-Path $envFile)) {
    Write-Error "File .env tidak ditemukan di root proyek: $envFile"
    exit 2
}

$values = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2] }
}

docker run --rm -v "${PSScriptRoot}:/etc/newman" postman/newman:alpine run dikichi-v1-get-post.postman_collection.json `
    --env-var "baseUrl=$BaseUrl" `
    --env-var "masterPassword=$($values['SEED_MASTER_PASSWORD'])" `
    --env-var "cashierPassword=$($values['SEED_CASHIER_PASSWORD'])" `
    --env-var "kitchenPassword=$($values['SEED_KITCHEN_PASSWORD'])" `
    --reporters cli
