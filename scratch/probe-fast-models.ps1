$headers = @{
    "Authorization" = "Bearer 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"
    "Content-Type" = "application/json"
}

$candidates = @(
    "meta/llama-3.2-11b-vision-instruct",
    "meta/llama-3.2-90b-vision-instruct",
    "mistralai/mistral-large-2-instruct",
    "google/gemma-3-12b-it",
    "deepseek-ai/deepseek-v4.1-flash",
    "nvidia/llama-3.1-nemotron-70b-instruct"
)

foreach ($m in $candidates) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $body = @{
        model = $m
        messages = @(@{ role = "user"; content = "Generate 1 short math question in JSON." })
        max_tokens = 150
    } | ConvertTo-Json

    try {
        $res = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/chat/completions" -Method Post -Headers $headers -Body $body -TimeoutSec 15
        $sw.Stop()
        Write-Output "SUCCESS: $m in $($sw.ElapsedMilliseconds)ms"
    } catch {
        $sw.Stop()
        Write-Output "FAIL: $m in $($sw.ElapsedMilliseconds)ms - $($_.Exception.Message)"
    }
}
