// Şampiyonluk Hesabı: puan tablosunda kim hâlâ şampiyon olabilir, lider neyle garantiler?

export const SISTEMLER = {
  f1: { ad: 'Formula 1', yaris: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], sprint: [8, 7, 6, 5, 4, 3, 2, 1] },
  motogp: { ad: 'MotoGP', yaris: [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], sprint: [12, 9, 7, 6, 5, 4, 3, 2, 1] },
  ozel: { ad: 'Kendi ligim', yaris: [10, 8, 6, 5, 4, 3, 2, 1], sprint: [] },
};

// "10, 8, 6" -> [10, 8, 6]  (büyükten küçüğe olmalı, eksi olamaz)
export function puanListesi(yazi) {
  const p = String(yazi).split(/[\s,;]+/).filter(Boolean).map(Number);
  if (!p.length || p.length > 40 || p.some(x => !Number.isInteger(x) || x < 0 || x > 1000)) return null;
  for (let i = 1; i < p.length; i++) if (p[i] > p[i - 1]) return null;
  return p;
}

export function puanlar(ayar) {
  if (ayar.sistem === 'ozel') return { yaris: ayar.ozelYaris?.length ? ayar.ozelYaris : SISTEMLER.ozel.yaris, sprint: ayar.ozelSprint || [] };
  return SISTEMLER[ayar.sistem] || SISTEMLER.f1;
}

// Kalan yarışlarda bir kişinin alabileceği en fazla puan
export function kalanMax(ayar) {
  const p = puanlar(ayar);
  return (ayar.kalanYaris || 0) * (p.yaris[0] || 0) + (ayar.kalanSprint || 0) * (p.sprint[0] || 0);
}

// Puan tablosu: puan, sonra galibiyet sayısı
export function sirala(surucular) {
  return [...surucular].sort((a, b) => b.puan - a.puan || (b.galibiyet || 0) - (a.galibiyet || 0) || a.ad.localeCompare(b.ad, 'tr'));
}

// Her sürücünün durumu
// 'sampiyon' : lider ve artık kimse yetişemez
// 'var'      : hepsini kazanırsa lideri geçebilir
// 'esitlik'  : en iyi ihtimalle lidere ancak eşit olur (galibiyet sayısı belirler)
// 'yok'      : matematiksel olarak bitti
export function tablo(ayar) {
  const s = sirala(ayar.surucular);
  if (!s.length) return { satirlar: [], kalan: kalanMax(ayar), kesin: false };
  const kalan = kalanMax(ayar);
  const lider = s[0];
  const ikinci = s[1];
  const kesin = !ikinci || lider.puan > ikinci.puan + kalan;
  const satirlar = s.map((d, i) => {
    let durum;
    if (i === 0) durum = kesin ? 'sampiyon' : 'lider';
    else if (d.puan + kalan > lider.puan) durum = 'var';
    else if (d.puan + kalan === lider.puan) {
      // Ancak eşitlenebiliyor. Bunun için liderin hiç puan almaması gerekir; o zaman galibiyet sayısına bakılır.
      // Kalan bütün yarışları kazansa bile liderin galibiyetine yetişemiyorsa şansı yok.
      durum = (d.galibiyet || 0) + (ayar.kalanYaris || 0) >= (lider.galibiyet || 0) ? 'esitlik' : 'yok';
    }
    else durum = 'yok';
    return { ...d, sira: i + 1, fark: lider.puan - d.puan, enFazla: d.puan + kalan, durum };
  });
  return { satirlar, kalan, kesin };
}

// --- Bu yarışta lider neyle garantiler? ---
// tur: 'yaris' | 'sprint'. Lider a. olursa (0 = puansız), en yakın rakip en iyi kaçıncı olursa yine de şampiyon olur?
// Diğer sürücülerin her biri ayrı ayrı boş kalan en iyi yeri alabilir; bu yüzden hepsine karşı ayrı ayrı bakıyorum.
export function garanti(ayar, tur = 'yaris') {
  const s = sirala(ayar.surucular);
  if (s.length < 2) return null;
  const p = puanlar(ayar)[tur];
  if (!p?.length || (tur === 'yaris' ? ayar.kalanYaris : ayar.kalanSprint) < 1) return null;
  const kalanSonra = kalanMax(ayar) - p[0];
  const P = pos => (pos >= 1 && pos <= p.length ? p[pos - 1] : 0);
  const n = p.length;
  const [L, R, ...digerleri] = s;
  const enIyiBos = (a, b) => { for (let k = 1; k <= n + 1; k++) if (k !== a && k !== b) return k; return n + 1; };
  const satirlar = [];
  for (let a = 1; a <= n + 1; a++) {
    const liderSon = L.puan + P(a);
    const tutar = b => {
      if (a === b && a <= n) return false;                    // iki kişi aynı yerde olamaz
      if (liderSon <= R.puan + P(b) + kalanSonra) return false;
      const k = enIyiBos(a, b);
      return digerleri.every(d => liderSon > d.puan + P(k) + kalanSonra);
    };
    // Rakip ne kadar geride kalırsa lider için o kadar iyi. En iyi hangi yerden itibaren yetiyor?
    let enIyi = null;
    for (let b = n + 1; b >= 1; b--) {
      if (b === a && a <= n) continue;
      if (tutar(b)) enIyi = b; else break;
    }
    satirlar.push({ lider: a, rakipEnIyi: enIyi, herDurumda: enIyi !== null && (enIyi === 1 || (a === 1 && enIyi === 2)) });
  }
  return { lider: L.ad, rakip: R.ad, tur, puansizYer: n + 1, satirlar, kalanSonra };
}

// --- Rastgele simülasyon ---
// Her sürücünün gücü şimdiye kadarki yarış başı puanından geliyor.
// Sıralama Plackett-Luce yöntemiyle: güçlü olan önde bitmeye daha yatkın ama kesin değil.
export function rastgele(tohum) {
  let s = tohum >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function simule(ayar, kac = 5000, tohum = 42) {
  const s = sirala(ayar.surucular);
  const sayac = new Map(s.map(d => [d.ad, 0]));
  if (!s.length) return [];
  const p = puanlar(ayar);
  const yapilan = Math.max(1, ayar.yapilanYaris || 1);
  // Tabloda olmayan sürücüler de yarışıyor (puanları 0 kabul): yoksa listedeki birkaç kişi bütün puanları paylaşırdı.
  const hayalet = Math.max(0, (ayar.toplamSurucu || 20) - s.length);
  const guc = [...s.map(d => Math.pow(d.puan / yapilan + 1, 1.6)), ...Array(hayalet).fill(1)];
  const rnd = rastgele(tohum);
  const etkinlikler = [...Array(ayar.kalanYaris || 0).fill(p.yaris), ...Array(ayar.kalanSprint || 0).fill(p.sprint)];
  for (let t = 0; t < kac; t++) {
    const puan = guc.map((_, i) => s[i]?.puan || 0), gal = guc.map((_, i) => s[i]?.galibiyet || 0);
    for (const tablo of etkinlikler) {
      const kalanlar = guc.map((_, i) => i);
      for (let yer = 0; yer < tablo.length && kalanlar.length; yer++) {
        let toplam = 0; for (const i of kalanlar) toplam += guc[i];
        let r = rnd() * toplam, sec = kalanlar.length - 1;
        for (let k = 0; k < kalanlar.length; k++) { r -= guc[kalanlar[k]]; if (r <= 0) { sec = k; break; } }
        const i = kalanlar.splice(sec, 1)[0];
        puan[i] += tablo[yer];
        if (yer === 0 && tablo === p.yaris) gal[i]++;
      }
    }
    let en = 0;
    for (let i = 1; i < s.length; i++) if (puan[i] > puan[en] || (puan[i] === puan[en] && gal[i] > gal[en])) en = i;
    sayac.set(s[en].ad, sayac.get(s[en].ad) + 1);
  }
  return s.map(d => ({ ad: d.ad, oran: sayac.get(d.ad) / kac }));
}

// --- Uydurma örnek: gerçek sürücüler değil ---
export const ORNEK = {
  sistem: 'f1',
  kalanYaris: 2, kalanSprint: 1, yapilanYaris: 22, toplamSurucu: 20,
  surucular: [
    { ad: 'Kırmızı Roket', puan: 341, galibiyet: 7 },
    { ad: 'Mavi Şimşek', puan: 322, galibiyet: 6 },
    { ad: 'Turuncu Kaplan', puan: 298, galibiyet: 4 },
    { ad: 'Yeşil Kasırga', puan: 283, galibiyet: 3 },
    { ad: 'Mor Fırtına', puan: 190, galibiyet: 1 },
    { ad: 'Gri Hayalet', puan: 120, galibiyet: 0 },
  ],
};

export function yedekAl(v) { return JSON.stringify({ tur: 'sampiyonluk-hesabi', surum: 1, ...v }, null, 2); }
export function yedekOku(metin) {
  const d = JSON.parse(metin);
  if (d?.tur !== 'sampiyonluk-hesabi' || !Array.isArray(d.surucular)) throw new Error('Bu dosya bir Şampiyonluk Hesabı yedeği değil.');
  const tam = (x, ust) => Number.isInteger(x) && x >= 0 && x <= ust;
  const temizListe = x => (Array.isArray(x) ? puanListesi(x.join(',')) : null);
  return {
    sistem: SISTEMLER[d.sistem] ? d.sistem : 'f1',
    ozelYaris: temizListe(d.ozelYaris) || SISTEMLER.ozel.yaris,
    ozelSprint: (Array.isArray(d.ozelSprint) && d.ozelSprint.length ? temizListe(d.ozelSprint) : []) || [],
    kalanYaris: tam(d.kalanYaris, 60) ? d.kalanYaris : 0,
    kalanSprint: tam(d.kalanSprint, 60) ? d.kalanSprint : 0,
    yapilanYaris: tam(d.yapilanYaris, 200) ? d.yapilanYaris : 1,
    toplamSurucu: tam(d.toplamSurucu, 100) && d.toplamSurucu > 0 ? d.toplamSurucu : 20,
    surucular: d.surucular.filter(s => s && tam(s.puan, 100000)).slice(0, 30)
      .map(s => ({ ad: String(s.ad || 'İsimsiz').slice(0, 30), puan: s.puan, galibiyet: tam(s.galibiyet, 200) ? s.galibiyet : 0 })),
  };
}
