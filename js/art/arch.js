// Archetypes: hand-authored body plans. Each part returns SVG (string) or {b: behind-body layer, f: front layer}.
// All art faces RIGHT in a 300x220 box (enemies are mirrored by the renderer). A = anchors used for overlays, stumps, bars.
import { T, N, S, HL, SH, circ, ell, eye, teeth, LINE, mix } from './kit.js';

const tr = (s, x, y, extra = '') => `<g transform="translate(${x} ${y}) ${extra}">${s}</g>`;
const leg = (pts, w, fill, k) => { const d = 'M' + pts.map(p => p.join(' ')).join(' L'); return S(d, LINE, w + 6) + S(d, fill, w); };
const nz = (k, s) => s; // placeholder for variants

// ======================= QUAD (fox / wolf / cub / mole) =======================
const HEADS_QUAD = {
  cub: 'M196 98 C192 64 214 42 244 42 C270 42 286 60 286 82 C292 86 294 94 290 100 C285 108 276 110 268 110 C260 122 238 126 222 122 C206 118 198 112 196 98Z',
  long: 'M194 98 C190 66 210 46 238 46 C256 46 270 54 276 66 C284 68 296 80 296 90 C294 100 284 106 272 108 C264 120 240 126 222 122 C206 118 196 112 194 98Z',
};
const quad = {
  A: { head: [242, 78], eyes: [250, 78], jaws: [268, 116], fore: [198, 160], hind: [100, 160], tail: [46, 96], back: [150, 62], torso: [150, 116], ext1: [112, 40], ext2: [196, 30] },
  order: ['tail', 'hind', 'torso', 'back', 'fore', 'head', 'jaws', 'eyes', 'ext1', 'ext2'],
  cosmetic: ['hind', 'fore', 'tail'],
  parts: {
    tail: k => {
      const t = k.o.tail || 'bushy';
      let s;
      if (t === 'thin') s = T('M96 108 C70 104 46 90 30 66 C26 60 20 64 22 72 C28 106 56 132 96 130Z', k.f) + HL('M90 108 C70 104 50 92 36 74');
      else if (t === 'club') s = T('M96 108 C70 112 48 120 30 130 C18 126 8 132 12 144 C20 156 40 152 46 146 C66 138 84 134 98 128Z', k.f) + T('M12 144 C4 130 22 120 34 128 C46 136 44 150 30 154 C20 154 14 150 12 144Z', k.fd);
      else if (t === 'stub') s = T('M96 108 C78 104 64 106 56 114 C60 128 80 132 96 128Z', k.f);
      else s = T('M94 104 C66 104 40 88 28 60 C22 54 18 62 20 72 C22 108 46 142 84 146 C98 142 102 120 94 104Z', k.f) + T('M28 60 C22 54 18 62 20 72 C21 86 26 98 34 110 C44 100 48 84 44 72 C38 70 32 66 28 60Z', k.fa) + HL('M90 106 C70 104 50 90 38 72');
      return { b: s };
    },
    hind: k => {
      const leg1 = 'M82 122 C68 138 68 164 80 182 C76 188 72 194 74 199 C84 203 106 203 112 199 C114 193 106 190 102 186 C112 170 124 150 122 126 C110 116 92 114 82 122Z';
      return { b: tr(T(leg1, k.fd), 22, -4), f: T(leg1, k.f) + S('M84 199 v-5 M93 200 v-5 M102 199 v-5', LINE, 2) + HL('M84 128 C78 144 80 160 86 172') };
    },
    fore: k => {
      const leg1 = 'M184 126 C178 148 182 168 186 184 C182 190 180 196 184 200 C194 204 214 204 220 200 C220 194 212 190 208 186 C212 168 214 148 208 126 C202 118 190 118 184 126Z';
      return { b: tr(T(leg1, k.fd), -24, -3), f: T(leg1, k.f) + S('M190 201 v-5 M199 202 v-5 M208 201 v-5', LINE, 2) + HL('M190 130 C186 146 188 160 192 172') };
    },
    torso: k => {
      const c = k.cos;
      return (c.hind ? quad.parts.hind(k).b + quad.parts.hind(k).f : '') + (c.fore ? quad.parts.fore(k).b + quad.parts.fore(k).f : '') + (c.tail ? quad.parts.tail(k).b : '') +
        T('M88 118 C80 86 112 70 150 70 C188 70 214 84 214 112 C214 142 192 160 150 162 C110 164 92 148 88 118Z', k.f) +
        N('M100 138 C120 154 182 154 206 132 C208 150 186 162 150 162 C118 162 102 154 100 138Z', k.fs) + HL('M110 92 C126 80 152 76 176 80') +
        (c.head ? quad.parts.head(k) : '');
    },
    back: k => T('M110 80 C118 62 130 52 142 66 C148 46 164 46 172 66 C182 54 194 60 198 80 C176 72 130 72 110 80Z', k.fa),
    head: k => {
      const ear = k.o.ears || 'pointy';
      let ears = '';
      if (ear === 'round') ears = T('M206 62 C190 56 186 36 200 28 C212 24 224 36 224 52Z', k.fd) + T('M246 50 C246 34 258 24 270 30 C278 38 274 54 262 58Z', k.fd) + N('M200 52 C198 44 202 38 208 38 C212 44 212 50 210 56Z', k.P.pink) ;
      else if (ear === 'long') ears = T('M206 66 C190 40 192 18 204 6 C220 18 232 38 238 58Z', k.fd) + T('M240 52 C244 30 256 14 270 8 C274 26 268 46 260 60Z', k.f) + N('M206 50 C200 36 202 24 206 18 C214 28 220 40 224 52Z', k.P.pink);
      else ears = T('M206 66 C198 42 202 24 212 12 C226 24 236 42 240 58Z', k.fd) + T('M242 52 C246 32 258 18 270 16 C272 32 266 48 260 60Z', k.f) + N('M210 54 C208 40 210 30 214 24 C222 32 228 42 230 54Z', k.P.pink) + N('M250 44 C252 34 258 26 264 24 C264 34 262 42 258 50Z', k.P.pink);
      const head = T(HEADS_QUAD[k.o.snout === 'long' ? 'long' : 'cub'], k.f);
      const cheek = T('M198 104 C206 122 224 130 242 128 C228 120 214 112 208 98Z', k.fa);
      const nose = k.o.snout === 'long' ? ell(290, 88, 6, 5, k.o.noseCol || LINE) : ell(286, 90, 5.5, 4.5, k.o.noseCol || LINE);
      return ears + head + cheek + HL('M214 56 C228 46 252 46 268 56') + nose + circ(k.o.snout === 'long' ? 289 : 285, 88, 1.6, '#fff', 'opacity=".7"');
    },
    jaws: k => N('M244 106 C262 114 282 112 292 102 L292 112 C280 122 260 124 246 118Z', '#3a0b10') +
      T('M238 112 C256 118 280 116 292 106 C292 124 270 136 250 134 C240 132 236 122 238 112Z', k.fs) + S('M246 126 C260 130 272 128 284 120', LINE, 1.6, 'opacity=".4"') + teeth(254, 112, 3, 5, 10),
    eyes: k => eye(250, 78, 11, k.P, { mood: k.mood }),
  },
};

// ======================= LIZARD (newt / axolotl / toad) =======================
const lizard = {
  A: { head: [244, 96], eyes: [244, 84], jaws: [262, 142], fore: [180, 170], hind: [90, 168], tail: [40, 150], back: [140, 82], torso: [146, 130], ext1: [100, 62], ext2: [190, 50] },
  order: ['tail', 'hind', 'torso', 'back', 'fore', 'head', 'jaws', 'eyes', 'ext1', 'ext2'],
  cosmetic: ['hind', 'fore'],
  parts: {
    tail: k => {
      const t = k.o.tail || 'long';
      if (t === 'stub') return { b: T('M78 138 C62 138 52 146 50 158 C64 158 80 156 92 150Z', k.f) };
      let s = T('M82 124 C58 126 34 138 14 162 C6 174 12 182 26 178 C54 170 78 162 98 150Z', k.f) + HL('M80 130 C58 132 40 144 24 164');
      if (t === 'fin') s = T('M80 116 C56 100 34 108 18 134 C46 128 66 130 86 134Z', k.fa) + s;
      return { b: s };
    },
    hind: k => {
      const l = 'M84 146 C68 154 58 170 54 188 C50 196 54 203 62 203 L86 203 C94 198 90 192 96 186 C106 176 120 168 124 154Z';
      return { b: tr(T(l, k.fd), 24, -6), f: T(l, k.f) + S('M58 203 v-6 M68 203 v-6 M78 203 v-6', LINE, 2) };
    },
    fore: k => {
      const l = 'M178 150 C190 164 200 180 202 192 C204 200 200 204 192 204 L170 204 C166 198 172 192 176 188 C170 178 160 170 156 158Z';
      return { b: tr(T(l, k.fd), -28, -4), f: T(l, k.f) + S('M174 204 v-6 M184 205 v-6 M194 204 v-6', LINE, 2) };
    },
    torso: k => {
      const c = k.cos;
      return (c.hind ? lizard.parts.hind(k).b + lizard.parts.hind(k).f : '') + (c.fore ? lizard.parts.fore(k).b + lizard.parts.fore(k).f : '') +
        T('M68 134 C64 100 100 86 144 86 C190 86 224 100 224 132 C224 158 196 170 148 170 C100 170 72 162 68 134Z', k.f) +
        N('M88 150 C108 166 192 168 214 142 C216 160 192 172 148 172 C110 172 90 164 88 150Z', k.fs) + HL('M96 102 C116 92 150 90 180 96');
    },
    back: k => T('M90 94 C106 74 126 72 140 84 C152 68 174 70 190 90 C160 94 120 94 90 94Z', k.fa),
    head: k => {
      const toad = k.o.head === 'toad';
      const d = toad ? 'M196 116 C190 86 214 66 246 68 C272 70 290 88 290 112 C290 130 274 138 252 138 C226 140 200 134 196 116Z'
        : 'M200 112 C196 88 216 72 244 74 C268 76 286 92 288 112 C288 126 274 134 254 134 C230 136 204 130 200 112Z';
      let s = '';
      if (toad) s += T('M222 80 C214 62 230 52 244 58 C256 66 254 80 244 88Z', k.f) + T('M262 82 C258 66 270 58 280 64 C290 72 286 84 274 90Z', k.f);
      return s + T(d, k.f) + HL('M214 92 C230 80 256 80 272 90') + (toad ? circ(262, 74, 3, k.P.dark, 'opacity=".5"') + circ(232, 72, 2.5, k.P.dark, 'opacity=".5"') : '') + circ(282, 100, 2.4, LINE) + circ(276, 96, 2, LINE);
    },
    jaws: k => N('M214 126 C238 136 270 136 288 120 L288 130 C270 146 238 146 218 134Z', '#3a0b10') +
      T('M218 130 C240 142 272 142 288 124 C292 144 270 158 246 156 C230 154 220 144 218 130Z', k.fs) + S('M214 124 C240 136 272 134 288 118', LINE, 3) + (k.o.fangs ? teeth(238, 130, 3, 5, 14) : ''),
    eyes: k => k.o.head === 'toad' ? eye(246, 76, 12, k.P, { mood: k.mood }) + eye(274, 76, 9, k.P, { mood: k.mood }) : eye(250, 88, 10, k.P, { mood: k.mood }),
  },
};

// ======================= SERPENT (eel / worm / wyrm / hydra) =======================
function neckHead(k, x0, y0, cx, cy, x1, y1, sc = 0.8, ang = 0) {
  const d = `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`;
  const head = T('M-16 -8 C-14 -22 6 -26 20 -18 C32 -14 40 -6 38 3 C34 10 22 10 14 10 C6 16 -10 16 -16 4Z', k.f) + N('M0 6 C14 10 28 8 36 2 L36 6 C26 16 10 16 0 10Z', '#3a0b10') + T('M2 8 C14 12 28 10 38 4 C36 18 20 22 8 18Z', k.fs) + teeth(12, 8, 2, 4, 9) + eye(10, -8, 6.5, k.P, { mood: 'angry' }) + circ(34, -2, 2, LINE);
  return S(d, LINE, 26) + S(d, k.fd, 20) + S(d, k.f, 14) + S(d, '#fff', 3, 'opacity=".25" transform="translate(-3 -2)"') + `<g transform="translate(${x1} ${y1}) rotate(${ang}) scale(${sc})">${head}</g>`;
}
const serpent = {
  A: { head: [250, 82], eyes: [254, 78], jaws: [262, 116], fore: [200, 160], hind: [100, 170], tail: [30, 176], back: [130, 134], torso: [150, 164], ext1: [118, 150], ext2: [190, 170] },
  order: ['tail', 'torso', 'back', 'fore', 'head', 'jaws', 'eyes', 'ext1', 'ext2'],
  cosmetic: ['tail'],
  parts: {
    tail: k => ({ b: T('M66 150 C46 150 26 162 8 184 C28 192 50 196 66 190Z', k.f) + HL('M60 154 C44 156 30 166 16 180') }),
    torso: k => (k.cos.tail ? serpent.parts.tail(k).b : '') + T('M64 150 C98 138 130 134 162 148 C188 158 198 128 214 100 L252 112 C242 158 220 202 164 204 C118 208 90 198 60 190Z', k.f) +
      N('M80 192 C116 202 160 204 192 182 C210 166 228 146 240 122 L248 126 C236 162 216 198 168 206 C126 210 96 202 80 192Z', k.fs) + HL('M72 152 C100 142 130 138 160 150') +
      [0, 1, 2, 3, 4, 5].map(i => S(`M${92 + i * 22} ${186 + (i % 2) * 4} l0 12`, LINE, 1.6, 'opacity=".25"')).join(''),
    back: k => k.o.noFins ? '' : T('M92 146 L100 124 L110 140 L122 116 L134 136 L148 112 L158 134 L172 120 L180 146Z', k.fa),
    fore: k => T('M194 150 C206 160 216 174 214 188 C202 180 190 172 184 158Z', k.fa),
    head: k => {
      const wy = k.o.head === 'dragon';
      return (wy ? T('M216 90 C214 70 220 50 232 40 C238 56 240 72 240 84Z', k.fa) + T('M236 76 C236 56 244 40 256 32 C260 48 258 64 254 76Z', k.fa) : '') +
        T('M212 100 C210 76 230 60 256 62 C276 64 290 78 290 90 C290 100 278 106 262 108 C246 114 224 116 212 100Z', k.f) + HL('M224 76 C238 66 258 66 274 74') + circ(284, 88, 2.4, LINE) + circ(279, 84, 1.8, LINE);
    },
    jaws: k => N('M228 106 C248 114 274 112 290 98 L290 106 C274 120 250 122 232 114Z', '#3a0b10') + T('M226 108 C246 118 274 116 290 100 C290 118 270 130 248 128 C236 126 228 118 226 108Z', k.fs) + teeth(244, 108, 3, 5, 12),
    eyes: k => eye(254, 78, 10, k.P, { mood: k.mood }),
  },
};

// ======================= WINGED (bat / vulture / moth) =======================
const winged = {
  A: { head: [224, 82], eyes: [228, 78], jaws: [240, 110], fore: [170, 150], hind: [140, 176], tail: [92, 140], back: [118, 72], torso: [150, 118], ext1: [100, 34], ext2: [200, 30] },
  order: ['back', 'tail', 'torso', 'hind', 'head', 'jaws', 'eyes', 'ext1', 'ext2'],
  cosmetic: ['hind'],
  parts: {
    back: k => {
      const w = k.o.wing || 'bat';
      let near, far;
      if (w === 'moth') { near = T('M138 98 C108 38 52 20 20 52 C12 84 38 118 82 126 C106 128 126 120 138 108Z', k.fa) + circ(54, 62, 12, k.P.eye, 'opacity=".85"') + circ(54, 62, 6, LINE) + circ(86, 98, 8, k.P.light, 'opacity=".8"') + S('M138 100 C100 80 60 70 28 56', k.P.dark, 2, 'opacity=".5"'); far = T('M150 96 C140 52 104 24 70 24 C80 52 100 80 140 106Z', k.fd); }
      else if (w === 'bird') { near = T('M136 98 C108 66 68 54 26 66 C44 70 56 78 62 88 C48 86 36 90 28 98 C46 102 60 110 68 120 C58 120 48 124 42 130 C72 136 108 128 136 112Z', k.fa) + [0, 1, 2, 3].map(i => S(`M136 102 L${30 + i * 8} ${70 + i * 20}`, LINE, 1.8, 'opacity=".4"')).join(''); far = T('M150 96 C130 60 100 40 62 38 C74 54 82 64 84 76 C100 70 124 84 146 108Z', k.fd); }
      else { near = T('M132 92 C118 56 84 30 36 28 C44 40 46 52 44 62 C56 54 66 56 72 66 C84 56 94 62 98 74 C108 66 118 72 124 84Z', k.fa) + ['M132 92 L38 30', 'M132 92 L48 62', 'M132 92 L74 68', 'M132 92 L100 76'].map(d => S(d, LINE, 2.2, 'opacity=".45"')).join(''); far = T('M150 92 C146 56 124 28 90 16 C94 30 94 40 90 48 C102 44 112 50 116 60 C126 56 134 64 140 78Z', k.fd); }
      return { b: far + near };
    },
    tail: k => ({ b: T('M108 126 C92 128 78 140 74 154 C90 154 104 148 114 140Z', k.fd) }),
    hind: k => {
      if (k.o.wing === 'moth') { const lg = (x, d) => S(d, LINE, 8) + S(d, k.fd, 4.5); return { b: lg(0, 'M126 156 L116 186 L104 200') + lg(0, 'M148 160 L146 190 L140 204'), f: lg(0, 'M170 154 L180 184 L192 198') }; }
      const l = 'M132 154 C126 168 128 178 124 188 L112 196 L118 201 L138 196 L144 203 L152 198 L148 186 C152 174 154 164 152 154Z';
      return { b: tr(T(l, k.fd), 14, -2), f: T(l, k.f) };
    },
    torso: k => (k.cos.hind ? winged.parts.hind(k).b + winged.parts.hind(k).f : '') + T('M102 118 C98 84 126 66 158 70 C188 74 208 94 204 122 C200 148 176 164 148 164 C122 164 104 142 102 118Z', k.f) +
      N('M114 134 C128 156 176 158 196 132 C196 150 176 166 148 166 C128 166 116 152 114 134Z', k.fs) + HL('M114 92 C130 80 154 76 176 80') + (k.o.wing === 'bird' ? [0, 1, 2].map(i => S(`M${120 + i * 14} ${108 + i * 10} q8 8 16 0`, LINE, 1.6, 'opacity=".3"')).join('') : ''),
    head: k => {
      const w = k.o.wing || 'bat';
      if (w === 'bird') return T('M184 90 C184 68 202 56 222 58 C240 60 250 74 248 88 C246 100 232 108 214 108 C196 108 184 102 184 90Z', k.o.bald ? k.fs : k.f) + T('M240 80 C262 78 280 88 284 110 C270 100 256 98 242 98Z', k.P.horn) + HL('M200 72 C212 64 230 64 240 70') + (k.o.bald ? T('M186 100 C176 118 184 134 200 132 C196 122 200 110 206 106Z', k.fs) : '');
      if (w === 'moth') return T('M188 86 C188 68 204 56 224 58 C242 60 252 74 248 90 C244 104 226 110 210 106 C196 102 188 96 188 86Z', k.fs) + S('M216 62 C214 40 224 24 240 16', LINE, 3.5) + S('M228 62 C236 42 252 32 268 30', LINE, 3.5) + circ(240, 16, 4, k.P.accent, `stroke="${LINE}" stroke-width="2"`) + circ(268, 30, 4, k.P.accent, `stroke="${LINE}" stroke-width="2"`);
      return T('M196 66 L188 26 L218 52Z', k.fd) + T('M226 56 L242 22 L252 62Z', k.f) + N('M198 58 L194 38 L210 52Z', k.P.pink) + T('M184 88 C184 68 202 56 222 58 C242 60 254 74 250 92 C246 108 226 114 208 110 C194 106 184 100 184 88Z', k.f) + HL('M198 70 C210 62 230 62 242 70') + N('M238 92 C246 90 252 94 250 100 C246 102 240 100 238 96Z', LINE);
    },
    jaws: k => {
      const w = k.o.wing || 'bat';
      if (w === 'bird') return T('M244 98 C262 98 276 104 280 114 C266 114 254 110 244 106Z', k.P.horn);
      if (w === 'moth') return T('M230 104 C240 112 252 112 258 106 C252 118 240 120 232 116Z', k.fd);
      return N('M210 104 C226 108 244 108 252 98 L252 106 C244 116 226 118 214 112Z', '#3a0b10') + T('M212 104 C226 112 244 112 252 100 C250 116 232 124 218 120Z', k.fs) + teeth(222, 106, 3, 5, 9);
    },
    eyes: k => eye(228, 78, 9.5, k.P, { mood: k.mood }),
  },
};

// ======================= CRAB =======================
const crab = {
  A: { head: [222, 104], eyes: [236, 74], jaws: [226, 128], fore: [250, 134], hind: [140, 186], tail: [60, 150], back: [150, 70], torso: [150, 136], ext1: [90, 40], ext2: [200, 36] },
  order: ['hind', 'torso', 'back', 'fore', 'head', 'jaws', 'eyes', 'ext1', 'ext2'],
  cosmetic: [],
  parts: {
    hind: k => ({ b: [[106, 150, 82, 176, 66, 200], [128, 156, 112, 184, 102, 202], [172, 156, 188, 184, 198, 202], [194, 150, 218, 176, 234, 200]].map(([a, b, c, d, e, f]) => leg([[a, b], [c, d], [e, f]], 9, k.fd, k)).join('') }),
    torso: k => T('M80 124 C80 150 108 168 150 168 C192 168 220 150 220 124Z', k.fs) + HL('M100 140 C120 156 180 156 200 140'),
    back: k => T('M62 130 C56 78 100 48 150 48 C200 48 244 78 238 130 C210 142 90 142 62 130Z', k.f) + [[110, 72], [150, 62], [190, 72], [86, 100], [214, 100]].map(([x, y]) => S(`M${x} ${y} q8 -6 16 0`, LINE, 2, 'opacity=".35"') + circ(x + 8, y + 12, 6, k.P.dark, 'opacity=".35"')).join('') + HL('M84 92 C100 66 130 56 160 56'),
    fore: k => {
      const arm = leg([[210, 138], [244, 150], [262, 136]], 13, k.f, k);
      return arm + T('M250 130 C258 108 286 108 294 122 C282 120 270 124 264 134Z', k.f) + T('M252 142 C262 156 286 156 294 142 C282 142 272 140 264 136Z', k.fd) + HL('M258 122 C268 112 282 112 290 120');
    },
    head: k => T('M194 112 C198 96 220 90 238 94 C250 98 252 112 246 122 C232 130 206 128 198 120Z', k.fs),
    jaws: k => T('M214 124 L204 144 L224 138Z', k.fd) + T('M236 126 L236 148 L250 136Z', k.fd) + N('M218 122 C226 130 238 130 244 122 L244 126 C236 134 224 134 218 128Z', '#3a0b10'),
    eyes: k => S('M228 96 L234 70', LINE, 8) + S('M228 96 L234 70', k.f, 4) + S('M246 98 L258 76', LINE, 8) + S('M246 98 L258 76', k.f, 4) + eye(234, 66, 8, k.P, { mood: k.mood }) + eye(259, 72, 7, k.P, { mood: k.mood }),
  },
};

// ======================= SPIDER =======================
const spider = {
  A: { head: [218, 112], eyes: [226, 104], jaws: [236, 128], fore: [230, 150], hind: [90, 170], tail: [60, 150], back: [120, 76], torso: [120, 120], ext1: [70, 150], ext2: [160, 40] },
  order: ['hind', 'fore', 'torso', 'back', 'head', 'jaws', 'eyes', 'ext1', 'ext2'],
  cosmetic: [],
  parts: {
    hind: k => ({ b: [[92, 120, 50, 80, 24, 150], [102, 130, 56, 140, 40, 196], [124, 140, 96, 170, 84, 202], [140, 138, 134, 176, 136, 204]].map(p => leg([[p[0], p[1]], [p[2], p[3]], [p[4], p[5]]], 7, k.fd, k)).join('') }),
    fore: k => ({ b: [[190, 118, 232, 70, 270, 130], [196, 126, 244, 130, 270, 190], [180, 134, 212, 170, 226, 204], [168, 138, 176, 178, 184, 204]].map(p => leg([[p[0], p[1]], [p[2], p[3]], [p[4], p[5]]], 7, k.f, k)).join('') }),
    torso: k => T('M70 122 C66 80 100 62 128 66 C160 70 178 96 176 124 C174 152 148 168 118 166 C90 164 72 148 70 122Z', k.f) + N('M88 146 C106 162 150 162 168 140 C168 156 146 168 118 168 C100 168 90 158 88 146Z', k.fs) + HL('M84 92 C98 76 124 70 146 76'),
    back: k => [[96, 90], [124, 82], [150, 96], [110, 114], [140, 122]].map(([x, y], i) => circ(x, y, 8 - i % 2 * 2, k.P.dark, 'opacity=".45"')).join('') + S('M104 134 l10 8 l10 -8 l10 8', k.P.accent, 3, 'opacity=".7"'),
    head: k => T('M178 114 C178 92 198 82 220 86 C242 90 250 108 244 124 C236 138 208 140 192 134 C182 130 178 122 178 114Z', k.f) + HL('M190 98 C202 90 222 90 234 98'),
    jaws: k => T('M224 126 C220 140 222 150 230 156 C234 146 236 136 236 128Z', k.fa) + T('M244 122 C246 136 250 144 258 148 C258 138 256 128 252 120Z', k.fa) + circ(230, 156, 2, k.P.glow) + circ(258, 148, 2, k.P.glow),
    eyes: k => [[212, 102, 6], [228, 98, 7.5], [240, 106, 5.5], [220, 114, 4.5]].map(([x, y, r]) => eye(x, y, r, k.P, { mood: k.mood })).join(''),
  },
};

// ======================= BIPED (golem / pilgrim / reed-mantis) =======================
const BIP = {
  golem: { torso: 'M96 84 L108 56 L196 56 L208 84 L210 140 L194 172 L110 172 L94 140Z', head: 'M122 54 L122 24 C122 12 138 6 152 6 C166 6 182 12 182 24 L182 54 C170 62 134 62 122 54Z', arm: 'M196 72 C218 72 234 90 238 116 C240 132 236 148 228 158 L206 156 C210 142 210 130 206 118 C202 106 196 98 188 92Z' },
  pilgrim: { torso: 'M112 70 C112 52 132 46 152 46 C172 46 192 52 192 70 L218 190 C190 198 114 198 86 190Z', head: 'M116 58 C108 28 126 6 154 6 C182 6 198 28 190 58 C176 68 130 68 116 58Z', arm: 'M190 70 C204 76 214 96 214 120 L206 146 L194 142 C196 126 194 110 188 98Z' },
  reed: { torso: 'M120 66 C122 50 138 44 152 44 C168 44 182 50 184 66 L188 120 C190 150 176 168 152 170 C130 168 116 150 118 120Z', head: 'M126 44 L152 4 L178 44 C170 56 136 56 126 44Z', arm: 'M184 66 C202 70 214 82 218 100 C230 80 244 56 262 38 C262 62 250 94 232 122 C224 134 214 138 206 134 C206 118 198 102 188 92Z' },
};
const biped = {
  A: { head: [152, 34], eyes: [152, 34], jaws: [152, 62], fore: [220, 120], hind: [150, 186], tail: [100, 160], back: [96, 100], torso: [152, 116], ext1: [220, 40], ext2: [84, 46] },
  order: ['tail', 'back', 'hind', 'torso', 'fore', 'head', 'jaws', 'eyes', 'ext1', 'ext2'],
  cosmetic: ['hind', 'fore', 'head'],
  parts: {
    tail: k => ({ b: T('M108 150 C92 156 82 168 80 184 C96 180 112 170 122 160Z', k.fd) }),
    back: k => ({ b: T('M108 84 L82 62 L92 94 L68 96 L96 112 L80 140 L108 130Z', k.fd) }),
    hind: k => {
      const kind = k.o.kind || 'golem';
      if (kind === 'pilgrim') return { f: T('M126 190 C124 198 130 204 142 204 L158 204 C160 198 154 194 150 192Z', k.fd) + T('M160 192 C158 198 164 204 176 204 L190 204 C190 198 184 194 180 192Z', k.fd) };
      const l = 'M114 166 L110 198 L144 198 L148 166Z';
      return { b: tr(T(l, k.fd), 40, 0), f: T(l, k.f) + S('M112 198 L146 198', LINE, 3) + HL('M120 170 L118 190') };
    },
    torso: k => {
      const kind = k.o.kind || 'golem'; const c = k.cos; const b = BIP[kind];
      let s = (c.hind ? biped.parts.hind(k).b || '' : '') + (c.hind ? biped.parts.hind(k).f : '') + (c.tail ? biped.parts.tail(k).b : '');
      s += T(b.torso, kind === 'pilgrim' ? k.fd : k.f);
      if (kind === 'golem') s += S('M112 76 L196 76 M152 56 L152 172 M124 110 L180 110', LINE, 2, 'opacity=".35"') + N('M130 120 L174 120 L166 150 L138 150Z', k.fs, 'opacity=".9"') + HL('M114 70 L190 70');
      else if (kind === 'pilgrim') s += S('M130 70 L120 186 M176 70 L186 186', LINE, 2, 'opacity=".3"') + N('M146 72 L158 72 L164 184 L140 184Z', k.fs) + S('M112 112 C140 124 164 124 192 112', k.P.accent, 5);
      else s += N('M132 70 C132 100 134 130 140 160 C146 130 148 100 148 70Z', k.fs) + S('M136 90 L168 90 M136 110 L168 110 M138 130 L166 130', LINE, 2, 'opacity=".3"') + HL('M126 64 C124 90 126 118 132 144');
      if (c.head) s += biped.parts.head(k) + (k.has.eyes ? '' : biped.parts.eyes(k));
      if (c.fore) s += biped.parts.fore(k).f;
      return s;
    },
    fore: k => {
      const kind = k.o.kind || 'golem'; const b = BIP[kind];
      const hand = kind === 'golem' ? T('M222 160 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0', k.f) + HL('M210 154 q6 -8 14 -6') : kind === 'pilgrim' ? T('M200 146 C194 158 200 168 210 166 C220 164 218 150 212 144Z', k.fs) : '';
      return { b: kind === 'pilgrim' ? '' : `<g transform="translate(300 0) scale(-1 1) translate(0 4)">${T(b.arm, k.fd)}</g>`, f: T(b.arm, k.f) + hand + (kind === 'pilgrim' ? S('M214 150 L236 20', '#8a7358', 6) + S('M214 150 L236 20', LINE, 2, 'opacity=".5"') + circ(236, 18, 7, k.P.glow, `stroke="${LINE}" stroke-width="2.5"`) : '') };
    },
    head: k => {
      const kind = k.o.kind || 'golem'; const b = BIP[kind];
      if (kind === 'pilgrim') return T(b.head, k.fd) + N('M130 54 C128 34 138 22 154 22 C170 22 180 34 178 54 C170 62 138 62 130 54Z', '#14090f') + HL('M128 30 C136 16 172 16 182 30');
      if (kind === 'reed') return T(b.head, k.f) + HL('M140 36 L152 14') + S('M144 6 C140 -2 134 -4 130 0', LINE, 3) + S('M160 6 C164 -2 170 -4 174 0', LINE, 3);
      return T(b.head, k.f) + HL('M130 20 C136 12 168 12 174 20') + S('M128 36 L176 36', LINE, 2, 'opacity=".3"');
    },
    jaws: k => {
      const kind = k.o.kind || 'golem';
      if (kind === 'pilgrim') return N('M144 58 L164 58 L162 68 L146 68Z', '#14090f') + teeth(144, 58, 3, 4, 7);
      if (kind === 'reed') return T('M138 46 L152 66 L166 46Z', k.fd) + S('M146 50 L152 60 L158 50', LINE, 2);
      return N('M134 52 L170 52 L168 62 L136 62Z', '#14090f') + T('M136 58 L168 58 L164 72 L140 72Z', k.fd) + teeth(138, 58, 5, 3.5, 7);
    },
    eyes: k => {
      const kind = k.o.kind || 'golem';
      const y = kind === 'reed' ? 32 : 34;
      if (kind === 'pilgrim') return circ(142, 38, 5, k.P.glow) + circ(164, 38, 5, k.P.glow) + circ(142, 38, 2, '#fff') + circ(164, 38, 2, '#fff');
      return eye(140, y, 8, k.P, { mood: k.mood }) + eye(166, y, 8, k.P, { mood: k.mood });
    },
  },
};

// ======================= BLOB (leech swarm) =======================
const LEECH = [
  ['M64 176 C70 128 116 128 148 152 C176 172 196 132 214 118', 'f'],
  ['M56 138 C84 84 130 108 160 96 C186 86 188 64 168 54', 'fd'],
  ['M96 184 C132 200 186 190 214 164', 'fd'],
  ['M92 112 C110 146 150 126 176 140', 'f'],
];
const leech = (d, fill, w = 24) => S(d, LINE, w + 7) + S(d, fill, w) + S(d, '#000', w, 'stroke-dasharray="1.6 9" opacity=".28"') + S(d, '#fff', 3.5, 'opacity=".28" transform="translate(-1.5 -4)"');
const blob = {
  A: { head: [212, 110], eyes: [214, 96], jaws: [222, 118], fore: [200, 160], hind: [100, 160], tail: [60, 120], back: [140, 70], torso: [140, 130], ext1: [78, 150], ext2: [196, 176] },
  order: ['torso', 'back', 'jaws', 'eyes', 'ext1', 'ext2'],
  cosmetic: [],
  parts: {
    torso: k => LEECH.map(([d, f]) => leech(d, f === 'f' ? k.f : k.fd)).join(''),
    back: k => leech('M110 120 C120 70 150 66 170 90', k.fa, 12),
    jaws: k => S('M214 118 C220 112 226 112 232 118', LINE, 26) + circ(222, 120, 22, k.fd, `stroke="${LINE}" stroke-width="3"`) + circ(222, 120, 14, '#3a0b10') + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => { const a = i * Math.PI / 5; return `<path d="M${222 + Math.cos(a) * 14} ${120 + Math.sin(a) * 14} L${222 + Math.cos(a) * 6} ${120 + Math.sin(a) * 6}" stroke="#fffdf2" stroke-width="3" stroke-linecap="round"/>`; }).join('') + HL('M206 108 C210 100 220 98 228 100'),
    eyes: k => eye(206, 92, 7, k.P, { mood: 'wild' }) + eye(224, 88, 5.5, k.P, { mood: 'wild' }),
  },
};

export const ARCH = { quad, lizard, serpent, winged, crab, spider, biped, blob };
export { neckHead };

// Extra limbs on enemies (heads, crystals, roots, organs, suckers, spinnerets)
export function extArt(kind, k, slot) {
  const [x, y] = k.A[slot];
  const i = slot === 'ext1' ? 0 : 1;
  switch (kind) {
    case 'head': return slot === 'ext1' ? neckHead(k, 130, 160, 70, 90, 112, 50, 0.85, -10) : neckHead(k, 176, 156, 210, 80, 184, 34, 0.85, -20);
    case 'crystal': return `<g transform="translate(${x} ${y})">${T('M-18 20 L-10 -22 L0 -34 L8 -10 L10 20Z', 'url(#' + k.id + '-cr)')}${T('M6 20 L14 -18 L26 -4 L24 20Z', 'url(#' + k.id + '-cr)')}${T('M-26 20 L-22 -4 L-12 8 L-10 20Z', 'url(#' + k.id + '-cr)')}${HL('M-8 -14 L-4 -26')}<circle r="26" cy="-4" fill="url(#${k.id}-gl)" opacity=".5"/></g>`;
    case 'root': return S(`M${x - 10} ${y + 46} C${x - 30} ${y + 20} ${x + 20} ${y} ${x + 4} ${y - 30}`, LINE, 13) + S(`M${x - 10} ${y + 46} C${x - 30} ${y + 20} ${x + 20} ${y} ${x + 4} ${y - 30}`, k.P.accent, 8) + T(`M${x + 4} ${y - 30} C${x - 8} ${y - 40} ${x - 2} ${y - 54} ${x + 10} ${y - 48} C${x + 22} ${y - 44} ${x + 16} ${y - 28} ${x + 4} ${y - 30}Z`, k.P.glow);
    case 'organ': return `<g transform="translate(${x} ${y})"><circle r="24" fill="url(#${k.id}-gl)"/>${T('M-12 6 C-14 -10 -4 -16 4 -14 C14 -12 16 0 12 8 C6 14 -6 14 -12 6Z', '#ffe45a')}${S('M-6 -4 l5 -5 l-2 8 l6 -4', LINE, 2)}</g>`;
    case 'suckerOld': return `<g transform="translate(${x} ${y})">` + [[-10, 4, -14], [6, -2, 10], [-2, -14, 0]].map(([a, b, r]) => T(`M${a - 12} ${b + 8} C${a - 14} ${b - 12} ${a + 10} ${b - 18} ${a + 12} ${b - 2} C${a + 14} ${b + 8} ${a + 4} ${b + 12} ${a - 12} ${b + 8}Z`, k.f, `transform="rotate(${r})"`) + circ(a + 8, b - 4, 4, '#3a0b10')).join('') + `</g>`;
    case 'sucker': return `<g transform="translate(${x} ${y})">${leech('M-24 14 C-16 -14 8 -16 24 -4', i ? k.fd : k.f, 12)}${leech('M-20 22 C0 30 14 20 22 8', k.fd, 10)}${circ(25, -4, 6, '#3a0b10', `stroke="${LINE}" stroke-width="2"`)}</g>`;
    case 'spinneret': return `<g transform="translate(${x} ${y})">${T('M-12 0 C-12 -12 12 -12 12 0 C12 10 -12 10 -12 0Z', k.fd)}${S('M0 8 C-4 24 6 30 0 44', '#ffffff', 2, 'opacity=".8"')}</g>`;
    default: return '';
  }
}
