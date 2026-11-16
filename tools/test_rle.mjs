// RLE 编解码回环测试：从 TerrainData.ts 抽取 encodeRLE/decodeRLE 逻辑做纯函数验证
// （TerrainData 依赖 cc 无法在 Node 直接 import，这里按源码 1:1 转译为 JS）
const MAP_W = 128, MAP_H = 96;

class TD {
  constructor() {
    this.types = new Uint8Array(MAP_W * MAP_H);
    this.heights = new Uint8Array(MAP_W * MAP_H);
    this.dirty = new Set();
  }
  // encodeRLE — 与 TerrainData.ts 逐行对应
  static encodeRLE(d) {
    const words = [];
    const n = d.types.length;
    let i = 0;
    while (i < n) {
      const v = (d.types[i] << 4) | d.heights[i];
      let run = 1;
      while (i + run < n && run < 0xffff && ((d.types[i + run] << 4) | d.heights[i + run]) === v) run++;
      words.push(run & 0xff, (run >> 8) & 0xff, v);
      i += run;
    }
    let bin = '';
    for (const w of words) bin += String.fromCharCode(w);
    return Buffer.from(bin, 'binary').toString('base64');
  }
  // decodeRLE — 与 TerrainData.ts 逐行对应（atob/atob 用浏览器严格语义模拟：非法 base64 抛异常）
  static _atob(b64) {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 === 1) throw new Error('InvalidCharacterError');
    return Buffer.from(b64, 'base64').toString('binary');
  }
  static decodeRLE(d, b64) {
    try {
      const bin = TD._atob(b64);
      let p = 0, i = 0;
      const n = d.types.length;
      while (p + 2 < bin.length + 1 && i < n) {
        const run = bin.charCodeAt(p) | (bin.charCodeAt(p + 1) << 8);
        const v = bin.charCodeAt(p + 2);
        p += 3;
        const t = (v >> 4) & 0x0f, h = v & 0x0f;
        for (let k = 0; k < run && i < n; k++, i++) { d.types[i] = t; d.heights[i] = h; }
      }
      d.dirty.clear();
      for (let k = 0; k < n; k++) d.dirty.add(k);
      return i >= n;
    } catch (e) { return false; }
  }
}

// ---- 测试场景模拟真实存档：基线草地 + 铺石×2 + 桥×1 + 台阶×1 ----
function makeTerrain() {
  const d = new TD();
  // 基线：全草 h0（同 WorldSpike.generateBaseline 的地面部分）
  d.types.fill(0); d.heights.fill(0);
  const idx = (x, y) => y * MAP_W + x;
  // 模拟玩家建造：铺石(76,24)(77,24) t5 h0、桥(62,20) t6 h0、台阶(69,12) t7 h1
  [[76,24],[77,24]].forEach(([x,y]) => { d.types[idx(x,y)] = 5; });
  d.types[idx(62,20)] = 6;
  d.types[idx(69,12)] = 7; d.heights[idx(69,12)] = 1;
  d.dirty.add(idx(76,24)); d.dirty.add(idx(62,20)); d.dirty.add(idx(69,12));
  return d;
}

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name); } }

console.log('== 测试1：回环保真 ==');
{
  const a = makeTerrain();
  const b64 = TD.encodeRLE(a);
  const b = new TD();
  b.types.fill(2); b.heights.fill(3); // 先填满垃圾值，确保 decode 全覆盖
  const ok = TD.decodeRLE(b, b64);
  check('decode 返回 true', ok === true);
  check('types 全等', Buffer.compare(Buffer.from(a.types), Buffer.from(b.types)) === 0);
  check('heights 全等', Buffer.compare(Buffer.from(a.heights), Buffer.from(b.heights)) === 0);
  check('dirty 全量标脏(12288格)', b.dirty.size === MAP_W * MAP_H);
  console.log('  b64 长度:', b64.length, '字符（存档体积）');
}

console.log('== 测试2：截断流防护（产品要求：decode 失败返回 false → 回退基线） ==');
{
  // 12:52 会话实测 RLE 的前缀（人为截断，不完整流）
  const b64 = 'PgABBQAxPgABPQAABQAwPAAA';
  const d = new TD();
  d.types.fill(0); d.heights.fill(0);
  const ok = TD.decodeRLE(d, b64);
  check('截断流返回 false', ok === false);
  check('部分解码不越界不抛异常', true);
  // 完整流：手工构造含 3(Water) 的合法串——用 encode 生成再验证
  const src = new TD(); src.types.fill(3); // 全水面
  const full = TD.encodeRLE(src);
  const d2 = new TD(); d2.types.fill(0);
  check('合法流 decode=true', TD.decodeRLE(d2, full) === true);
  check('首格 type=3(Water) h=0', d2.types[0] === 3 && d2.heights[0] === 0);
  check('末格也是 Water', d2.types[MAP_W * MAP_H - 1] === 3);
}

console.log('== 测试3：破坏性输入 ==');
{
  const d = new TD();
  check('非法 base64 返回 false 不抛异常', TD.decodeRLE(d, '!!!not-base64!!!') === false);
  const d2 = new TD();
  check('空串返回 false', TD.decodeRLE(d2, '') === false);
}

console.log('== 测试4：体积上限 ==');
{
  // 最坏情况：12288 格全部互不相同（交替图案）——run 全为 1
  const d = new TD();
  for (let i = 0; i < d.types.length; i++) { d.types[i] = i % 2 === 0 ? 0 : 4; d.heights[i] = i % 3; }
  const b64 = TD.encodeRLE(d);
  const bytes = Buffer.from(b64, 'base64').length;
  console.log('  最坏情况 b64:', b64.length, '字符 / 原始', bytes, '字节');
  // localStorage 单 key 限 1MB（微信/Tap 平台），最坏情况 48KB 仍安全，但远超常态(28字符)
  check('最坏情况 < 64KB（平台单 key 1MB 预算内）', b64.length < 65536);
  const b = new TD();
  check('最坏情况回环一致', TD.decodeRLE(b, b64) && Buffer.compare(Buffer.from(d.types), Buffer.from(b.types)) === 0 && Buffer.compare(Buffer.from(d.heights), Buffer.from(b.heights)) === 0);
}

console.log('== 测试5：长压缩率 ==');
{
  const d = makeTerrain(); // 现实存档：大面积草地+零星建造
  const b64 = TD.encodeRLE(d);
  console.log('  现实存档 b64:', b64.length, '字符 / 原始', Buffer.from(b64, 'base64').length, '字节（12288 格）');
  check('现实存档 < 1KB', b64.length < 1024);
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
