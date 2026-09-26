$ErrorActionPreference = "Stop"

[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$inputText = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputText)) {
    exit 0
}

$event = $inputText | ConvertFrom-Json
if ($event.hook_event_name -notin @("UserPromptSubmit", "Stop")) {
    exit 0
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logRoot = Join-Path $repoRoot ".agent-logs"
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

$sessionId = [string]$event.session_id
if ([string]::IsNullOrWhiteSpace($sessionId)) {
    $sessionId = "unknown-session"
}
$safeSessionId = $sessionId -replace '[^A-Za-z0-9._-]', '_'
$shortSessionId = if ($sessionId.Length -gt 8) { $sessionId.Substring(0, 8) } else { $sessionId }
$model = if ([string]::IsNullOrWhiteSpace([string]$event.model)) { "unknown" } else { [string]$event.model }
$timestamp = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$date = $timestamp.Substring(0, 10)

$logFile = Get-ChildItem -LiteralPath $logRoot -Filter "*_$safeSessionId.md" -File -ErrorAction SilentlyContinue |
    Sort-Object Name |
    Select-Object -First 1

if ($null -eq $logFile) {
    $fileTimestamp = [DateTime]::UtcNow.ToString("yyyy-MM-dd_HH-mm-ss")
    $logPath = Join-Path $logRoot "${fileTimestamp}_${safeSessionId}.md"
    $header = @"
---
session_id: $sessionId
date: $date
author: ahmadsaeeduddin
model: $model
tool: codex
project: 8x-SWE
total_exchanges: 0
first_prompt_time: pending
last_prompt_time: pending
---

# Session Log - $date

Session: ``$shortSessionId`` | Project: ``8x-SWE`` | Author: ``ahmadsaeeduddin``

---
"@
    [System.IO.File]::WriteAllText($logPath, $header, [System.Text.UTF8Encoding]::new($false))
} else {
    $logPath = $logFile.FullName
}

$content = [System.IO.File]::ReadAllText($logPath)
$exchangeMatch = [regex]::Match($content, '(?m)^total_exchanges: (\d+)$')
$completedExchanges = if ($exchangeMatch.Success) { [int]$exchangeMatch.Groups[1].Value } else { 0 }

if ($event.hook_event_name -eq "UserPromptSubmit") {
    $number = $completedExchanges + 1
    $body = [string]$event.prompt
    $entry = "`r`n`r`n[LOG_ENTRY type=PROMPT num=$number session=$shortSessionId]`r`ntimestamp: $timestamp`r`nmodel: $model`r`n`r`n$body`r`n"
    [System.IO.File]::AppendAllText($logPath, $entry, [System.Text.UTF8Encoding]::new($false))

    $content = [System.IO.File]::ReadAllText($logPath)
    if ($content -match '(?m)^first_prompt_time: pending$') {
        $content = $content -replace '(?m)^first_prompt_time: pending$', "first_prompt_time: $timestamp"
    }
    $content = $content -replace '(?m)^last_prompt_time: .*$', "last_prompt_time: $timestamp"
    [System.IO.File]::WriteAllText($logPath, $content, [System.Text.UTF8Encoding]::new($false))
} elseif ($event.hook_event_name -eq "Stop") {
    $number = $completedExchanges + 1
    $body = [string]$event.last_assistant_message
    $entry = "`r`n`r`n[LOG_ENTRY type=RESPONSE num=$number session=$shortSessionId]`r`ntimestamp: $timestamp`r`nmodel: $model`r`n`r`n$body`r`n"
    [System.IO.File]::AppendAllText($logPath, $entry, [System.Text.UTF8Encoding]::new($false))

    $content = [System.IO.File]::ReadAllText($logPath)
    $content = $content -replace '(?m)^total_exchanges: \d+$', "total_exchanges: $number"
    [System.IO.File]::WriteAllText($logPath, $content, [System.Text.UTF8Encoding]::new($false))
}

Write-Output '{"continue":true}'
