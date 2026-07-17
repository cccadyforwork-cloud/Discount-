# 折扣动作台账 MVP

本地网页工具，用来记录亚马逊价格折扣活动、负责人、折扣周期和到期提醒。

## 启动

推荐直接打开网页链接：

```text
https://cccadyforwork-cloud.github.io/Discount-/
```

同事打开这个链接看到的是同一份共享数据。

你更新数据时：

1. 在本地打开工具。
2. 填好内部标题、负责人、开始日期、结束日期，再导入 Excel。
3. 点 `生成共享数据`，会下载 `discount-records.json`。
4. 用这个文件替换项目里的 `data/discount-records.json`。
5. 推送到 GitHub 后，同事刷新网页就能看到新数据。

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

- 公共网页查看共享折扣数据
- 本地统一导入亚马逊价格折扣 Excel
- 生成共享数据文件
- 记录内部标题、负责人、折扣价、参与数量和活动周期
- 按负责人、状态、关键词筛选
- 每页 20 条或 50 条分页展示
- 到期前提醒、已过期提示
- GitHub Pages 发布网页
