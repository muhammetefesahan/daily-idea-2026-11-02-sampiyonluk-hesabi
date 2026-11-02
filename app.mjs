import { SISTEMLER, puanListesi, puanlar, kalanMax, tablo, garanti, simule, ORNEK, yedekAl, yedekOku } from './core.mjs';

const $ = id => document.getElementById(id);
const ANAHTAR = 'sampiyonluk-hesabi-v1';
const BOS = { sistem: 'f1', ozelYaris: SISTEMLER.ozel.yaris, ozelSprint: [], kalanYaris: 3, kalanSprint: 0, yapilanYaris: 10, toplamSurucu: 20, surucular: [] };

let veri = structuredClone(BOS);
let tur = 'yaris';
let tohum = 42;

function kaydet() { try { localStorage.setItem(ANAHTAR, yedekAl(veri)); } catch { /* özel pencere */ } }
function yukle() { try { const m = localStorage.getItem(ANAHTAR); if (m) veri = yedekOku(m); } catch { /* bozuk */ } }

const kacama = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sayi = n => n.toLocaleString('tr-TR');
const yerYazi = (y, n) => (y > n ? 'puansız' : `${y}.`);
const ROZET = { sampiyon: '🏆 Şampiyon', lider: 'Lider', var: 'Şansı var', esitlik: 'Ancak eşitlik', yok: 'Bitti' };

// ---------- Ayarlar ----------
function ayarlariDoldur() {
  $('sistem').value = veri.sistem;
  $('kalanYaris').value = veri.kalanYaris;
  $('kalanSprint').value = veri.kalanSprint;
  $('yapilanYaris').value = veri.yapilanYaris;
  $('ozelYaris').value = (veri.ozelYaris || []).join(', ');
  $('ozelSprint').value = (veri.ozelSprint || []).join(', ');
  document.querySelectorAll('.ozel').forEach(e => e.hidden = veri.sistem !== 'ozel');
}
$('sistem').onchange = () => { veri.sistem = $('sistem').value; ayarlariDoldur(); kaydet(); hesapla(); };
for (const [id, ust, alt] of [['kalanYaris', 60, 0], ['kalanSprint', 60, 0], ['yapilanYaris', 200, 1]]) {
  $(id).oninput = () => {
    const v = Math.round(+$(id).value);
    const iyi = $(id).value !== '' && Number.isFinite(v) && v >= alt && v <= ust;
    $(id).classList.toggle('hatali', !iyi);
    if (iyi) { veri[id] = v; kaydet(); hesapla(); }
  };
}
for (const id of ['ozelYaris', 'ozelSprint']) {
  $(id).oninput = () => {
    const bos = id === 'ozelSprint' && !$(id).value.trim();
    const l = bos ? [] : puanListesi($(id).value);
    $(id).classList.toggle('hatali', l === null);
    if (l !== null) { veri[id] = l; kaydet(); hesapla(); }
  };
}

// ---------- Girdi tablosu ----------
function girdiCiz() {
  const tb = $('girdi');
  tb.innerHTML = '';
  veri.surucular.forEach((d, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input maxlength="30" value="${kacama(d.ad)}" aria-label="${i + 1}. sürücünün adı"></td>
      <td><input type="number" min="0" step="1" value="${d.puan}" aria-label="${i + 1}. sürücünün puanı"></td>
      <td><input type="number" min="0" step="1" value="${d.galibiyet}" aria-label="${i + 1}. sürücünün galibiyeti"></td>
      <td><button class="sil" aria-label="${i + 1}. sürücüyü sil">×</button></td>`;
    const [ad, puan, gal] = tr.querySelectorAll('input');
    ad.oninput = () => { d.ad = ad.value.trim() || `Sürücü ${i + 1}`; kaydet(); hesapla(); };
    const sayiAlan = (el, alan) => () => {
      const v = Math.round(+el.value), iyi = el.value !== '' && v >= 0 && v <= 100000;
      el.classList.toggle('hatali', !iyi);
      if (iyi) { d[alan] = v; kaydet(); hesapla(); }
    };
    puan.oninput = sayiAlan(puan, 'puan');
    gal.oninput = sayiAlan(gal, 'galibiyet');
    tr.querySelector('.sil').onclick = () => { veri.surucular.splice(i, 1); kaydet(); girdiCiz(); hesapla(); };
    tb.append(tr);
  });
}
$('ekle').onclick = () => {
  if (veri.surucular.length >= 30) return;
  veri.surucular.push({ ad: `Sürücü ${veri.surucular.length + 1}`, puan: 0, galibiyet: 0 });
  kaydet(); girdiCiz(); hesapla();
  $('girdi').lastElementChild?.querySelector('input')?.select();
};

// ---------- Sonuçlar ----------
function tabloCiz(t) {
  const p = puanlar(veri);
  $('sistemYazi').textContent = `Yarış: ${p.yaris.join(', ')}${p.sprint.length ? ` · Sprint: ${p.sprint.join(', ')}` : ''}. Kalan en fazla puan: ${sayi(kalanMax(veri))}.`;
  if (!t.satirlar.length) { $('ozet').textContent = 'Önce puan tablosuna birkaç sürücü eklemeliyim.'; $('tablo').innerHTML = ''; return; }
  const lider = t.satirlar[0];
  const sansli = t.satirlar.filter(x => x.durum === 'var' || x.durum === 'esitlik');
  $('ozet').innerHTML = t.kesin
    ? `🏆 <b>${kacama(lider.ad)}</b> şampiyon! Kalan ${sayi(t.kalan)} puanla kimse yetişemez.`
    : `Kalan en fazla <b>${sayi(t.kalan)}</b> puan var. <b>${kacama(lider.ad)}</b> lider; ${sansli.length ? `${sansli.length} kişinin hâlâ şansı var.` : 'kimse geçemez ama eşitlik ihtimali kaldı.'}`;
  const enCok = Math.max(...t.satirlar.map(x => x.enFazla), 1);
  $('tablo').innerHTML = t.satirlar.map(x => `<div class="satir ${x.durum}">
      <span class="sira">${x.sira}</span>
      <div class="govde">
        <div class="ust"><span class="ad">${kacama(x.ad)}</span><span class="puan">${sayi(x.puan)}${x.sira > 1 ? ` (−${sayi(x.fark)})` : ''} · en fazla ${sayi(x.enFazla)}</span></div>
        <div class="cubuk"><i class="olasi" style="width:${x.enFazla / enCok * 100}%"></i><i class="simdi" style="width:${x.puan / enCok * 100}%"></i><i class="cizgi" style="left:${lider.puan / enCok * 100}%"></i></div>
      </div>
      <span class="rozet ${x.durum}">${ROZET[x.durum]}</span>
    </div>`).join('');
}

function garantiCiz(t) {
  const sprintVar = (veri.kalanSprint || 0) > 0 && puanlar(veri).sprint.length > 0;
  const yarisVar = (veri.kalanYaris || 0) > 0;
  if (tur === 'sprint' && !sprintVar) tur = 'yaris';
  if (tur === 'yaris' && !yarisVar && sprintVar) tur = 'sprint';
  document.querySelectorAll('[data-tur]').forEach(b => {
    b.classList.toggle('secili', b.dataset.tur === tur);
    b.disabled = b.dataset.tur === 'sprint' ? !sprintVar : !yarisVar;
  });
  const ol = $('garanti');
  if (t.satirlar.length < 2) { $('garantiBaslik').textContent = 'Lider bu yarışta neyle garantiler?'; ol.innerHTML = '<li class="bilgi">En az iki sürücü gerekli.</li>'; return; }
  const lider = t.satirlar[0].ad, rakip = t.satirlar[1].ad;
  $('garantiBaslik').textContent = `${lider} bu ${tur === 'sprint' ? 'sprintte' : 'yarışta'} neyle garantiler?`;
  if (t.kesin) { ol.innerHTML = '<li class="bilgi">Şampiyonluk zaten kesinleşti. 🏆</li>'; return; }
  const g = garanti(veri, tur);
  if (!g) { ol.innerHTML = '<li class="bilgi">Kalan yarış yok.</li>'; return; }
  const n = g.puansizYer - 1;
  const iyiler = g.satirlar.filter(x => x.rakipEnIyi !== null);
  if (!iyiler.length) {
    ol.innerHTML = `<li class="bilgi">Bu ${tur === 'sprint' ? 'sprintte' : 'yarışta'} ne olursa olsun şampiyonluk kesinleşmez. Sonraki yarışlara kalıyor.</li>`;
    return;
  }
  // Gösterilecek: garantiye yeten bütün yerler + yetmeyen ilk yer
  const sonIyi = Math.max(...iyiler.map(x => x.lider));
  ol.innerHTML = g.satirlar.filter(x => x.lider <= sonIyi + 1).map(x => {
    const yer = x.lider > n ? 'Puansız kalırsa' : `${x.lider}. olursa`;
    if (x.rakipEnIyi === null) return `<li class="hayir"><span class="yer">${yer}</span><span>Garanti edemez${x.lider === sonIyi + 1 && x.lider <= n ? '; daha gerisi de yetmez' : ''}.</span></li>`;
    if (x.herDurumda) return `<li class="evet"><span class="yer">${yer}</span><span>Rakipler ne yaparsa yapsın şampiyon. 🏆</span></li>`;
    const kosul = x.rakipEnIyi === 2 ? ' <b>kazanmamalı</b>' : ` <b>${yerYazi(x.rakipEnIyi, n)}</b>${x.rakipEnIyi > n ? ' kalmalı' : ' ya da daha geride kalmalı'}`;
    return `<li class="kosul"><span class="yer">${yer}</span><span>${kacama(rakip)}${kosul}.</span></li>`;
  }).join('') + `<li class="bilgi">Diğerlerinin de yetişemeyeceğine baktım. Puanlar eşit biterse galibiyet sayısı belirler; bunu garanti saymadım.</li>`;
}

function simCiz() {
  const s = simule(veri, 5000, tohum);
  $('sim').innerHTML = s.length ? s.map(x => `<div class="s"><span>${kacama(x.ad)}</span><div class="bar"><i style="width:${x.oran * 100}%"></i></div><span class="yuzde">%${(x.oran * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</span></div>`).join('')
    : '<p class="not">Sürücü eklemeliyim.</p>';
}

function hesapla() {
  const t = tablo(veri);
  tabloCiz(t); garantiCiz(t); simCiz();
}

document.querySelectorAll('[data-tur]').forEach(b => b.onclick = () => { tur = b.dataset.tur; garantiCiz(tablo(veri)); });
$('tekrar').onclick = () => { tohum = (tohum * 1103515245 + 12345) >>> 0; simCiz(); };

// ---------- Örnek, yedek, sıfırla ----------
function hepsi() { ayarlariDoldur(); girdiCiz(); hesapla(); }
$('ornek').onclick = () => { veri = { ...structuredClone(BOS), ...structuredClone(ORNEK) }; kaydet(); hepsi(); $('islemYazi').textContent = 'Örnek yüklendi. Sürücüler ve puanlar uydurma.'; };
$('yedekAl').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([yedekAl(veri)], { type: 'application/json' }));
  a.download = 'sampiyonluk-yedek.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('yedekYukle').onchange = async ev => {
  const f = ev.target.files[0];
  if (!f) return;
  try { veri = yedekOku(await f.text()); kaydet(); hepsi(); $('islemYazi').textContent = `Yedek yüklendi: ${veri.surucular.length} sürücü.`; }
  catch (err) { $('islemYazi').textContent = err instanceof SyntaxError ? 'Bu dosyayı okuyamadım.' : err.message; }
  ev.target.value = '';
};
$('sifirla').onclick = () => {
  if (!confirm('Puan tablosu silinsin mi?')) return;
  veri.surucular = []; kaydet(); hepsi();
  $('islemYazi').textContent = 'Tablo silindi.';
};

yukle();
if (new URLSearchParams(location.search).has('ornek')) veri = { ...structuredClone(BOS), ...structuredClone(ORNEK) };
hepsi();
