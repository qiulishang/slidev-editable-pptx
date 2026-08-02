# slidev-editable-pptx 版本库

当前 live skill 位于 `C:\Users\HP\.codex\skills\slidev-editable-pptx`。

本仓库按 `versions/<semver>/` 保存历史快照，旧版本不会被新版本覆盖。

## 当前版本

- `0.0.3`

## 版本历史

- `0.0.1`
- `0.0.2`
- `0.0.3`

## SSH 推送规则

后续推送统一使用 SSH，不使用 HTTPS：

```powershell
git remote set-url origin "git@github.com:qiulishang/slidev-editable-pptx.git"
git config core.sshCommand "ssh -i C:/Users/HP/.ssh/id_ed25519_slidev_skill -o IdentitiesOnly=yes"
```

该规则已写入 live skill 的 `references/versioning.md`，后续新对话应直接遵循。

## 独立于对话的流程

live skill 内已保存 `references/versioning.md`，后续任何新对话修改或调整 skill 时，必须先读取该文件并按其中步骤另存新版本、提交 Git、打标签并推送到 GitHub。

## 后续版本流程

1. 在 live skill 原文件基础上修改或调整。
2. 将 live skill 中的 `VERSION` 更新为下一个版本，例如 `0.0.3`。
3. 将 live skill 复制为本仓库的 `versions/0.0.3/`。
4. 同步更新仓库根目录 `VERSION` 为 `0.0.3`。
5. 提交 Git 并打标签 `v0.0.3`。
6. 推送到 GitHub 仓库。
