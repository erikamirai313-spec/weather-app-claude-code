"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 横スクロールの一覧。続きがある側の端をうっすらフェードさせて、
 * スクロールできることを示す。スマホでは指で滑らかにスワイプできる。
 */
export default function HourlyScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdge((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const fade = 40; // px
  const mask = `linear-gradient(to right, ${edge.left ? "transparent" : "#000"} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${edge.right ? "transparent" : "#000"} 100%)`;

  return (
    <ul
      ref={ref}
      onScroll={update}
      tabIndex={0}
      aria-label="3時間ごとの予報（横にスクロールできます）"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
      // py: 上下の余白をとり、overflow による数字の切れを防ぐ
      // snap / touch-pan-x / overscroll-x-contain: スマホで指でスクロールしやすくする
      className="flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain py-2 [-webkit-overflow-scrolling:touch] [touch-action:pan-x_pan-y]"
    >
      {children}
    </ul>
  );
}
