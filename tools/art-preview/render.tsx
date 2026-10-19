/**
 * 벡터 그림 미리보기: 모든 ArtDef를 HTML 한 장으로 그린 뒤 PNG로 찍는다.
 *   npx tsx tools/art-preview/render.tsx [이름...]  → tools/art-preview/out/preview.png
 * (react-native-svg는 build.mjs가 svg-shim.tsx로 바꿔치기한다)
 */
import { createElement, Fragment } from 'react';
// @ts-expect-error 미리보기 전용 (react-dom 타입은 설치하지 않음)
import { renderToStaticMarkup } from 'react-dom/server';

import { VECTOR_ART } from '../../src/ui/art';
import { makePaint } from '../../src/ui/art/kit';

export const ALL = Object.keys(VECTOR_ART);
export function html(names: string[]): string {
  if (!names.length) names = ALL;
  const cells = names.map((name) => {
    const art = VECTOR_ART[name];
    const scale = 6;
    const one = (tint?: string, s = scale) =>
      renderToStaticMarkup(
        createElement(
          'svg',
          { width: art.w * s, height: art.h * s, viewBox: `0 0 ${art.w * 10} ${art.h * 10}`, xmlns: 'http://www.w3.org/2000/svg' },
          !tint && art.defs ? createElement('defs', null, art.defs()) : null,
          createElement(Fragment, null, art.draw(makePaint(tint))),
        ),
      );
    return `<div class="cell"><div class="name">${name} (${art.w}×${art.h})</div><div class="row"><div class="box">${one()}</div><div class="box">${one(undefined, 2)}</div><div class="box">${one('#FFFFFF', 2)}</div></div></div>`;
  });
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:16px;background:#3B3F7A;font-family:sans-serif;display:flex;flex-wrap:wrap;gap:16px}
    .cell{background:linear-gradient(#5a8f4a,#3f6e35);border-radius:10px;padding:8px}
    .name{color:#fff;font-weight:700;margin-bottom:4px}.row{display:flex;gap:10px;align-items:flex-end}
    .box{outline:1px dashed rgba(255,255,255,.3)}
  </style>${cells.join('')}`;
}
