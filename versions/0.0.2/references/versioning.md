# Slidev Editable PPTX Version Workflow

This file is the canonical process for updating and saving the skill. Follow it in every new conversation when modifying `slidev-editable-pptx`.

## Fixed Paths

- Live skill: `C:\Users\HP\.codex\skills\slidev-editable-pptx`
- Version repository: `C:\Users\HP\Documents\GitHub\slidev-editable-pptx`
- GitHub remote: `https://github.com/qiulishang/slidev-editable-pptx.git`
- GitHub CLI: `C:\Users\HP\AppData\Local\Programs\GitHub CLI\bin\gh.exe`

## Required Rules

- Never overwrite an existing version folder such as `versions/0.0.1/`.
- Save every modification as a new semantic version, for example `0.0.2`, `0.0.3`.
- Keep the live skill at the latest version so Codex can still discover it.
- Push both the branch and the version tag to GitHub.

## Steps

1. Read the current version:

```powershell
Get-Content -LiteralPath "C:\Users\HP\.codex\skills\slidev-editable-pptx\VERSION" -Encoding UTF8
```

2. Decide the next version by incrementing the patch number, for example `0.0.1` becomes `0.0.2`.

3. Modify the live skill files under `C:\Users\HP\.codex\skills\slidev-editable-pptx`.

4. Update the live `VERSION` file to the next version.

5. Copy the complete live skill into a new version folder:

```powershell
$live = "C:\Users\HP\.codex\skills\slidev-editable-pptx"
$repo = "C:\Users\HP\Documents\GitHub\slidev-editable-pptx"
$next = "0.0.2"
Copy-Item -LiteralPath $live -Destination "$repo\versions\$next" -Recurse -Force
```

6. Update the repository root `VERSION`:

```powershell
Set-Content -LiteralPath "$repo\VERSION" -Value $next -Encoding ascii
```

7. Update the current version list in `$repo\README.md`.

8. Commit, tag, and push:

```powershell
git -C $repo add -A
git -C $repo commit -m "chore: version slidev-editable-pptx $next"
git -C $repo tag "v$next"
git -C $repo push origin main --tags
```

9. Verify:

```powershell
git -C $repo status --short --branch
git -C $repo ls-remote --tags origin
gh auth status
```

If `gh` is not on `PATH`, use the full path:

```powershell
"C:\Users\HP\AppData\Local\Programs\GitHub CLI\bin\gh.exe" auth status
```

## Version History

- `0.0.1`: initial version.
- `0.0.2`: added this version workflow into the skill itself.
