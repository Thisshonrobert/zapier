param(
  [ValidateSet('Plan','Docs','Verify','Prepare','Start','Publish','Resume')][string]$Mode = 'Plan',
  [string]$Phase = '10c',
  [string[]]$CommentFiles = @()
)
$env:CLAUDE_CONFIG_DIR = 'C:/Users/thiss/.claude'
& rtk proxy node (Join-Path $PSScriptRoot 'finish-phase.mjs') $Mode $Phase @CommentFiles
exit $LASTEXITCODE
