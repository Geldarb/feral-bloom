// Layered SVG backgrounds per biome (sky gradient, far/mid silhouettes, ground, drifting particles).
const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const wrap = (id, inner) => `<svg class="bgsvg" viewBox="0 0 400 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${inner}</svg>`;

function swamp() {
  const r = rnd(7); let trees = '', reeds = '', flies = '';
  for (let i = 0; i < 6; i++) { const x = 20 + i * 72 + r() * 20, h = 170 + r() * 90; trees += `<g transform="translate(${x} 430)"><path d="M-7 0 C-5 -${h * .5} -9 -${h * .8} -4 -${h} L4 -${h} C8 -${h * .8} 5 -${h * .5} 8 0Z" fill="#0e1a14"/><path d="M0 -${h * .7} q-30 -10 -40 -34 M0 -${h * .8} q26 -8 38 -30 M0 -${h * .5} q-24 0 -34 -20" stroke="#0e1a14" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-30 -${h * .72} q-3 24 2 40 M24 -${h * .78} q4 20 -2 34" stroke="#18301f" stroke-width="3" fill="none"/></g>`; }
  for (let i = 0; i < 28; i++) { const x = r() * 400, h = 40 + r() * 60; reeds += `<path d="M${x} 600 q${r() * 10 - 5} -${h / 2} ${r() * 14 - 7} -${h}" stroke="${i % 3 ? '#16301d' : '#1d3d25'}" stroke-width="${2 + r() * 2}" fill="none" stroke-linecap="round"/>`; }
  for (let i = 0; i < 14; i++) flies += `<circle class="fx fly" style="animation-delay:${(r() * 6).toFixed(1)}s;animation-duration:${(5 + r() * 5).toFixed(1)}s" cx="${(r() * 400).toFixed(0)}" cy="${(180 + r() * 340).toFixed(0)}" r="${(1.4 + r() * 1.6).toFixed(1)}" fill="#d8ff8a"/>`;
  return wrap('s', `<defs><linearGradient id="bs1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1612"/><stop offset=".5" stop-color="#1b3a2a"/><stop offset="1" stop-color="#3a5a3a"/></linearGradient><radialGradient id="bs2" cx=".7" cy=".18" r=".5"><stop offset="0" stop-color="#e8ffd0" stop-opacity=".55"/><stop offset="1" stop-color="#e8ffd0" stop-opacity="0"/></radialGradient><linearGradient id="bs3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24402c"/><stop offset="1" stop-color="#0c1a12"/></linearGradient></defs>
<rect width="400" height="600" fill="url(#bs1)"/><rect width="400" height="600" fill="url(#bs2)"/><circle cx="290" cy="90" r="30" fill="#f2ffd8" opacity=".55"/>
<path d="M0 380 q60 -40 120 -10 t140 -6 t140 -16 V600H0Z" fill="#12261b" opacity=".9"/>${trees}
<rect y="420" width="400" height="30" fill="#9ad8a0" opacity=".08"/><path d="M0 440 q50 -14 100 0 t100 0 t100 0 t100 0 V600H0Z" fill="url(#bs3)"/>
<g opacity=".6"><path d="M0 470 h400" stroke="#a8ffc8" stroke-width="1" opacity=".18"/><ellipse class="fx mist" cx="120" cy="450" rx="120" ry="14" fill="#cfe8d0" opacity=".12"/><ellipse class="fx mist m2" cx="300" cy="480" rx="110" ry="12" fill="#cfe8d0" opacity=".1"/></g>${reeds}${flies}`);
}
function caves() {
  const r = rnd(11); let st = '', sg = '', cr = '', dr = '';
  for (let i = 0; i < 12; i++) { const x = i * 36 + r() * 14, h = 40 + r() * 90; st += `<path d="M${x - 14} -2 L${x} ${h} L${x + 14} -2Z" fill="${i % 2 ? '#14122a' : '#1c1a3a'}"/>`; }
  for (let i = 0; i < 9; i++) { const x = i * 48 + r() * 20, h = 50 + r() * 100; sg += `<path d="M${x - 20} 600 L${x} ${600 - h} L${x + 20} 600Z" fill="${i % 2 ? '#15132c' : '#201e42'}"/>`; }
  for (let i = 0; i < 6; i++) { const x = 30 + r() * 340, y = 300 + r() * 220, s = .6 + r() * .9; cr += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})" class="fx glint" style="animation-delay:${(r() * 3).toFixed(1)}s"><path d="M-8 0 L-5 -24 L0 -34 L6 -22 L8 0Z" fill="#8ab8ff" opacity=".85"/><path d="M8 0 L10 -16 L18 -8 L16 0Z" fill="#a8d0ff" opacity=".7"/><circle cy="-12" r="26" fill="#6aa0ff" opacity=".14"/></g>`; }
  for (let i = 0; i < 5; i++) dr += `<circle class="fx drop" style="animation-delay:${(r() * 4).toFixed(1)}s" cx="${(40 + r() * 320).toFixed(0)}" cy="${(60 + r() * 60).toFixed(0)}" r="2.2" fill="#b8d0ff"/>`;
  return wrap('c', `<defs><linearGradient id="bc1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07061a"/><stop offset=".55" stop-color="#16143a"/><stop offset="1" stop-color="#2a2a54"/></linearGradient><linearGradient id="bc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2850"/><stop offset="1" stop-color="#0c0a1c"/></linearGradient></defs>
<rect width="400" height="600" fill="url(#bc1)"/><path d="M0 300 q50 -50 100 -20 t110 -10 t110 -30 t80 20 V600H0Z" fill="#100e28"/>${cr}${st}${sg}
<path d="M0 470 q60 -18 130 -4 t140 0 t130 -10 V600H0Z" fill="url(#bc2)"/><ellipse class="fx mist" cx="200" cy="440" rx="190" ry="20" fill="#8aa0ff" opacity=".07"/>${dr}`);
}
function ashlands() {
  const r = rnd(23); let rocks = '', emb = '', cracks = '';
  for (let i = 0; i < 8; i++) { const x = i * 55 + r() * 20, h = 40 + r() * 70; rocks += `<path d="M${x - 24} 520 L${x - 6} ${520 - h} L${x + 10} ${520 - h * .7} L${x + 28} 520Z" fill="${i % 2 ? '#1a1010' : '#241614'}"/>`; }
  for (let i = 0; i < 22; i++) emb += `<circle class="fx ember" style="animation-delay:${(r() * 7).toFixed(1)}s;animation-duration:${(5 + r() * 5).toFixed(1)}s" cx="${(r() * 400).toFixed(0)}" cy="${(380 + r() * 220).toFixed(0)}" r="${(1.2 + r() * 1.8).toFixed(1)}" fill="${r() > .5 ? '#ffb040' : '#ff6a2a'}"/>`;
  for (let i = 0; i < 5; i++) cracks += `<path d="M${40 + i * 80} 600 l${r() * 20 - 10} -${20 + r() * 30} l${r() * 24 - 12} -${14 + r() * 20}" stroke="#ff7a2a" stroke-width="2.2" fill="none" class="fx glint" style="animation-delay:${(r() * 2).toFixed(1)}s"/>`;
  return wrap('a', `<defs><linearGradient id="ba1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0a0c"/><stop offset=".45" stop-color="#5a2018"/><stop offset=".8" stop-color="#b8502a"/><stop offset="1" stop-color="#e88a3a"/></linearGradient><radialGradient id="ba2" cx=".35" cy=".62" r=".5"><stop offset="0" stop-color="#ffd070" stop-opacity=".8"/><stop offset="1" stop-color="#ff7a2a" stop-opacity="0"/></radialGradient><linearGradient id="ba3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1612"/><stop offset="1" stop-color="#0e0706"/></linearGradient></defs>
<rect width="400" height="600" fill="url(#ba1)"/><rect width="400" height="600" fill="url(#ba2)"/><ellipse class="fx mist" cx="120" cy="150" rx="150" ry="22" fill="#2a1410" opacity=".5"/><ellipse class="fx mist m2" cx="300" cy="230" rx="130" ry="18" fill="#2a1410" opacity=".4"/>
<path d="M110 470 L170 330 L196 300 L226 300 L254 336 L330 470Z" fill="#1e100e"/><path d="M196 300 L226 300 l-6 -20 l-4 14 l-6 -18Z" fill="#ff8a30" opacity=".9"/><path d="M200 300 q10 60 -4 120 M222 302 q-6 50 10 110" stroke="#ff7a2a" stroke-width="3" fill="none" opacity=".7"/>
<path d="M0 430 L60 392 L110 430 L170 396 L230 440 L300 400 L360 436 L400 410 V600H0Z" fill="#190d0c"/>${rocks}<path d="M0 500 q70 -16 140 -4 t130 2 t130 -8 V600H0Z" fill="url(#ba3)"/>${cracks}${emb}`);
}
function title() {
  const r = rnd(5); let p = '';
  for (let i = 0; i < 26; i++) p += `<circle class="fx fly" style="animation-delay:${(r() * 6).toFixed(1)}s;animation-duration:${(6 + r() * 6).toFixed(1)}s" cx="${(r() * 400).toFixed(0)}" cy="${(r() * 600).toFixed(0)}" r="${(1 + r() * 2).toFixed(1)}" fill="${['#d8ff8a', '#ff9ac8', '#a8d8ff'][i % 3]}"/>`;
  return wrap('t', `<defs><radialGradient id="bt1" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#3a1f3a"/><stop offset=".5" stop-color="#15221a"/><stop offset="1" stop-color="#070b08"/></radialGradient></defs><rect width="400" height="600" fill="url(#bt1)"/>
<g opacity=".85" transform="translate(200 330)">${[0, 1, 2, 3, 4, 5, 6].map(i => `<path transform="rotate(${i * 51.4})" d="M0 0 C-30 -40 -26 -120 0 -170 C26 -120 30 -40 0 0Z" fill="${i % 2 ? '#2c1a2e' : '#3a2040'}" opacity=".55"/>`).join('')}<circle r="22" fill="#ffd070" opacity=".35"/></g>
<path d="M0 520 q80 -30 160 -6 t120 -4 t120 -14 V600H0Z" fill="#0c140e"/>${p}`);
}
const MAP = { swamp, caves, ashlands, title };
export const biomeBg = b => (MAP[b] || swamp)();
