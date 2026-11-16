// CombatLogic 无头单测（node --experimental-strip-types tools/test-combat-core.mjs）
import * as C from '../assets/scripts/gameplay/dungeon/CombatLogic.ts';
import { readFileSync } from 'node:fs';

const weapons = JSON.parse(readFileSync('./assets/data/catalogs/weapons.json', 'utf8'));
const W = Object.fromEntries(weapons.map(w => [w.id, w]));

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗ FAIL', name); } };

const spec = (mid, over = {}) => ({
    mid, name: mid, hp: 12, damage: 3, speed: 60, behavior: 'chaser', radius: 20, ...over,
});

const run = (s, input, steps, cb) => {
    for (let i = 0; i < steps; i++) {
        if (s.over) break;
        C.tickCombat(s, input, cb);
    }
};

// ---------- 1：近战锁定+扇形命中 ----------
{
    const s = C.startCombat(640, 480, W['wood_sword'], 20, 20);
    const evs = [];
    C.spawnWave(s, [spec('slime')], (e, p) => evs.push([e, p]));
    const m = s.monsters[0];
    // 怪放正右方 60px
    m.x = s.player.x + 60; m.y = s.player.y;
    run(s, { mx: 0, my: 0, attack: true, roll: false }, 20, (e) => evs.push([e]));
    ok(evs.some(e => e[0] === 'swing'), '近战出刀（锁定 60px 内目标）');
    ok(m.hp < 12 && m.hp > 0 || s.monsters.length === 0, `怪物受伤（hp=${m.hp}）`);
    // 打死
    run(s, { mx: 0, my: 0, attack: true, roll: false }, 40, () => {});
    ok(s.over && s.won && s.onCleared, '清怪→end_win 房间开门');
}

// ---------- 2：扇形只打面朝方向（锁定目标转身，背后怪不吃刀）----------
{
    const s = C.startCombat(640, 480, W['wood_sword'], 20, 20);
    C.spawnWave(s, [spec('slime_a', { speed: 0 }), spec('slime_b', { speed: 0 })], () => {});
    const right = s.monsters[0], behind = s.monsters[1];
    right.x = s.player.x + 60; right.y = s.player.y;      // 锁定目标（近战自动瞄准）
    behind.x = s.player.x - 60; behind.y = s.player.y;    // 反方向背后
    const evs = [];
    run(s, { mx: 0, my: 0, attack: true, roll: false }, 10, (e) => evs.push(e));
    ok(evs.includes('swing'), '锁定目标在范围内出刀');
    ok(right.hp < 12, `锁定目标吃刀（hp=${right.hp}）`);
    ok(behind.hp === 12, `背后怪不吃刀（hp=${behind.hp}）`);
}

// ---------- 3：远程自动瞄准+玩家弹命中 ----------
{
    const s = C.startCombat(640, 480, W['slingshot'], 20, 20);
    C.spawnWave(s, [spec('slime', { behavior: 'shooter', fireInterval: 99, speed: 0 })], () => {});
    const m = s.monsters[0];
    m.x = s.player.x + 200; m.y = s.player.y;
    const evs = [];
    run(s, { mx: 0, my: 0, attack: true, roll: false }, 60, (e) => evs.push(e));
    ok(evs.includes('shoot_p'), '远程发射');
    ok(m.hp <= 9, `弹命中怪（hp=${m.hp}）`);
}

// ---------- 4：翻滚无敌帧 ----------
{
    const s = C.startCombat(640, 480, W['wood_sword'], 20, 20);
    C.spawnWave(s, [spec('slime', { damage: 5 })], () => {});
    const m = s.monsters[0];
    m.x = s.player.x + 30; m.y = s.player.y;   // 贴脸（首攻冷却 0.5s）
    // 贴脸挨打
    run(s, { mx: 0, my: 0, attack: false, roll: false }, 30, () => {});
    const hpAfterHit = s.player.hp;
    ok(hpAfterHit < 20, `贴脸被打（hp=${hpAfterHit}）`);
    // 翻滚穿身
    const evs = [];
    s.player.hurtInvuln = 0;
    run(s, { mx: 1, my: 0, attack: false, roll: true }, 4, (e) => evs.push(e));
    ok(evs.includes('roll'), '翻滚触发');
    ok(s.player.rollT > 0 || evs.filter(e => e === 'roll').length === 1, '翻滚中');
}

// ---------- 5：敌方弹幕预算 ≤20 ----------
{
    const s = C.startCombat(640, 480, W['wood_sword'], 99, 99);
    C.spawnWave(s, [spec('shooter_a', { behavior: 'shooter', fireInterval: 0.2, speed: 0 }),
                     spec('shooter_b', { behavior: 'shooter', fireInterval: 0.2, speed: 0 })], () => {});
    s.player.hp = 999; s.player.maxHp = 999;
    run(s, { mx: 0, my: 0, attack: false, roll: false }, 300, () => {});
    const enemy = s.bullets.filter(b => b.enemy).length;
    ok(enemy <= 20, `弹幕预算封顶（场上敌弹 ${enemy}）`);
}

// ---------- 6：精英分裂 ----------
{
    const s = C.startCombat(640, 480, W['iron_sword'], 20, 20);
    C.spawnWave(s, [spec('slime_elite', { hp: 14, damage: 4, speed: 38, behavior: 'tank', radius: 26, elite: true })], () => {});
    const el = s.monsters[0];
    el.x = s.player.x + 60; el.y = s.player.y;
    const evs = [];
    run(s, { mx: 0, my: 0, attack: true, roll: false }, 400, (e) => evs.push(e));
    ok(evs.includes('split'), '精英死亡分裂');
    ok(s.over && s.won, '分裂体也被清完→胜利');
}

// ---------- 7：无敌帧挡伤（受击后 0.8s 免伤）----------
{
    const s = C.startCombat(640, 480, W['wood_sword'], 20, 20);
    C.spawnWave(s, [spec('slime', { damage: 5 })], () => {});
    const m = s.monsters[0];
    m.x = s.player.x + 25; m.y = s.player.y;   // 贴身持续咬
    const seen = [];
    for (let i = 0; i < 90; i++) {
        C.tickCombat(s, { mx: 0, my: 0, attack: false, roll: false }, (e, p) => { if (e === 'hurt_p') seen.push(p.hp); });
        m.x = s.player.x + 25;   // 始终贴脸
    }
    ok(seen.length >= 2, `连咬多次（${seen.length} 次受伤）`);
    // 相邻两次受伤间隔的 hp 差 = 每次只掉一口（无敌帧防止一帧多次）
    const diffs = seen.map((v, i) => i ? seen[i - 1] - v : 0).slice(1);
    ok(diffs.every(d => d === 5), '每次受伤只掉一刀（0.8s 无敌生效）');
}

// ---------- 8：玩家死亡→end_lose ----------
{
    const s = C.startCombat(640, 480, W['wood_sword'], 5, 5);
    C.spawnWave(s, [spec('slime', { damage: 99, speed: 999 })], () => {});
    run(s, { mx: 0, my: 0, attack: false, roll: false }, 30, () => {});
    ok(s.over && !s.won, 'HP 归零→end_lose');
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
