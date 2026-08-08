# slidev-editable-pptx 版本库

当前 live skill 位于 `C:\Users\HP\.codex\skills\slidev-editable-pptx`。

本仓库只保留当前版本快照，且当前版本文件直接平铺在仓库根目录，与 `README.md`、`VERSION` 同级；不保留 `versions/<version>/` 文件夹。Git 历史作为版本备份，旧快照和旧标签会在发布新版本时删除。

## 当前版本

- `0.0.6`

## Commit 内容确认规则

每次进行 Git 版本更新前，必须先询问用户本次 commit 要补充的内容，并等待用户确认后再提交。

如果用户没有提供特定内容，则使用默认信息：

```text
chore: version slidev-editable-pptx 0.0.6
```

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
2. 询问用户本次 commit 要补充的内容并等待回复。
3. 将 live skill 中的 `VERSION` 更新为下一个版本。
4. 将 live skill 复制为本仓库的 `versions/<next>/`。
5. 删除其他旧版本文件夹和旧标签。
6. 使用用户确认的 commit 内容提交 Git，并打对应标签。
7. 通过 SSH 推送到 GitHub 仓库。
