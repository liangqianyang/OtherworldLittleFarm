# 《异界小农场》V3 整洁化 · 音频支撑层规格（v3-clarity-audio-spec）

- 负责成员：Game Audio Engineer（game-audio-engineer）｜日期：2026-11-19｜状态：v1（本轮纯规格，不改代码、不产音频文件）
- 本轮任务：V2 地图「视觉杂乱」诊断 + V3 整洁化重设计。**音频侧立场：视觉做减法后，分区身份由「边界物（视觉通道）+ 区域声景（听觉通道）」双通道承接；音频自身同样执行减法纪律，不加新元素。**
- 上游对齐：`docs/design/audio-design.md`（v1 全量音频规格——BGM 清单/音效表/体积预算/循环要点/AI 提示词**全部沿用有效**，本文不重复其表格）；`world-layout-v2.md` §1 六区几何；`TerrainData.ts:25-32` REGIONS 冻结矩形；`PlayerCharacter.ts:20` 移速 128px/s=4 格/s
- 改动文件路径：仅新增本文档；规格落点给到 `TerrainData.ts`（regionOf）与 v1 接线项 W2（AudioDirector）
- 验证方式：§8 验收清单 A11–A14（接 v1 A1–A10）

---

## 0. 结论速览

| # | 决策 | 结论 |
|---|---|---|
| VA1 | 角色定位 | V3 用「大面积统一基底+边界物」减掉地面纹理噪音后，**区域声景是分区身份的第二通道**：玩家闭着眼也知道自己在林区/湖边/封印地。音频不加码、不加元素——v1 已规划的 5 个程序化垫层按区绑定即可，0 新资产 0 体积增长 |
| VA2 | 绑定方式 | 环境音分区**按功能区绑定（region-keyed），不按坐标矩形**：复用 `TerrainData.ts:25` REGIONS，新增 `regionOf()` 点查询（§3.2 全文规格）。V3 改任何矩形坐标 → 音频代码零改动 |
| VA3 | 水系声景 | 湖/河水声改为**水 tile 邻近触发**（3 格切比雪夫半径，TT.Water 查询），替代 v1 §3.1 的「x30-36 河岸带」硬编码——V3 河流改线/拉直后自动正确 |
| VA4 | 音频密度预算 | 与视觉「每屏纹理 ≤N」同构的听觉预算：**连续可闻层 ≤3**（音乐 1 + 区垫层 1 + 水叠加 0-1）、瞬态点缀 ≤1 并发且间隔 ≥6s、**明确不做「区进入 stinger」**（听觉通道同样要留白） |
| VA5 | 给 V3 几何的音频约束 | 3 条可校验规则（§5）：①独立声景区最小内接矩形 ≥8×8 格；②不同垫层的区之间 ≥2 格共享 field 垫层的缓冲带；③水体不与 living 区直接共边（水声不得渗入睡眠区）。V2 现状已有 1 处共边违例 + 1 处临界（§3.4 证据），V3 重排应顺手修复 |
| VA6 | 降级路径 | 某区若 V3 缩到 <8×8（如 advGate 压缩）→ 该区**不配独立垫层，并入 amb_field**，不阻塞几何提案 |
| VA7 | 交付边界 | 本轮音频：0 新增文件、0 新增提示词（v1 §8 BGM 三首 prompt 仍有效）、体积预算不变（P0=1.38MB / 硬顶 2.2MB / 首包 0 字节，见 v1 §6） |

---

## 1. 为什么音频要接「分区身份」这班岗（论点与证据）

1. **主流参照的共识是「干净=单一基底+边界物」**（协调者调研：teemo.dev 星露谷视觉分析——围栏/树线定义分区而非换地面颜色）。这意味着 V3 之后，视觉通道对「你在哪个区」的表达变弱（这正是目的），需要第二通道补位：**2 秒渐变的声景边界**让玩家用耳朵感知过区，不靠眼睛数地面颜色。
2. **声景边界天然无「拼布感」**：视觉硬边拼接（6 种地面无过渡瓦片）是本轮杂乱主嫌之一；音频 crossfade 是连续渐变，天然没有硬边——它是「过渡瓦片」问题在听觉上的免费解。
3. **不加码纪律**：用户抱怨的是「眼花缭乱」——信息过载。若音频用区进入音效（stinger）补位，等于把过载换个通道。故 VA4 明确 stinger=0；身份感全部由低增益连续垫层承担（增量 < 噪音，符合「元素不多但有特色」的玩家好评词）。

## 2. 现状事实（file:line，2026-11-19 核读）

| # | 事实 | 证据 |
|---|---|---|
| F1 | 六区 REGIONS 冻结矩形常量存在，闭区间语义 | `assets/scripts/gameplay/world/TerrainData.ts:25-32` |
| F2 | **无 regionOf/point-in-region 查询函数**（全仓 grep `regionAt|regionOf` 0 命中）——垫层分区需补此 helper | 同文件 + grep |
| F3 | tile 级水判定现成：`TT.Water=3`，`TerrainData.inst.get(cx,cy)` 越界返回 Water | `TerrainData.ts:19,60-63` |
| F4 | 玩家移速 128px/s = **4 格/s**——渐变时长→行走距离换算依据 | `assets/scripts/gameplay/world/PlayerCharacter.ts:20`（注释原文 `speed = 128; // 4 格/s × 32px`） |
| F5 | AudioDirector/环境音/BGM 代码尚不存在（grep `AudioDirector|amb_|bgm_` 0 命中）——v1 W2 未落码，本规格与其同批排期 | grep |
| F6 | V2 水系几何：湖 20-42/58-71 + 2 格沙环，河 5 段 x30-36 摆动纵贯入湖，桥 x31-37/y39-42 | `TerrainData.ts:35,110-133` |
| F7 | SFX 引擎（SfxLib 程序化合成）已在跑，9 音色 + 事件挂点 | `assets/scripts/core/SfxLib.ts:22-72,124-144`（v1 §1.1 审计） |

## 3. 区域声景规格（V3-proof 绑定）

### 3.1 区→垫层映射（按功能区，非坐标）

| 区（REGIONS 键） | 垫层 | v1 配方 | 备注 |
|---|---|---|---|
| farm / living / advGate / **null（区外草带与全部路网）** | amb_field | 粉噪风+随机鸟鸣 | **默认垫层**：regionOf 返回 null（路网/草带/桥面）一律落 field——路网在听觉上统一，正对 V3「路网简化、基底统一」方向 |
| pioneer | amb_forest | 风噪+叶响+啄木 | 唯一「深林」身份区 |
| fishing | amb_lake | 水浪+水滴 | 湖区全域（含沙环） |
| defense | amb_seal | 55Hz 低鸣+风 | 白天空旷微压迫；夜战时世界垫层停用（v1 §4.1） |
| 夜战板 | amb_night | 虫鸣群 | 随夜战状态机，不随区（v1 已定义） |

### 3.2 regionOf 规格（给架构师，建议放 TerrainData.ts 同文件）

```ts
/** 玩家所在功能区查询（REGIONS 闭区间；供声景分区等系统使用，不引入坐标硬编码） */
export function regionOf(cx: number, cy: number): keyof typeof REGIONS | null {
    for (const k in REGIONS) {
        const r = REGIONS[k as keyof typeof REGIONS];
        if (cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1) return k as keyof typeof REGIONS;
    }
    return null; // 区外=草带/路网 → 调用方落默认 amb_field
}
```

- O(6) 点-矩形测试，**仅跨格时调用**（监听玩家 tile 坐标整数变化），CPU 可忽略。
- 读 `REGIONS` 引用而非复制坐标 → V3 改矩形、terrainSize 守卫重建基线后**自动跟随，音频零代码改动**。

### 3.3 水系叠加层（替代 v1 §3.1 的 x30-36 河岸带硬编码）

| 参数 | 值 | 依据 |
|---|---|---|
| 进入条件 | 以玩家 tile 为中心 3 格切比雪夫半径内存在 `TT.Water`（7×7=49 格扫描，复用 F3 的 get） | 河宽 5 格，3 格半径保证站河岸 1-2 格内必触发 |
| 退出条件 | 同口径距离 ≥5 格 | **2 格迟滞带**：沿河平行行走不抖动 |
| 增益 | lake 配方 ×0.5（相对 ≈0.2），叠于当前垫层之上 | 河是背景水声，湖是主水声 |
| 触发时机 | 跨格事件时计算一次；进入/退出各走 2s crossfade | 层预算见 §4 |

### 3.4 V2 现状垫层邻接核查（V3 几何的对照证据）

```
bed 地图（V2 冻结坐标，非等比示意；B=amb_field  F=amb_forest  L=amb_lake  S=amb_seal）

y4  ┌FFFFFFFFFFFFFF┐        ┌B┐┌SSSSSSSSSSSSSS┐
    │  pioneer  F  │        │B││  defense  S  │
y32 └───────┬──────┘        └─┘└──────────────┘
y32 ┌BBBBBBB┴BBBBBB┐         ↑ advGate B 与 defense S
    │  living  B   │           仅隔 x57 一列草（临界，见下表）
y34 │        ┌BBBBBBBBBBBBBBBB┐
y48 └────────┤    farm  B     │
y56 ┌LLLLLLLL┤                │
y73 └────────┴────────────────┘
     ↑ pioneer↔living 在 y32 / x34-40 直接共边（唯一 F↔B 异垫层共边点）
```

| 相邻对 | 垫层 | 间隔（按坐标推算） | 判定 |
|---|---|---|---|
| pioneer ↔ living | F↔B | **共边**（y32，x34-40 重叠 7 格） | 违例 §5-②（音频侧已由 0.5s debounce 缓解，V3 建议加 ≥2 格草带） |
| advGate ↔ defense | B↔S | 1 列草（x57） | 临界（差 1 格达标） |
| living ↔ fishing | B↔L | 7 行草（y49-55） | ✓ |
| living ↔ defense | B↔S | 不共边（x 间隔 + y 仅角接触） | ✓ |
| pioneer ↔ advGate/farm | F↔B | ≥7 格 | ✓ |
| fishing ↔ pioneer | L↔F | ≥20 格 | ✓ |

## 4. 音频密度预算表（视觉「每屏纹理 ≤N」的听觉同构物）

| 通道 | 上限 | 规则 | 违例表现 |
|---|---|---|---|
| 音乐 | 常驻 1 | 双槽 crossfade（v1 §7.2），fade 交叠 1 小节属过渡非并听 | 两曲并听=混音车祸 |
| 连续环境层 | ≤2 | 区垫层 1 + 水叠加 0-1 | 垫层叠垫层=听觉版拼布 |
| 瞬态点缀（鸟鸣/水滴） | ≤1 并发 | 随机间隔 **8-14s**（v1 配方），任何两声间隔下限 **6s**，±30 音分随机 | 高频点缀=听觉「眼花缭乱」 |
| UI/工具坞点击 | ≤80ms | 增益比世界音效 **-12dB**（右列 4 钮+底 6 槽是高频触点，不能盖过世界） | UI 抢戏 |
| 区进入 stinger | **0** | 明确不做（VA4）；身份感全靠垫层渐变 | 换通道的信息过载 |

## 5. 给 V3 几何的音频侧约束（请纳入 validate-layout-v2.py 校验项，与「大区块」视觉方向同向）

| # | 规则 | 阈值 | 理由（可推翻的假设） |
|---|---|---|---|
| AC1 | 独立垫层区（不同 bed 的区）最小内接矩形 | **≥8×8 格且面积 ≥64 格** | 渐变 2s × 移速 4 格/s = 直穿 8 格才渐变完毕；小于此则 bed「从未听全」，身份感为零。V2 六区全部达标（最小 advGate 9×13） |
| AC2 | 不同 bed 的区之间 | **≥2 格**共享 field 垫层的缓冲（草带/路带），不允许异 bed 直接共边 | 两段 2s 渐变背靠背=声景抽搐。V2 违例 1 处（pioneer↔living）、临界 1 处（advGate↔defense） |
| AC3 | 水体（TT.Water）不得与 living 直接共边 | 异 bed 缓冲同口径（≥2 格） | 水声渗入床区=睡眠区听觉污染；V2 现状 lake↔living 间隔 7 行 ✓，V3 河流改线时守此条 |

- **降级条款**：任一区 V3 后不满足 AC1 → 该区并入 amb_field（VA6），不阻塞几何提案，只损失该区声景身份（advGate 是最可能触发者，其本就与 field 共享「日常」情绪，降级可接受）。

## 6. 实施影响（给架构师/审查者；本轮不改码）

| # | 位置 | 改动 | 量级 |
|---|---|---|---|
| I1 | `TerrainData.ts` | §3.2 regionOf（约 8 行，纯函数） | 极小 |
| I2 | v1-W2 AudioDirector | 增 2 个槽位语义：zone bed 槽（regionOf 驱动 + 0.5s debounce + 2s crossfade）、水叠加槽（§3.3 迟滞逻辑） | 中（并进 W2 原有规格，非新类） |
| I3 | `tools/validate-layout-v2.py` | 增 2 类校验：AC1 最小区尺寸、AC2/AC3 异 bed 间距（REGIONS 数据进 py 或读 json） | 小 |
| I4 | V3 重建回归 | terrainSize 守卫重建基线 → REGIONS 若变 → regionOf 自动跟随，**音频零代码改动**；回归=§8 A11 走区测试重跑 | — |

## 7. 体积与资产影响（结论：零增长）

- 本轮新增垫层（水叠加）为程序化合成，**0 字节**；垫层总数 5→6 个合成配方，均非文件。
- BGM 3 首 / SFX 22 名 / 提示词 3 段，全部沿用 v1 §3/§5/§8，无修订。
- 预算维持：P0=1.38MB，硬顶 2.2MB，首包 0 字节（v1 §6 全表有效）。

## 8. 验收清单（接 v1 A1–A10）

| # | 项 | 验证方法 | 通过标准 |
|---|---|---|---|
| A11 | 区垫层走查 | 出生点向四象限各走 30 格（录音录屏）：穿过 field↔forest/lake/seal 边界；含沿 y32 折返走 pioneer/living 共边段 | 每次过区 2s 渐变可感知不突兀；折返走无 ≤1s 来回抖动（debounce 有效） |
| A12 | 水叠加层 | 沿河（V2 x30-36 带）平行走 20 格 + 横穿桥 + 走湖岸各一次 | 岸边 ≤1s 水声浮现；平行行走无抽搐（迟滞有效）；湖中心水声满幅 |
| A13 | 层预算压测 | 夜战全程 + 连续捡 10 件掉落 + 连点工具坞 | 连续层 ≤3；点缀间隔 ≥6s；无削波无叠音爆 |
| A14 | 听觉留白挂机 | 出生点挂机 3min 不操作 | 可闻元素：BGM+field 垫层+偶发点缀 ≤1 并发；无任何 stinger |
| A15 | V3 重建回归 | V3 几何合入后重跑 A11/A12 | 不改音频代码即全部通过（regionOf/水查询均数据驱动） |

## 9. 风险登记（每条含位置/触发/影响/验证/最小修复+回归）

| # | 类型 | 风险 | 位置 | 触发 | 影响 | 验证 | 最小修复+回归 |
|---|---|---|---|---|---|---|---|
| RA1 | **已复现**（grep 证据） | AudioDirector/垫层代码不存在，v1-W2 未落码——本规格无载体 | 全仓 grep `AudioDirector` 0 命中（F5） | W2 不排期 | 区域声景整体缺位，VA1 落空 | 构建后 grep AudioDirector | W2 与本规格同批排期；回归=A11 |
| RA2 | 潜在 | V3 若拆分 TT.Water 语义（如拆 River/Lake 枚举），水叠加判定漏判 | `TerrainData.ts:19` TT 枚举 | V3 贴图类型重构 | 河湖无声或全图误触 | A12 | 判定改为枚举集合 `WATER_TT=[TT.Water,...]` 单点收口；回归=A12 |
| RA3 | **已复现**（坐标推算） | 异 bed 区直接共边（pioneer↔living 于 y32/x34-40）→ 边界折返走垫层抖动 | `TerrainData.ts:28-29` | 沿该边 zigzag 行走 | 声景抽搐=听觉版「眼花缭乱」，与本轮目标背道而驰 | A11 折返子项 | 音频侧 0.5s debounce（规格已含）兜底；几何侧 V3 加 ≥2 格草带（AC2）；回归=A11 |
| RA4 | 未验证 | 程序化水声/虫鸣在 iOS 真机 WebAudio 的质感与 CPU | 合成配方（v1 §3.1） | 真机首启 | 垫层廉价感/低端机 CPU 尖峰 | A12+A13 真机执行 | P2 文件化 +0.7MB 需重审预算（v1 R8 同源）；回归=重跑 A12 |
| RA5 | 假设 | advGate 若 V3 缩到 <8×8，其垫层从未听全 | `TerrainData.ts:31` | V3 压缩副本门区 | advGate 无声景身份 | 量 V3 坐标即验 | 降级并入 amb_field（VA6 预定义路径），无阻塞；回归=A15 |

## 10. Handoff

**→ level-designer**：§5 三条音频几何约束（AC1/AC2/AC3）请纳入 V3 几何提案与 validate-layout-v2.py 校验（I3）；§3.4 两处 V2 违例/临界点（pioneer↔living 共边、advGate↔defense 1 列间隔）请在重排时顺手满足 AC2。
**→ engineering-software-architect**：I1 regionOf 全文规格可直接采用；I2 并入 v1-W2 排期确认（RA1 是本规格唯一前置依赖）；`farmChanged` 通道债不影响本规格（垫层走 regionOf 不走事件）。
**→ engineering-code-reviewer**：回归项=A11–A15（§8），请并入 V3 回归清单；A11 折返子项是 RA3 的专项验证。
**→ game-designer**：两处拍板项——①「不做区进入 stinger」（VA4）是否接受；②advGate 降级并入 field 的路径（VA6）是否接受。
**→ engineering-wechat-mini-program-developer**：A12/A13/A14 真机项请进 `docs/testing/device-test-checklist.md`。
**→ coordinator**：本轮音频零新增资产/提示词/体积；v1 §8 三首 BGM prompt 与全部预算表继续有效，无需重生成。
**未覆盖/明确不做**：区进入 stinger、3D 空间化垫层（v1 已否）、V3 专用新 BGM（区域身份由垫层承担，不加曲目）。
