# 折扣动作台账 MVP

本地网页工具，用来记录亚马逊价格折扣活动、负责人、折扣周期和到期提醒。

## 启动

推荐直接打开网页链接：

```text
https://cccadyforwork-cloud.github.io/Discount-/
```

每次把代码推送到 GitHub 的 `main` 分支后，GitHub Pages 会自动更新这个网页。

本地备用启动方式：

Mac：双击 `start.command`，或在当前目录运行：

```bash
./start.sh
```

Windows：双击 `start.bat`。

如果浏览器没有自动打开，再手动打开：

```text
http://localhost:4173/index.html
```

## 当前功能

- 手动新增折扣动作
- 导入亚马逊价格折扣 Excel
- 记录内部标题、负责人、折扣价、参与数量和活动周期
- 按负责人、状态、关键词筛选
- 每页 20 条或 50 条分页展示
- 到期前提醒、已过期提示
- 本地浏览器保存数据
- 备份数据为 JSON
