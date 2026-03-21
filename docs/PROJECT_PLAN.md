# 《抽卡模拟器》技术架构与计划 (V2 新版)

## 核心设计理念 (Pivot)
应用户要求，从“对抗不断膨胀的债务系统(类似小丑牌)”修改为**“正反馈递增的解压解锁系统”**：
1. **取消还债系统**：玩家不再面临每 X 轮必须上交 Y 资金的生存压力。
2. **解锁阈值系统**：更高阶、更强力的卡包不再默认开放，而是需要玩家在本局游戏中“历史最高余额(`maxCoinsThisRun`)”达到特定数值时自动解锁。
3. **精准数学期望**：界面卖出按钮直接向玩家显示操作后的精确金币收益(`sellAllPendingValue` / `collectNewAndSellRestValue`)，避免玩家心算。
4. **分包羁绊系统**：收集齐“**某个特定卡包内某类卡牌**”(如新手包全R卡，海洋包全鱼类)可永久获得特定羁绊(全局收益/特定包收益)。
5. **局外天赋/狂热点系统 (Meta Progression)**：游戏失败(破产)后，根据本局表现(最高资金)奖励狂热点。狂热点与图鉴(`library`)随 `localStorage` 永久保留，供下一次游戏使用。

## 系统架构
前端：Vue 3 (Composition API) 
构建：Vite
状态管理：Pinia + LocalStorage Hook
样式：Tailwind CSS v4 (flow-based, 适配竖屏移动端)

### 引擎分离架构
*   **GachaEngine (核心逻辑)**：纯粹的数学实现，处理 PRNG、权重选取和金币计算。
*   **EffectManager (效果系统)**：基于拦截器(Proxy)模式设计的中转站。允许动态注入 `Modifier`(修饰器)，拦截 `pull_rate`、`card_value`、`pull_price`、`pull_refund`。
*   **Pinia Store (桥接)**：衔接 Vue UI 和 Engine 实例计算逻辑，维护游戏会话和本地存储。

## 数据结构字典

### PackConfig (卡包定义)
*   `id`: `string` - 卡包唯一标识符 (例如 `pack_pity`, `pack_ocean`)。
*   `name`: `string` - 卡包展示名称。
*   `basePrice`: `number` - 单抽价格。
*   `rates`: `Record<Rarity, number>` - 抽出各种稀有度的百分比。
*   `unlockThreshold`: `number` - **(新)** 本局内 `maxCoinsThisRun` 必须达到的数值才能开放购买。

### CardConfig (卡牌定义)
*   `id`: `string` - 卡牌唯一标识符。
*   `packId`: `string` - 这张卡所属的卡包，用于触发分包羁绊。
*   `name`: `string` - 卡牌名称。
*   `rarity`: `Rarity` - 稀有度。
*   `baseValue`: `number` - 默认卖出价格。
*   `tags`: `string[]` - **(新)** 用于羁绊检索的特殊标签 (如 `["fish"]`)。

### Modifier (全局拦截修饰器)
*   支持修改字段：`pull_rate` / `card_value` / `pull_price` / `pull_refund` (新)。

## 当前开发进度

- [x] 搭建基础 Vite + Vue 开发环境。
- [x] 配置 Tailwind CSS V4。
- [x] 实现 GachaEngine 和 EffectManager。
- [x] 编写 MockData 卡包和卡牌 (UTF-8 修复，加入 `pack_pity`, `pack_forest`, `pack_ocean`, `pack_fire` 体系)。
- [x] 编写 Pinia Store，移除 `The Debt`，接入 `unlockThreshold` 和 `localStorage` 存档系统。
- [x] `App.vue` UI 重构：新增计算属性 `sellAllPendingValue` 挂载到按钮。
- [x] `App.vue` UI 重构：依据卡包隔离来显示左下角的“羁绊图鉴”。
- [x] 实现 "放弃重开" 并结算 `metaPoints`。

## 下一步工作推荐（供未来迭代参考）
1. **天赋树面板**：在开始界面或独立弹窗，消耗 `store.metaPoints` 去购买永久的初始资金或引擎常驻修饰器。
2. **音效与动画**：增加翻卡动画、金币掉落音效和出金 (SSR) 的震屏特效。
3. **卡牌美术生成**：将纯文字的卡牌替换为带图框和插图的复杂组件。