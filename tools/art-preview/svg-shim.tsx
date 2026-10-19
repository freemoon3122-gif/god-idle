// react-native-svg 대신 브라우저의 진짜 <svg> 태그로 그리는 가짜 모듈 (미리보기 전용)
import { createElement, ReactNode } from 'react';

const tag = (name: string) =>
  function SvgTag(props: Record<string, unknown> & { children?: ReactNode }) {
    const { children, ...rest } = props;
    const attrs: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) attrs[k === 'stopColor' ? 'stopColor' : k] = v;
    return createElement(name, attrs, children);
  };

const Svg = tag('svg');
export default Svg;
export const Svg_ = Svg;
export const G = tag('g');
export const Path = tag('path');
export const Rect = tag('rect');
export const Circle = tag('circle');
export const Ellipse = tag('ellipse');
export const Line = tag('line');
export const Polygon = tag('polygon');
export const Polyline = tag('polyline');
export const Defs = tag('defs');
export const LinearGradient = tag('linearGradient');
export const RadialGradient = tag('radialGradient');
export const Stop = tag('stop');
export const ClipPath = tag('clipPath');
export const Mask = tag('mask');
export const Text = tag('text');
