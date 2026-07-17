# 折扣动作台账 MVP

本地网页工具，用来记录亚马逊价格折扣活动、负责人、折扣周期和到期提醒。

## 启动

同事先在自己电脑上更新项目：

```bash
git pull
```

然后在自己电脑上启动网页：

Mac：双击 `start.command`，或在当前目录运行：

```bash
./start.sh
```

Windows：双击 `start.bat`。

浏览器会自动打开：

```text
http://localhost:4173/index.html
```

网页会读取项目里的 `data/discount-records.json`。只要这个文件被更新并推送到 GitHub，同事 `git pull` 后重新打开网页就能看到最新数据。

## 更新数据

你更新数据时：

1. 本地打开工具。
2. 填好内部标题、负责人、开始日期、结束日期，再导入 Excel。
3. 点 `生成共享数据`，下载 `discount-records.json`。
4. 用下载的文件替换项目里的 `data/discount-records.json`。
5. 提交并推送到 GitHub。
6. 同事 `git pull` 后重新打开本地网页。

## 当前功能

- 本地网页查看共享折扣数据
- 本地统一导入亚马逊价格折扣 Excel
- 生成共享数据文件
- 记录内部标题、负责人、折扣价、参与数量和活动周期
- 按负责人、状态、关键词筛选
- 每页 20 条或 50 条分页展示
- 到期前提醒、已过期提示
