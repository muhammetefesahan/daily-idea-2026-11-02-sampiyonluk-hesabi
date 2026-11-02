import assert from 'node:assert/strict';
import { SISTEMLER, puanListesi, puanlar, kalanMax, sirala, tablo, garanti, rastgele, simule, ORNEK, yedekAl, yedekOku } from './core.mjs';

let checks = 0;
const ok = fn => { fn(); checks++; };
const D = (ad, puan, galibiyet = 0) => ({ ad, puan, galibiyet });

// 1. Puan sistemleri
ok(() => assert.equal(SISTEMLER.f1.yaris.reduce((a, b) => a + b), 101));
ok(() => assert.deepEqual(puanListesi('10, 8 6;5'), [10, 8, 6, 5]));
ok(() => assert.equal(puanListesi('5, 8'), null));                 // artan olamaz
ok(() => assert.equal(puanListesi('10, -1'), null));
ok(() => assert.equal(puanListesi('a'), null));
ok(() => assert.equal(puanListesi(''), null));
ok(() => assert.deepEqual(puanlar({ sistem: 'ozel', ozelYaris: [3, 1], ozelSprint: [] }).yaris, [3, 1]));
ok(() => assert.equal(kalanMax({ sistem: 'f1', kalanYaris: 2, kalanSprint: 1 }), 58));
ok(() => assert.equal(kalanMax({ sistem: 'motogp', kalanYaris: 1, kalanSprint: 1 }), 37));
ok(() => assert.equal(kalanMax({ sistem: 'f1', kalanYaris: 0, kalanSprint: 0 }), 0));

// 2. Sıralama: puan, sonra galibiyet
const s = sirala([D('A', 100, 1), D('B', 120), D('C', 100, 3)]);
ok(() => assert.deepEqual(s.map(x => x.ad), ['B', 'C', 'A']));

// 3. Tablo durumları
const t = tablo(ORNEK);
const durum = ad => t.satirlar.find(x => x.ad === ad).durum;
ok(() => assert.equal(t.kalan, 58));
ok(() => assert.equal(t.kesin, false));
ok(() => assert.equal(durum('Kırmızı Roket'), 'lider'));
ok(() => assert.equal(durum('Mavi Şimşek'), 'var'));
ok(() => assert.equal(durum('Turuncu Kaplan'), 'var'));
ok(() => assert.equal(durum('Yeşil Kasırga'), 'yok'));            // puanda eşitlenir ama 3+2 galibiyet 7'ye yetmez
ok(() => assert.equal(durum('Gri Hayalet'), 'yok'));
// Galibiyet yetişebiliyorsa eşitlik şansı var
const es = tablo({ sistem: 'f1', kalanYaris: 2, kalanSprint: 0, surucular: [D('L', 100, 2), D('R', 50, 1)] });
ok(() => assert.equal(es.satirlar[1].durum, 'esitlik'));
// Kesinleşmiş şampiyon
const k = tablo({ sistem: 'f1', kalanYaris: 1, kalanSprint: 0, surucular: [D('L', 100), D('R', 74)] });
ok(() => assert.equal(k.kesin, true));
ok(() => assert.equal(k.satirlar[0].durum, 'sampiyon'));
// Tam 25 fark ve 1 yarış: henüz kesin değil (eşitlik ihtimali)
ok(() => assert.equal(tablo({ sistem: 'f1', kalanYaris: 1, kalanSprint: 0, surucular: [D('L', 100), D('R', 75)] }).kesin, false));
ok(() => assert.equal(tablo({ sistem: 'f1', kalanYaris: 0, surucular: [D('Tek', 5)] }).kesin, true));
ok(() => assert.equal(tablo({ sistem: 'f1', surucular: [] }).satirlar.length, 0));

// 4. Garanti tablosu: elle kontrol
const g = garanti(ORNEK, 'yaris');
const satir = a => g.satirlar.find(x => x.lider === a);
ok(() => assert.equal(g.kalanSonra, 33));
ok(() => assert.equal(satir(1).rakipEnIyi, 5));     // 341+25=366 > 322+10+33=365
ok(() => assert.equal(satir(2).rakipEnIyi, 9));     // 359 > 322+2+33=357; 8. olsa 359 = 359 eşit, yetmez
ok(() => assert.equal(satir(3).rakipEnIyi, null));
ok(() => assert.equal(garanti(ORNEK, 'sprint').satirlar.every(x => x.rakipEnIyi === null), true));
ok(() => assert.equal(garanti({ ...ORNEK, kalanSprint: 0 }, 'sprint'), null));
ok(() => assert.equal(garanti({ ...ORNEK, surucular: [D('Tek', 5)] }), null));

// 5. Garanti tablosu: kaba kuvvetle karşılaştır (diğerlerinin bütün sıralamaları)
function kabaGaranti(ayar, a, b) {
  const sr = sirala(ayar.surucular), p = puanlar(ayar).yaris, n = p.length;
  const P = x => (x >= 1 && x <= n ? p[x - 1] : 0);
  const kalanSonra = kalanMax(ayar) - p[0];
  if (a === b && a <= n) return null;
  const [L, R, ...dig] = sr;
  const bos = []; for (let x = 1; x <= n; x++) if (x !== a && x !== b) bos.push(x);
  const liderSon = L.puan + P(a);
  if (liderSon <= R.puan + P(b) + kalanSonra) return false;
  let hep = true;
  const dene = (i, kullan) => {
    if (!hep) return;
    if (i === dig.length) return;
    for (const yer of [...bos.filter(x => !kullan.has(x)), n + 1]) {
      if (liderSon <= dig[i].puan + P(yer) + kalanSonra) { hep = false; return; }
      const yeni = new Set(kullan); if (yer <= n) yeni.add(yer);
      dene(i + 1, yeni);
    }
  };
  dene(0, new Set());
  return hep;
}
let tohum = 3; const rnd = () => (tohum = (tohum * 48271) % 2147483647) / 2147483647;
let ayniMi = true, denenen = 0;
for (let d = 0; d < 60; d++) {
  const ayar = { sistem: 'ozel', ozelYaris: [10, 6, 4, 3, 2, 1], ozelSprint: [], kalanYaris: 1 + Math.floor(rnd() * 3), kalanSprint: 0,
    surucular: Array.from({ length: 4 }, (_, i) => D('S' + i, Math.floor(rnd() * 60))) };
  const gg = garanti(ayar, 'yaris');
  for (const sat of gg.satirlar) {
    for (let b = 1; b <= 7; b++) {
      const kb = kabaGaranti(ayar, sat.lider, b);
      if (kb === null) continue;
      const bizim = sat.rakipEnIyi !== null && b >= sat.rakipEnIyi;
      denenen++;
      if (bizim !== kb) ayniMi = false;
    }
  }
}
ok(() => assert.ok(ayniMi, 'garanti kaba kuvvetle uyuşmuyor'));
ok(() => assert.ok(denenen > 2000));

// 6. Simülasyon
ok(() => assert.equal(rastgele(5)(), rastgele(5)()));
const sim = simule(ORNEK, 3000, 7);
ok(() => assert.ok(Math.abs(sim.reduce((x, y) => x + y.oran, 0) - 1) < 1e-9));
ok(() => assert.deepEqual(sim, simule(ORNEK, 3000, 7)));           // aynı tohum, aynı sonuç
ok(() => assert.ok(sim[0].oran > sim[1].oran));
ok(() => assert.equal(sim.find(x => x.ad === 'Gri Hayalet').oran, 0)); // matematiksel olarak bitmiş
ok(() => assert.equal(sim.find(x => x.ad === 'Mor Fırtına').oran, 0));
const kesinSim = simule({ sistem: 'f1', kalanYaris: 1, kalanSprint: 0, surucular: [D('L', 100), D('R', 74)] }, 500);
ok(() => assert.equal(kesinSim[0].oran, 1));
// Matematiksel olarak "var" diyen her sürücü için simülasyon 0 dışı bir şey bulabilir; "yok" diyenler hep 0
const t2 = tablo(ORNEK);
ok(() => assert.ok(t2.satirlar.filter(x => x.durum === 'yok').every(x => sim.find(y => y.ad === x.ad).oran === 0)));

// 7. Yedek
const y = yedekOku(yedekAl(ORNEK));
ok(() => assert.deepEqual(y.surucular, ORNEK.surucular));
ok(() => assert.equal(y.kalanYaris, 2));
ok(() => assert.equal(y.toplamSurucu, 20));
ok(() => assert.throws(() => yedekOku('{"tur":"x"}')));
const bozuk = yedekOku(JSON.stringify({ tur: 'sampiyonluk-hesabi', sistem: 'yok', kalanYaris: -1, surucular: [{ ad: 'a', puan: -5 }, { ad: 'b', puan: 3, galibiyet: 'x' }] }));
ok(() => assert.equal(bozuk.sistem, 'f1'));
ok(() => assert.equal(bozuk.kalanYaris, 0));
ok(() => assert.deepEqual(bozuk.surucular, [D('b', 3, 0)]));

console.log(`${checks} kontrol geçti.`);
