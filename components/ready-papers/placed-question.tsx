"use client";
import { useRef } from "react";
import { placementAfterDrag, type Placement } from "@/lib/ready-placement";
export default function PlacedQuestion({
  src,
  page,
  value,
  movable,
  onChange,
}: {
  src: string;
  page: number;
  value: Placement;
  movable: boolean;
  onChange: (v: Placement) => void;
}) {
  const drag = useRef<{ x: number; y: number; value: Placement } | null>(null);
  return (
    <div
      className={`rp-print-content rp-placed-question${movable ? " rp-placement-active" : ""}`}
    >
      <img
        src={src}
        alt={`সম্পাদিত page ${page}`}
        draggable={false}
        style={{
          objectPosition: `${value.printX * 100}% ${value.printY * 100}%`,
          transform: `scale(${value.printScale})`,
          transformOrigin: `${value.printX * 100}% ${value.printY * 100}%`,
          touchAction: movable ? "none" : "auto",
        }}
        onPointerDown={(e) => {
          if (!movable) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, value: { ...value } };
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start || !movable) return;
          const r = e.currentTarget.getBoundingClientRect();
          onChange(
            placementAfterDrag(
              start.value,
              e.clientX - start.x,
              e.clientY - start.y,
              r.width / value.printScale,
              r.height / value.printScale,
              e.currentTarget.naturalWidth,
              e.currentTarget.naturalHeight,
            ),
          );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
    </div>
  );
}
