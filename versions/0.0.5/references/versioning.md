# Slidev Editable PPTX Version Workflow

This file is the canonical process for updating and saving the skill. Follow it in every new conversation when modifying `slidev-editable-pptx`.

## Fixed Paths

- Live skill: `C:\Users\HP\.codex\skills\slidev-editable-pptx`
- Version repository: `C:\Users\HP\Documents\GitHub\slidev-editable-pptx`
- GitHub remote: `git@github.com:qiulishang/slidev-editable-pptx.git`
- SSH key: `C:\Users\HP\.ssh\id_ed25519_slidev_skill`
- GitHub CLI: `C:\Users\HP\AppData\Local\Programs\GitHub CLI\bin\gh.exe`

## Version Policy

- Git history is the canonical backup. Do not keep multiple old version snapshots.
- Keep only the current version snapshot under `versions/<current>/`.
- Delete obsolete version folders and tags from local and GitHub when publishing a new version.
- Keep the live skill at the latest version so Codex can still discover it.
- Always push through the SSH remote and the dedicated deploy key. Do not switch the remote back to HTTPS.

## Commit Confirmation

- Before every version update, ask the user what content to include in the version commit message.
- Wait for the user's response before creating the commit.
- If the user provides content, use it as the commit message.
- If the user has no specific content, use `chore: version slidev-editable-pptx <version>`.

## Push Protocol

The repository must use this SSH remote:

```powershell
git -C "C:\Users\HP\Documents\GitHub\slidev-editable-pptx" remote set-url origin "git@github.com:qiulishang/slidev-editable-pptx.git"
```

The repository must use this SSH key:

```powershell
git -C "C:\Users\HP\Documents\GitHub\slidev-editable-pptx" config core.sshCommand "ssh -i C:/Users/HP/.ssh/id_ed25519_slidev_skill -o IdentitiesOnly=yes"
```

If the repository is cloned again on another machine, configure both the remote and the SSH key before pushing.

## Steps

1. Read the current version:

```powershell
Get-Content -LiteralPath "C:\Users\HP\.codex\skills\slidev-editable-pptx\VERSION" -Encoding UTF8
```

2. Ask the user what content to include in the version commit and wait for the response.

3. Modify the live skill files under `C:\Users\HP\.codex\skills\slidev-editable-pptx`.

4. Update the live `VERSION` file to the next version.

5. Copy the complete live skill into a new version folder:

```powershell
$live = "C:\Users\HP\.codex\skills\slidev-editable-pptx"
$repo = "C:\Users\HP\Documents\GitHub\slidev-editable-pptx"
$next = "0.0.5"
Copy-Item -LiteralPath $live -Destination "$repo\versions\$next" -Recurse -Force
```

6. Remove all other `versions/<old>/` folders from the repository.

7. Update the repository root `VERSION` and the current version list in `$repo\README.md`.

8. Commit with the user-confirmed commit message:

```powershell
git -C $repo add -A
git -C $repo commit -m "<user-confirmed commit message>"
```

9. Tag and push through SSH:

```powershell
git -C $repo tag "v$next"
git -C $repo push origin main --tags
```

10. Delete obsolete local tags:

```powershell
git -C $repo tag -d v0.0.1 v0.0.2
```

11. Delete obsolete remote tags:

```powershell
git -C $repo push origin --delete refs/tags/v0.0.1 refs/tags/v0.0.2
```

12. Verify:

```powershell
git -C $repo status --short --branch
git -C $repo ls-remote --tags origin
```

If `gh` is not on `PATH`, use the full path:

```powershell
"C:\Users\HP\AppData\Local\Programs\GitHub CLI\bin\gh.exe" auth status
```

## Version History

- `0.0.5`: default no Slidev dev server, shared dependency runner, blank-slide and slide-count preflight, unify Chinese font naming as 宋体.
- `0.0.4`: optimized versions `0.0.1` through `0.0.3`, keep only the current snapshot, and added the commit content confirmation rule.
