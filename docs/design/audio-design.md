# 《异界小农场》音频设计（audio-design v1）

- 负责成员：Game Audio Engineer（game-audio-engineer）｜日期：2026-11-18｜状态：v1（设计产出，本轮不改代码）
- 上游对齐：`game-design-draft.md` §13（MVP 必含）/§17（咬钩三重提示）/§18（资源与音频制作规范）/§19（平台硬约束）；`world-layout-v2.md` §1 六区几何（环境音分区依据）；`assets/data/catalogs/defense_maps.json`（夜战板）；`layout-v2-pacing.md` §7（D4/D8/D10 节奏钩子）
- 改动文件路径：仅新增本文档。代码与音频文件落盘由协调者统一排期（见 §10 接线清单）
- 验证方式：§9 验收清单（真机 + 构建.size 统计 + 双循环试听）

---

## 0. 结论速览

| # | 决策 | 结论 |
|---|---|---|
| D1 | 风格定位 | 温暖奇幻像素；三层质感分层：SFX=纯 8-bit 程序化合成（0 字节，延续 SfxLib），BGM=chiptune 旋律层+现代柔和伴奏混合，环境音=程序化合成垫层（0 字节，文件化为 P2 备选） |
| D2 | BGM 数量与预算 | **3 首无缝循环**（白天 60s / 夜+副本复用 60s / 防守夜战 56s），MP3 64kbps CBR 单声道 ≈**1.4MB**；质感不足再升 96kbps（硬顶 2.2MB）——正好落在 §18「BGM 2-3 首 mp3 64-96kbps 单声道」规范内 |
| D3 | 包体策略 | **首包 0 字节音频**（§18「启动只进农场，剩余音频全部分包」严格执行；启动即世界图，BGM 在分包就绪后淡入，就绪前静音可接受）；音频全部走分包，总占用 ≈1.4-1.7MB，对任务上限 20MB 与 §13 首包 ≤4MB 无压力 |
| D4 | 循环与切换 | 全部曲目渲染为**整数小节的无缝整文件循环**（引擎 loop=true 原生循环，不依赖 loopStart/loopEnd）；跨曲切换在**当前曲小节边界**触发 + 1 小节 crossfade（1.5-2.5s）；夜战开始例外允许 0.3s 快速淡入的近似硬切（战斗入场属设计明确的例外） |
| D5 | 架构 | 新增 `AudioDirector`（音乐双槽 crossfade + 环境音单槽 + 总线音量），SfxLib 保留为 SFX 引擎并扩展音效名；**AudioContext 获取改走平台适配层**（SfxLib.ts:26 现直取 globalThis，违反平台层原则，TapTap 运行时未验证） |
| D6 | 音量设置 | §13 把「音量设置」列为 MVP 必含项，但 SettingsPanel 现无任何音频控件（grep 0 命中）、SfxLib.setMasterGain 无 UI 调用方——列为 **P0 补齐**：BGM/SFX 两滑杆 + 持久化 |

---

## 1. 现状审计（全部 file:line 级，2026-11-18 核读）

### 1.1 已实现：SfxLib 零素材合成音效（`assets/scripts/core/SfxLib.ts`）

- 架构：单例 + 惰性 AudioContext（:22-37）+ masterGain 0.5（:17）+ setMuted/setMasterGain（:39-47）
- 音色库 9 个（:61-72）：plant/water/harvest/coin/hit/bite/win/lose/deny（振荡器 _blip、琶音 _arp、带通噪声 _noise）
- 事件挂点（:124-144）：farmChanged 的 plant/water/harvest/plant_offseason→deny、adventure_win→win、adventure_defeat→lose；itemGained(gold)→coin；itemSpent(fail)→deny
- 直接调用方：FishingPanel.ts:149,152,165（harvest/deny/bite）、DungeonOverlay.ts:408,474（deny/bite）、DecorPanel.ts:94（deny）、CodexPanel.ts:72,117（deny/bite）
- 启动接线：GameApp.ts:88 一次性 bindEvents()

### 1.2 缺口清单（音效表 §5 的依据）

| # | 缺口 | 证据 |
|---|---|---|
| G1 | **防守夜战全程无音效**：defense_start/spawn/kill/wave_break/leak/hit 均无绑定；且 SfxLib.ts:134 注释称「胜负音效由 DefenseOverlay 自己发」，但 DefenseOverlay.ts grep `play(|SfxLib` **0 命中**——注释过时，defense_win/defense_end 实际无声 | DefenseSystem.ts:176,196,206,210,213,250,263 全部 emit 无消费者 |
| G2 | `hit` 音效是死代码：bindEvents 未映射 adventure_hurt（:131 明确 break），全仓无 play('hit') 调用 | SfxLib.ts:66,131 |
| G3 | 钓鱼结算语义错位：fish_caught 用 harvest 顶替、fish_miss/fish_early 用 deny 顶替 | FishingPanel.ts:149,152 |
| G4 | `deny` 语义过载：被 DecorPanel/CodexPanel/DungeonOverlay 当通用「操作反馈」使用 | 1.1 调用方列表 |
| G5 | 世界层无声：world_cleared（砍/采完成）、world_pickup、world_regrow、weapon_upgraded 无音 | ClearingSystem.ts:131,173、DroppedItem.ts:90、AdventureSystem.ts:221 |
| G6 | 节奏钩子无声：bedtime（睡觉）、dayAdvanced（新一天）、adventure_combat_start/adventure_settled/adventure_flee 无音 | BedtimeDialog.ts:118、TimeSystem.ts:67,83、AdventureSystem.ts:151,236,280 |
| G7 | **无 BGM、无环境音、无音频总线** | 全仓无音乐播放代码 |
| G8 | **音量设置缺失**（§13 必含项未实现；SfxLib 注释自认「二期」） | SettingsPanel.ts grep 0 命中；SfxLib.ts:8 |
| G9 | AudioContext 直取 globalThis（:26），绕过 `assets/scripts/platform/` 适配层（IPlatformAdapter.ts 无 audio 能力定义）；TapTap 运行时是否注入同名全局**未验证** | SfxLib.ts:26、IPlatformAdapter.ts:33-45 |

### 1.3 六区环境音分区依据（`world-layout-v2.md` §1 冻结矩形）

living(34-56/32-48)、farm(56-84/34-62)、pioneer(4-40/4-32 林)、fishing(18-44/56-73 湖)、defense(58-90/6-32)、advGate(48-56/14-26)。河 x30-36 纵贯 + 庭院造桥段 x34-36/y32-44（活水声教学点）。夜战发生在独立 15×9 板（seal_1），世界层 defense 区平时为安静开阔地——**同一区两套声景**：白天开阔风声垫层 vs 夜战战斗音乐（见 §4 状态机）。

---

## 2. 风格定位

- **三个形容词**：温暖（warm）、奇幻（whimsical）、像素（chip-touched）
- **参照系**：星露谷原声的 lo-fi 田园温暖感（旋律优先、音色柔）× 现代独立游戏 chiptune 混合手法（方波/三角波 lead 叠 soft pad 与轻打击乐，不做纯 FC 复古）
- **分层质感**：
  | 层 | 质感 | 成本 |
  |---|---|---|
  | SFX | 纯 8-bit 合成（方波/三角/锯齿+噪声），与像素画风天然同源 | 0 字节 |
  | BGM | chiptune lead + 现代 pad/拨弦伴奏；旋律五声音阶为主保「异界田园」亲和力 | ≈1.4MB |
  | 环境音 | 程序化合成垫层（滤波噪声风声/虫鸣振荡器），音量低、可无限循环不疲劳 | 0 字节 |
- **混音底线**：master 0.5（SfxLib 现值）；总线建议 music 0.6 / ambience 0.4 / sfx 0.9 相对增益；响度目标 -16 LUFS（移动端），true peak ≤ -1 dBTP；SFX 不得被 BGM 掩盖——BGM 混音时 SFX 频段（2-6kHz 瞬态区）留空

---

## 3. BGM 资产清单（曲目名/时长/循环点/情绪标签）

> 时长按整数小节推导（4/4 拍，小节长=240/BPM 秒），保证整文件无缝循环。循环点=文件首尾（无独立 loopStart）。

| # | 曲目 | 文件 | BPM | 小节 | 时长 | 循环点 | 调性 | 情绪标签 | 使用场景 | 分包 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 田埂上的四季 / Four Roads From the Plaza | `bgm_farm_day.mp3` | 96 | 24 | **60.0s** | 整文件无缝 | G 大调五声 | 平静/日常/温暖 | 世界图白天（启动即世界图，兼作标题曲） | assets-audio |
| 2 | 封印的低语 / Whispers of the Seal | `bgm_farm_night.mp3` | 84 | 21 | **60.0s** | 整文件无缝 | A 小调 | 静谧/微不安/神秘 | 世界图防守预告日（day%4==0 前夜）、副本（旧林地复用） | assets-audio |
| 3 | 夜潮拍岸 / Tide Against the Seal | `bgm_defense.mp3` | 120 | 28 | **56.0s** | 整文件无缝 | D 小调 | 紧张/坚决/守护 | 夜战（seal_1 板全程） | assets-audio |

- **预算**：64kbps CBR mono ≈ 8KB/s → 176s ≈ **1.38MB**；如试听质感不足升 96kbps（≈2.06MB，硬顶 2.2MB）。禁止 VBR（小游戏解码器兼容性优先 CBR）。
- **副本音乐说明**：MVP 副本（旧林地 5-7 房）情绪=神秘探险，与曲 2「静谧微不安」重叠，**复用曲 2 零额外成本**；专用 `bgm_dungeon` 列为素材扩展期 P2（届时曲 4 建议 100 BPM E 多利亚 21 小节=50.4s）。
- **胜利/失败 jingle 不做文件**：复用 SfxLib `win`/`lose` 琶音扩展版（+尾音长版 win_long/lose_long，合成 0 字节），符合 §18「音效总量 ≤1MB」精神（实际 0 字节）。
- **明确不做**：曲内垂直分层（stems 体积翻倍且小游戏无总线自动化）；P2 若需强度递进，用「同曲两版（基础版/加打击乐版）按波次切换」替代，代价 +0.45MB，仅当 playtest 反馈夜战单调才立项。

## 3.1 环境音清单（程序化合成，0 字节）

| # | 垫层 | 合成配方（WebAudio） | 挂区（world-layout-v2 §1 矩形） | 切换 |
|---|---|---|---|---|
| 1 | amb_field 田野 | 粉噪声 lowpass 400Hz 风（增益 0.05 LFO 起伏）+ 随机鸟鸣（短正弦滑音包络，8-14s 随机间隔） | farm / living / advGate | 2s crossfade |
| 2 | amb_forest 林地 | 噪声风（lowpass 300Hz）+ 叶响（bandpass 2-4kHz 短脉冲）+ 偶发啄木（低频 knock ×2-3） | pioneer | 2s |
| 3 | amb_lake 湖岸 | 水浪（噪声 lowpass 800Hz 0.3Hz LFO）+ 偶发水滴（4kHz 点音） | fishing + 河岸带（x30-36 ±2） | 2s |
| 4 | amb_defense_zone 封印区 | 低频嗡鸣（55Hz 正弦极低增益）+ 风——白天空旷微压迫感 | defense（白天） | 2s |
| 5 | amb_night 夜虫 | 5-6kHz 脉冲振荡虫鸣群 + 极低风——夜战进行时被 bgm_defense 掩盖，仅波间休整可闻 | 夜战板（defense_wave_break 时抬升） | 随夜战状态机 |

- 环境音**不做 3D 空间化**：俯视农场全局垫层即可（玩家一屏跨 20×11 tile，位置衰减收益低、成本高）；zone 判定复用 TerrainData REGIONS。
- P2 文件化备选：若合成虫鸣/水声试听不达标，改 3×32s 48kbps mono 文件 ≈ +0.7MB，**需重审预算后再立项**。

## 3.2 音频目录参数表（与 assets/data/catalogs 结构对齐，可直接落盘 `assets/data/catalogs/audio.json`）

```json
[
  { "id": "bgm_farm_day",   "kind": "music",    "file": "subpkg/audio/bgm_farm_day.mp3",   "durationSec": 60, "bpm": 96,  "bars": 24, "loop": "file",  "codec": "mp3-64k-mono", "emotion": ["calm","daily","warm"],       "scenes": ["world_day", "boot"] },
  { "id": "bgm_farm_night", "kind": "music",    "file": "subpkg/audio/bgm_farm_night.mp3", "durationSec": 60, "bpm": 84,  "bars": 21, "loop": "file",  "codec": "mp3-64k-mono", "emotion": ["quiet","unease","mystery"],  "scenes": ["world_night_forewarn", "dungeon"] },
  { "id": "bgm_defense",    "kind": "music",    "file": "subpkg/audio/bgm_defense.mp3",    "durationSec": 56, "bpm": 120, "bars": 28, "loop": "file",  "codec": "mp3-64k-mono", "emotion": ["tense","resolve"],           "scenes": ["defense_night"] },
  { "id": "amb_field",      "kind": "ambience", "file": "procedural:field",                "loop": "synth",   "gain": 0.4, "regions": ["farm","living","advGate"], "fadeSec": 2 },
  { "id": "amb_forest",     "kind": "ambience", "file": "procedural:forest",               "loop": "synth",   "gain": 0.4, "regions": ["pioneer"],                 "fadeSec": 2 },
  { "id": "amb_lake",       "kind": "ambience", "file": "procedural:lake",                 "loop": "synth",   "gain": 0.4, "regions": ["fishing"],                 "fadeSec": 2 },
  { "id": "amb_seal",       "kind": "ambience", "file": "procedural:seal",                 "loop": "synth",   "gain": 0.35,"regions": ["defense"],                 "fadeSec": 2 }
]
```

---

## 4. 音乐/环境音状态机与实现要点

### 4.1 音乐状态机（驱动源=既有 EventBus，零新事件）

| 状态 | 进入事件 | 曲目 | 退出→ |
|---|---|---|---|
| WORLD_DAY | 默认 / defense_win / defense_end / adventure_settled | bgm_farm_day | — |
| WORLD_FOREWARN | dayAdvanced 且 dayIndex%4==0 前夜（守门人预告日，pacing §7 D4/D8 节拍） | bgm_farm_night | WORLD_DAY（次日床睡后） |
| DUNGEON | adventure_start | bgm_farm_night | adventure_settled → WORLD_DAY |
| DEFENSE | defense_start | bgm_defense | defense_win/defense_end → WORLD_DAY |

- 环境音并行独立：按所在区叠 amb_*（夜战中停用世界环境音，波间 amb_night 可闻）。
- **切换规则**：状态切换在**当前曲小节边界**触发（用 `audioCtx.currentTime - trackStartSec` 对 `240/bpm` 取模求等待时长），随后 1 小节 crossfade（96BPM=2.5s / 84BPM=2.857s / 120BPM=2.0s）；**例外**：defense_start 允许立即切（0.3s 快速淡入近似硬切）——战斗入场不可等待 2.8s，属设计明确的例外。

### 4.2 AudioDirector（新增类，规格级，实施归架构师）

```
职责：音乐双槽（musicA/musicB crossfade）+ 环境音单槽 + 音量总线（music/amb/sfx）+ 生命周期
数据：由 §3.2 audio.json 驱动；双 AudioBufferSource（Web）或双 AudioSource（引擎）均可
接线：
  - GameApp 启动经 adapter.onHide/onShow 挂 suspend/resume（IPlatformAdapter.ts:37-40 现成钩子，切后台静音省电、回前台恢复）
  - 首次 TOUCH_END（任意屏幕点击）后 startMusic——AudioContext 自动播放策略：SfxLib.ts:58-60 只在 play 时 resume，音乐需主动触发点
  - 音量面板（§5 P0）写 settings 切片 → AudioDirector.setBusVolume('music'|'sfx', 0..1) → SaveManager 持久化
```

### 4.3 SFX 并发控制（防止削波与听觉疲劳）

- 同名音效节流：同名 <60ms 内重复触发直接吞掉（defense_kill 连杀、world_pickup 连捡是高频场景）
- SFX 同帧上限：8 个并发振荡器（现有 _blip 每次新建节点，天然可并发，但需上限防 iOS 低端机 CPU 尖峰）
- 频率错开原则：同类事件不同音高微随机（±30 音分），「nothing sounds identical twice」

---

## 5. 音效表（事件→音效映射，对齐 EventBus 真实词汇）

> 「现有/新增」指 SfxLib `play(name)` 名字。优先级：P0=MVP 必做，P1=首周补齐，P2=素材扩展期。

### 5.1 农田与世界（farmChanged / 世界事件）

| 事件 | payload.action | 音效名 | 状态 | 合成描述（8-bit） | 优先级 |
|---|---|---|---|---|---|
| farmChanged | plant | plant | 现有✓ | 220Hz 方波 blip | — |
| farmChanged | water | water | 现有✓ | 带通噪声 900Hz | — |
| farmChanged | harvest | harvest | 现有✓ | 440→880 三角波双音 | — |
| farmChanged | plant_offseason | deny | 现有✓ | 160Hz 方波 | — |
| farmChanged | world_cleared（砍/采完成） | **chop / mine**（需 payload 补 kind，见 §10） | **新增** | chop=方波瞬态+噪声尾（树）；mine=高频 click+石质短混响感（石）；灌木=pickup 变体 | **P0** |
| farmChanged | world_pickup | **pickup** | **新增** | 短双音上行（coin 低音量变体） | **P0** |
| farmChanged | world_regrow | regrow | 新增 | 柔和低音 blip（P2 可静默） | P2 |
| farmChanged | bedtime | **sleep** | **新增** | 下行柔和琶音（3 音，三角波） | **P0** |
| dayAdvanced | — | **day_chime** | **新增** | 上行三音温柔钟（bindEvents 补挂） | **P0** |
| farmChanged | pause_on / pause_off | ui_toggle | 新增 | 短 click（开=上行/关=下行微变） | P1 |
| farmChanged | grow / sprites_ready / build_closed / seal_changed | 静默 | 设计决定 | 生长无声（视觉已表达）；seal_changed 见 §5.2 | — |

### 5.2 防守夜战（DefenseSystem 现有 7 个 action 全部补音）

| 事件 | action | 音效名 | 状态 | 合成描述 | 优先级 |
|---|---|---|---|---|---|
| farmChanged | seal_changed（布防放置） | **seal_place** | **新增** | 低频石质 thunk + 上行确认音 | **P0** |
| farmChanged | defense_start | **defense_start** | **新增** | 号角式锯齿上行 + 两声鼓点；同时切 bgm_defense | **P0** |
| farmChanged | defense_spawn | **enemy_spawn** | **新增** | 短噪声爆 + pitch 下滑（滑稽感不做恐怖感，§19 内容红线） | **P0** |
| farmChanged | defense_kill | **enemy_die** | **新增** | pop + 下行 blip（±30 音分随机） | **P0** |
| farmChanged | defense_hit | **altar_hit** | **新增** | 闷响 + 轻失谐（祭坛受击警告感） | **P0** |
| farmChanged | defense_leak | **defense_leak** | **新增** | 警报双音（对应 ui/alert #FF6060 的听觉色） | **P0** |
| farmChanged | defense_wave_break | wave_break | 新增 | 中性双音提示（波间休整） | P1 |
| farmChanged | defense_win | **win（现有，扩长尾 win_long）** | **新增绑定**（现无任何绑定） | 琶音上行+尾音 | **P0** |
| farmChanged | defense_end | **lose（现有，扩 lose_long）** | **新增绑定**（同上） | 琶音下行 | **P0** |

> G1 关键修复点：SfxLib.ts:134 对 `defense_settled` 的注释「胜负音效由 DefenseOverlay 自己发」与实际不符（DefenseOverlay 无 play 调用），且 DefenseSystem 实际发的是 `defense_win`/`defense_end`（:213）而非 `defense_settled`——绑定错位双重落空。

### 5.3 钓鱼 / 副本 / 经济

| 事件 | action / 现状 | 音效名 | 状态 | 说明 | 优先级 |
|---|---|---|---|---|---|
| farmChanged | fish_caught | **catch_splash** | **新增**（现由 FishingPanel 直接播 harvest 顶替） | 水花噪声+上行琶音；§17 咬钩三重提示的音效位=bite（现有✓） | P1 |
| farmChanged | fish_miss / fish_early | fish_miss | 新增（现顶替为 deny） | 短下滑+轻噪声（失败零惩罚→音效也轻，不惩罚） | P1 |
| farmChanged | adventure_combat_start | battle_cry | 新增 | 短鼓+号角（复用 defense_start 低配版） | P1 |
| farmChanged | adventure_hurt | **hit（唤醒死代码 G2）** | **新增绑定** | 110Hz 锯齿（现有音色直接复用） | **P0** |
| farmChanged | adventure_kill | enemy_die（复用） | 新增绑定 | 同 §5.2 | **P0** |
| farmChanged | adventure_gather | pickup（复用） | 新增绑定 | 同 §5.1 | P1 |
| farmChanged | weapon_upgraded | weapon_up | 新增 | 金属质感方波双音上行 | P1 |
| farmChanged | adventure_flee | retreat | 新增 | 下行双音 | P2 |
| farmChanged | adventure_settled | ledger | 新增 | 纸感短噪声 + coin | P1 |
| farmChanged | adventure_win / adventure_defeat | win / lose | 现有✓ | — | — |
| itemGained | gold | coin | 现有✓ | — | — |
| itemSpent | fail=true | deny | 现有✓ | — | — |

### 5.4 UI 音效拆分（修复 deny 语义过载 G4）

| 触发 | 现状 | 改为 | 优先级 |
|---|---|---|---|
| 面板打开（Backpack/Decor/Codex/Build/Dialog 等） | 无声 | **ui_open**（上行短音） | P1 |
| 面板关闭 | 无声 | **ui_close**（下行短音） | P1 |
| 通用按钮按下 | 无声 | **ui_click**（5ms click，≤80ms 反馈配对 ui-notes §3.1 按下反馈规范） | **P0** |
| 操作被拒（材料不足/越界/夜间禁放） | deny（语义正确处保留） | deny 保留**纯拒绝语义** | — |
| 顶替 deny 的三处调用（DecorPanel.ts:94、CodexPanel.ts:72、DungeonOverlay.ts:408） | deny | 改 ui_click（它们是「面板反馈」不是「拒绝」） | **P0** |
| saveCompleted | 无声 | **保持静默**（存档不打扰，设计决定） | — |
| interactPromptChanged（情境按钮出现） | 无声 | **保持静默**（高频出现，发声=听觉疲劳） | — |

### 5.5 SFX 总量核算

全部走程序化合成：**0 字节**，远低于 §18「音效总量 ≤1MB」。P2 若个别音色（如水花）需要采样替换：单文件 ≤0.15s、WAV→MP3 128k mono ≈2.4KB/个，替换上限 20 个 ≈48KB，不触碰预算。

---

## 6. 体积预算表（对齐 20MB 任务上限 / §13 首包 ≤4MB / §18 内部规范）

| 项 | 格式 | 时长/数量 | 码率 | 体积 | 包位置 |
|---|---|---|---|---|---|
| BGM | MP3 64kbps **CBR mono** 44.1kHz | 3 首 / 176s | 64kbps | **≈1.38MB** | 全部分包（assets-audio bundle） |
| BGM 升级余量 | 同上 | 同上 | 96kbps | ≈2.06MB（硬顶 2.2MB） | 分包 |
| SFX | 程序化合成 | 22 个名字 | — | **0 字节** | — |
| 环境音 | 程序化合成 | 5 垫层 | — | **0 字节** | — |
| 环境音 P2 备选 | MP3 48kbps mono | 3×32s | 48kbps | +0.7MB（需重审） | 分包 |
| **音频合计** | | | | **P0=1.38MB（上限 2.2MB）** | 首包 **0 字节** |

- 与约束核对：任务上限 20MB ✓（占比 <11%）；§13 首包 ≤4MB ✓（音频 0 占用）；§18「BGM 2-3 首 mp3 64-96kbps 单声道放分包」✓（取 3 首 64kbps 全分包）；§18「音效总量 ≤1MB」✓（0 字节）。
- **首包 0 字节策略的体验代价**：冷启动→分包就绪前世界图无 BGM（预期 1-3s，加载画面本就无声，可接受）；分包失败时静音运行不阻塞玩法（音频是增广层，非功能层）。
- iOS 格式风险沿用 §18 原文：「iOS 端音频格式需真机实测后统一」——MP3 是 iOS WebAudio 原生可解码格式，风险低，但真机验证列入 §9。

---

## 7. 循环 / 淡入淡出实现要点（给架构师的规格）

1. **无缝循环靠制作不靠代码**：每首曲渲染为整数小节（§3 表），首尾波形对齐（长 pad/混响尾在渲染时折返或收干净），引擎 `loop=true` 整文件循环。Cocos AudioSource 不暴露 loopStart/loopEnd，不做接缝代码 hack。
2. **crossfade 双槽**：AudioDirector 持 musicA/musicB 两实例，切曲时旧槽 gain 1→0、新槽 0→1 线性 ramp 1 小节时长；ramp 用逐帧 lerp 或 scheduler tween（小游戏无 Web Audio 自动化保证时，逐帧最稳）。
3. **量化切换**：switchTrack(name) 先算 `waitSec = barDur - ((ctxTime - trackStart) % barDur)`，setTimeout 后启动 crossfade；defense_start 例外 waitSec=0、fade=0.3s。
4. **自动播放策略**：AudioContext 必须在用户手势后 resume（SfxLib 已有 resume 逻辑 :58-60）；BGM 启动点=首次任意 TOUCH_END（玩家第一次点屏即响，符合「进场即玩」§17）。
5. **生命周期**：adapter.onHide → suspend 全部（省电+防后台漏音）；onShow → resume。钩子已存在（IPlatformAdapter.ts:37-40）。
6. **循环疲劳防线**：白天曲 60s 内 A/A' 变奏结构（8 小节旋律 ×2 变体），无打击乐强循环钩子；环境音层随机化鸟鸣/水滴间隔（8-14s 随机）——两案叠加可支撑 30 分钟+会话不腻。
7. **音量持久化**：settings 切片存 `audio.music`/`audio.sfx`（0-100），启动读入后 setBusVolume；静音钮=两滑杆归零快捷态。

---

## 8. AI 生成提示词（素材阶段规格；落文件由协调者排期）

> 平台适配：Suno v4 / Stable Audio 2.x / 天工 SkyMusic 均可；像素游戏曲建议 Suno（结构可控）或 Stable Audio 2（instrumental 纯度高）。生成后必须经 §8.2 后期流程才能入库。

### 8.1 三首 BGM 提示词（中英双语）

**曲 1 田埂上的四季 / bgm_farm_day（96 BPM, G 大调五声, 24 小节=60s）**
```
中文：温暖奇幻农场游戏背景音乐，纯器乐无人声；明亮的 chiptune 方波主旋律叠加柔和的现代
拨弦吉他与软 pad 伴奏；G 大调五声音阶；96 BPM；木吉他质感与 8-bit 音色融合；情绪平静、
日常、治愈；轻快但不急躁；鼓组极轻（刷子质感）；24 小节整，首尾无缝循环（结尾直接接回开头）。
English: warm fantasy farming game BGM, instrumental only, no vocals; bright chiptune square-wave
lead over soft modern plucked guitar and gentle pads; G major pentatonic; 96 BPM; acoustic + 8-bit
hybrid texture; calm, cozy, everyday-life mood; light brush-percussion only; exactly 24 bars,
seamless loop (ending flows back into the beginning).
负面 Negative: vocals, lyrics, dark, horror, epicles, drums heavy, dubstep, sudden ending, fade-out,
tape hiss, key change, tempo change
```

**曲 2 封印的低语 / bgm_farm_night（84 BPM, A 小调, 21 小节=60s）**
```
中文：静谧奇幻夜晚背景音乐，纯器乐；三角波 chiptune 旋律稀疏点缀，弦乐软 pad 与夜虫质感
合成音铺底；A 小调；84 BPM；情绪安静、微不安、神秘但不恐怖；21 小节整，首尾无缝循环。
English: quiet fantasy night BGM, instrumental; sparse triangle-wave chiptune melody over soft
string pads and subtle synth cricket texture; A minor; 84 BPM; calm with a hint of unease and
mystery, never horror; exactly 21 bars, seamless loop.
负面 Negative: vocals, horror, jump scare, dissonant clusters, drums, fade-out, sudden ending
```

**曲 3 夜潮拍岸 / bgm_defense（120 BPM, D 小调, 28 小节=56s）**
```
中文：像素塔防夜战背景音乐，纯器乐；决坚的 chiptune 方波号角式旋律 + 方波贝斯 + 节奏感
明确的鼓组（军鼓+kick）；D 小调；120 BPM；紧张、坚决、守护感，可循环长时间听不疲劳；
中段留 4 小节弱拍间奏供波次休整呼吸；28 小节整，首尾无缝循环。
English: pixel tower-defense night battle BGM, instrumental; determined chiptune square-wave
horn-style lead + square bass + steady drum kit (snare+kick); D minor; 120 BPM; tense, resolute,
protective; loop-friendly for long sessions; 4-bar stripped breakdown section mid-way for wave
breathers; exactly 28 bars, seamless loop.
负面 Negative: vocals, epic orchestral, metal, horror, chaotic blast beats, fade-out, sudden ending
```

### 8.2 生成后期流程（每首必做，否则不入库）

1. 裁剪到精确小节数（60/60/56s，按 BPM 折算帧数对齐），首尾波形检查无溢出尾音；
2. 单声道下混 → MP3 **CBR** 64kbps 44.1kHz mono（ffmpeg: `-ac 1 -b:a 64k -codec:a libmp3lame`）；
3. 响度归一 -16 LUFS，true peak ≤ -1dBTP；
4. **双循环试听**：循环播放两遍，接缝无感才通过；
5. 命名按 §3 表，落 `subpkg/audio/`（分包目录由架构师定名后回填 §3.2 json）。

### 8.3 SFX 规格（P2 采样替换时才需要；MVP 全合成零提示词）

- 格式：44.1kHz mono WAV 母带 → MP3 128k；单文件 ≤0.15s（UI 类）/ ≤0.3s（事件类）；
- 生成工具参考：qwen-audio 系音效生成 / Stable Audio（prompt 模板：`8-bit square wave chiptune sound effect, short pop with descending pitch, 0.15s, clean, no reverb`）；
- 替换原则：只替换合成质感确实不足的 2-3 个（水花/祭坛 thunk），其余保持合成一致性。

---

## 9. 验收清单（落地后逐条可验）

| # | 项 | 验证方法 | 通过标准 |
|---|---|---|---|
| A1 | 三首 BGM 无缝循环 | 双循环试听 + 波形首尾对齐检查 | 接缝不可闻 |
| A2 | 音频体积 | 构建产物统计（分包目录 du） | ≤2.2MB；首包 0 音频字节 |
| A3 | 音乐状态机 | 夜战跑一局 + 副本跑一局 | defense_start 切曲 ≤0.3s；defense_win 回曲经 crossfade；副本用夜曲 |
| A4 | 夜战事件链音效 | 首夜（day4）完整防守 | spawn/kill/hit/leak/win 或 end 全部有声；连杀 10 次无削波无叠音爆 |
| A5 | 音量设置（§13 闭环） | 设置面板拖 BGM/SFX 滑杆→重启 | 音量持久生效；静音钮立即生效 |
| A6 | 切后台 | 战斗中切后台 10s 回前台 | 后台无声；回前台音乐恢复在正确相位（允许跳到小节头） |
| A7 | 首启音频 | 清档冷启动，首触后听 | 首次点屏后 BGM 淡入 ≤1s；分包未就绪时静音不报错 |
| A8 | iOS 真机格式 | iPhone 真机播全部音频（§18 遗留项） | 无解码失败；结果回写 docs/taptap/publishing.md |
| A9 | 疲劳测试 | 世界图挂机 30min | 白天曲+环境音无可察觉重复疲劳点 |
| A10 | 回归：deny 语义 | 打开/关闭装饰面板、材料不足被拒 | 面板反馈=ui_click；拒绝=deny，两音可区分 |

---

## 10. 接线清单（给协调者/架构师，本轮不改码）

| # | 文件 | 改动 | 对应 |
|---|---|---|---|
| W1 | `assets/scripts/core/SfxLib.ts` | 扩名表（§5 新增 12 名）；:131 补 adventure_hurt→hit、adventure_kill→enemy_die；:134 删过时注释改绑 defense_win/defense_end→win/lose；同名 60ms 节流 | §5.2/5.3 |
| W2 | `assets/scripts/core/AudioDirector.ts`（新增） | §4.2 规格；audio.json 数据驱动 | §3.2/§4 |
| W3 | `assets/scripts/platform/IPlatformAdapter.ts` + Local/Tap 两实现 | 增可选 `audio?: { getAudioContext(): unknown \| null }`；SfxLib.ts:26 改优先取 adapter 回退 globalThis | G9 |
| W4 | `assets/scripts/gameplay/world/clearing/ClearingSystem.ts:131` | world_cleared payload 补 `{ kind: 'tree'\|'rock'\|'bush' }`（或就地调 SfxLib） | §5.1 chop/mine |
| W5 | `assets/scripts/gameplay/world/SettingsPanel.ts` | 音量区块：BGM/SFX 双滑杆（热区 ≥88px 按 ui-notes §3.1）+ 静音钮；写 SaveManager settings 切片 | G8/§4.2 |
| W6 | `GameApp.ts` | adapter.onHide/onShow → AudioDirector suspend/resume；首触 startMusic | §4.2 |
| W7 | DecorPanel.ts:94 / CodexPanel.ts:72 / DungeonOverlay.ts:408 | deny → ui_click | §5.4 |
| W8 | `assets/data/catalogs/audio.json`（新增） | §3.2 参数表直接落盘 | 数据驱动 |

---

## 11. 风险登记（每条含位置/触发/影响/验证）

| # | 类型 | 风险 | 位置 | 触发 | 影响 | 验证 | 最小修复+回归 |
|---|---|---|---|---|---|---|---|
| R1 | **已复现**（grep 证据） | 防守胜负无声：注释称 DefenseOverlay 自己发，实际 0 调用且绑定错位（实际事件名 defense_win/end ≠ 被注释的 defense_settled） | SfxLib.ts:134 + DefenseSystem.ts:213 | 任一局夜战结束 | 核心结算无听觉反馈，防守闭环情绪落空 | A4 | W1 补绑定；回归=跑一局听 win/lose |
| R2 | **未验证**（最高优先验证项） | AudioContext 直取 globalThis 在 TapTap 运行时可能不存在→全游戏无声 | SfxLib.ts:26 | 真机首启 | SFX+BGM 全灭 | TapTap 空包真机播一声 | W3 适配层化；回归=A7 |
| R3 | 潜在 | BGM 无用户手势触发点→自动播放被拦 | 现状无 BGM；实施后 | 冷启动直接进世界图 | 首屏无声 | A7 | §4.2 首触 startMusic |
| R4 | **已复现** | deny 语义过载：三处面板把它当操作反馈 | DecorPanel.ts:94、CodexPanel.ts:72、DungeonOverlay.ts:408 | 日常面板操作 | 「正常操作听着像失败」 | A10 | W7；回归=A10 |
| R5 | **已复现**（§13 文本 vs 代码） | 音量设置缺失但 §13 列为必含 | SettingsPanel（0 命中）+ SfxLib.ts:8 | 提审验收/玩家嫌吵 | §13 验收落空 | A5 | W5；回归=A5 |
| R6 | 未验证 | mp3 在 iOS 小游戏容器解码/分包加载时序 | 构建链 | iOS 真机 | 无声或延迟 | A8 | 按 §18 真机实测回写 publishing.md |
| R7 | 潜在 | AI 生成曲时长非整数小节→循环爆缝 | 素材入库 | 直接用原始生成件 | 接缝爆音，循环感破坏 | A1 | §8.2 流程强制 |
| R8 | 假设 | 环境音合成质感不达标（虫鸣/水声难合成） | §3.1 | 试听 | 垫层廉价感 | 试听评审 | P2 文件化 +0.7MB 需重审预算 |
| R9 | 潜在 | 防守夜曲切换等待小节边界最长达 2.86s（84BPM 曲切出时） | §4.1 量化切换 | defense_start 恰在小节头后 | 战斗开始迟 2.86s 无战斗音乐 | A3 | 已由例外条款覆盖（defense_start 不等待） |

---

## 12. Handoff（跨角色对齐项）

**→ engineering-software-architect**：W1-W6/W8 接线清单排期确认；分包目录命名（§3.2 file 路径回填）；`farmChanged` 通道已被 pause/sprites_ready/build_closed 等借用（泛化通胀），音频绑定不受影响但长期建议独立事件通道（非本轮）。
**→ design-ui-designer**：音量面板控件规格（双滑杆+静音钮，热区 88px、panel-dark 底、gold 选中语言沿用 ui-notes §3.3/§3.5）；如设置面板布局已定稿请回传插槽位置。
**→ game-designer（拍板项）**：① 3 首曲目名与情绪映射是否 OK；② 防守预告日（day%4==0 前夜）切夜曲的状态机是否接受（§4.1 WORLD_FOREWARN）；③ 副本复用夜曲是否接受（P2 专用曲预算 +0.45MB）。
**→ engineering-wechat-mini-program-developer**：分包音频加载时序与失败降级（静音不阻塞）；A8 iOS 格式实测回写 docs/taptap/publishing.md。
**→ design-image-prompt-engineer**：无交叉项（音频 prompt 自包含于 §8）。
**未覆盖/明确不做**：NPC 语音 VO（§13 线性对话纯文字）；节日主题音乐包（P2 独立 bundle，§18 已预留）；立体声混音（单声道为预算纪律）；多语言配音。
