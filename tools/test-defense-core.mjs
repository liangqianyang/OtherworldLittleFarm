// DefenseCore 无头单测（node --experimental-strip-types test-defense-core.mjs）
import * as core from '../assets/scripts/gameplay/defense/DefenseCore.ts';
import { readFileSync } from 'node:fs';

const mapRow = JSON.parse(readFileSync('./assets/data/catalogs/defense_maps.json', 'utf8'))[0];
const waves = JSON.parse(readFileSync('./assets/data/catalogs/defense_waves.json', 'utf8'));
const t1 = waves.find(w => w.id === 'seal_slime_1');
const t3 = waves.find(w => w.id === 'seal_spore_3');

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗ FAIL', name); } };

// 怪物元数据（与 monsters.json 一致的测试值）
const meta = {
    slime:       { hp: 12, damage: 3, speed: 60, name: '林地粘怪', slowResist: 0, baitImmune: false },
    slime_elite: { hp: 18, damage: 4, speed: 38, name: '粘怪精英', slowResist: 0.5, baitImmune: false },
    sporeling:   { hp: 22, damage: 3, speed: 38, name: '孢子菇', slowResist: 0, baitImmune: true },
};
core.setMonsterMetaLookup(mid => meta[mid] ?? null);

// ---------- 地图解析 ----------
const m = core.resolveMap(mapRow);
ok(m.buildable.length === 15 * 9 - 21 - 4 - 10, `建造格 100（实际 ${m.buildable.length}）`);
ok(!core.canPlace(m, [], m.def.paths.A[0][1] * 15 + m.def.paths.A[0][0], 15).ok, '路径格禁建');
ok(!core.canPlace(m, [], 3 * 15 + 12, 15).ok, '祭坛格禁建');
ok(!core.canPlace(m, [], 0 * 15 + 5, 15).ok, '(5,0) B入口格禁建');
const freeCell = m.buildable[0];
ok(core.canPlace(m, [], freeCell, 15).ok, '空格可建');
const [px, py] = core.cellToPx(mapRow, 12, 3);
ok(px === 320 && py === 64, `祭坛格(12,3)像素 (${px},${py})`);
ok(core.pxToCell(m, px, py) === 3 * 15 + 12, 'px→cell 往返一致');

// ---------- 场景1：裸奔（无塔 3 粘怪）—— 必失守 ----------
{
    const n = core.startCoreNight(m, t1, meta, [], mapRow.altarHp);
    const evs = [];
    const cb = (e, p) => evs.push([e, p]);
    let guard = 0;
    while (!n.over && guard++ < 3000) core.tickCoreNight(n, 0.1, cb);
    ok(n.over && !n.won, `裸奔失守（${(guard * 0.1).toFixed(1)}s）`);
    ok(n.leakA === 3 && n.leakB === 0, `漏怪 A=3 B=0（实际 ${n.leakA}/${n.leakB}）`);
    ok(n.altarHp === 0, `祭坛被打穿（${n.altarHp}）`);
    ok(evs.some(e => e[0] === 'arrive'), '有 arrive 事件');
}

// ---------- 场景2：霜铃减速（拖长防守时间，慢而不杀）----------
{
    const d = { kind: 'slow', buildGold: 20, radiusCells: 1.5, power: 0.4 };
    const tw = core.makeTower('frostbell', d, 3, 4, mapRow.cellPx, mapRow.originX, mapRow.originY);
    const n = core.startCoreNight(m, t1, meta, [tw], mapRow.altarHp);
    const cb = () => {};
    let guard = 0;
    while (!n.over && guard++ < 3000) core.tickCoreNight(n, 0.1, cb);
    const slowedT = guard * 0.1;
    ok(!n.won && n.leakA === 3, `单霜铃拖不住火力→失守（符合设计：slow 需配合输出）`);
    // 塔在 (3,4)，只覆盖路径 192px（x∈[-352,-160]）；减速段 +192px×(1/0.6-1)=+128px=+2.1s
    ok(slowedT > 38.5 && slowedT < 42, `霜铃覆盖段把 37.5s 拖到 ${(slowedT).toFixed(1)}s（几何期望 ≈39.6s）`);
}

// ---------- 场景3：精英抗性（slime_elite slowResist 0.5）----------
{
    const d = { kind: 'slow', radiusCells: 1.5, power: 0.4 };
    const tw = core.makeTower('frostbell', d, 3, 4, mapRow.cellPx, mapRow.originX, mapRow.originY);
    const n = core.startCoreNight(m, t1, meta, [tw], mapRow.altarHp);
    // 手动造一只精英在霜铃环里
    n.monsters.push({
        uid: 99, mid: 'slime_elite', name: '粘怪精英', hp: 18, maxHp: 18, damage: 4, speed: 38,
        x: tw.x, y: tw.y, state: 'walk', line: 'A', wp: 1,
        slowResist: 0.5, baitImmune: false, atkT: 0, baitTarget: null, pathPx: m.pathPx.A,
    });
    const sf = core.slowFactor(n, n.monsters[0]);
    ok(Math.abs(sf - (1 - Math.min(0.6, 0.4 * 0.5))) < 1e-9, `精英半抗 实际减速 ${(100 * (1 - sf)).toFixed(1)}%`);
}

// ---------- 场景4：蜜瓜诱饵（sporeling 免疫）----------
{
    const baitD = { kind: 'attract', radiusCells: 2.5, hp: 18 };
    const bait = core.makeTower('honeyplot', baitD, 7, 4, mapRow.cellPx, mapRow.originX, mapRow.originY);
    const n = core.startCoreNight(m, t1, meta, [bait], mapRow.altarHp);
    core.beginWave(n, 0);
    // 灌两只怪：粘怪（会被吸）+ 孢子菇（免疫）
    const mk = (uid, mid) => ({
        uid, mid, name: meta[mid].name, hp: meta[mid].hp, maxHp: meta[mid].hp, damage: meta[mid].damage,
        speed: meta[mid].speed, x: m.pathPx.A[0][0], y: m.pathPx.A[0][1], state: 'walk', line: 'A', wp: 1,
        slowResist: meta[mid].slowResist, baitImmune: meta[mid].baitImmune, atkT: 0, baitTarget: null, pathPx: m.pathPx.A,
    });
    n.monsters.push(mk(1, 'slime'), mk(2, 'sporeling'));
    n.spawnedInWave = 2;
    let lureSlime = false, lureSpore = false;
    const cb = (e, p) => { if (e === 'bait_lure') { if (p.uid === 1) lureSlime = true; if (p.uid === 2) lureSpore = true; } };
    for (let i = 0; i < 200 && !lureSlime; i++) core.tickCoreNight(n, 0.1, cb);
    const slime = n.monsters.find(x => x.uid === 1), spore = n.monsters.find(x => x.uid === 2);
    ok(lureSlime && slime.state === 'chew', '粘怪被蜜瓜吸走进入啃食');
    ok(!lureSpore && spore.state === 'walk', '孢子菇免疫诱饵继续行军');
    // 啃空蜜瓜 → 回到 walk
    bait.hp = 3;
    const eaten = slime.damage; // 3
    for (let i = 0; i < 60 && slime.state === 'chew'; i++) core.tickCoreNight(n, 0.1, cb);
    ok(slime.state === 'walk', '蜜瓜被啃空后粘怪恢复行军');
}

// ---------- 场景5：豆荚炮点杀（DPS 校验）----------
{
    const podD = { kind: 'pod', radiusCells: 3.0, power: 6, interval: 1.5 };
    const pod = core.makeTower('podgun', podD, 8, 4, mapRow.cellPx, mapRow.originX, mapRow.originY);
    const n = core.startCoreNight(m, t1, meta, [pod], mapRow.altarHp);
    let shots = 0, kills = 0;
    const cb = (e) => { if (e === 'pod_shot') shots++; if (e === 'kill') kills++; };
    let guard = 0;
    while (!n.over && guard++ < 3000) core.tickCoreNight(n, 0.1, cb);
    ok(n.won, `豆荚炮守胜 altar=${n.altarHp}`);
    ok(kills === 3, `3 粘怪全灭（kills=${kills}, shots=${shots}）`);
    ok(shots >= 6 && shots <= 12, `弹药经济合理 shots=${shots}（每怪 2-4 发）`);
}

// ---------- 场景6：逐波门控（T3 四波）----------
{
    const n = core.startCoreNight(m, t3, meta, [], mapRow.altarHp);
    // 给足火力让它打完四波：豆荚炮阵
    const pods = [[7, 4], [7, 5], [8, 4], [8, 5], [9, 6], [9, 3]].map(([cx, cy]) =>
        core.makeTower('podgun', { kind: 'pod', radiusCells: 3.5, power: 10, interval: 1.2 }, cx, cy, mapRow.cellPx, mapRow.originX, mapRow.originY));
    n.towers.push(...pods);
    const wavesSeen = new Set();
    let breaks = 0;
    const cb = (e, p) => { if (e === 'wave_start') wavesSeen.add(p.wave); if (e === 'wave_break') breaks++; };
    let guard = 0;
    while (!n.over && guard++ < 20000) core.tickCoreNight(n, 0.1, cb);
    ok(wavesSeen.has(0) && wavesSeen.has(3), `四波全部开打（seen=${[...wavesSeen]}）`);
    ok(breaks >= 3, `波间倒计时触发 ${breaks} 次`);
    ok(n.won, `T3 塔阵守胜 altar=${n.altarHp}`);
}

// ---------- 场景7：祭坛打穿即时终局 ----------
{
    const n = core.startCoreNight(m, t1, meta, [], mapRow.altarHp);
    core.beginWave(n, 0);
    n.spawnedInWave = 1;
    n.monsters.push({
        uid: 1, mid: 'slime', name: 'x', hp: 999, maxHp: 999, damage: 50, speed: 60,
        x: -448, y: 0, state: 'walk', line: 'A', wp: 4,
        slowResist: 0, baitImmune: false, atkT: 0, baitTarget: null, pathPx: m.pathPx.A,
    });
    let ended = false;
    const cb = (e) => { if (e === 'end') ended = true; };
    let guard = 0;
    while (!n.over && guard++ < 3000) core.tickCoreNight(n, 0.1, cb);
    ok(ended && !n.won && n.altarHp === 0, '高伤怪快速打穿祭坛即时终局');
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
