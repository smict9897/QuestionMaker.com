"use client";
import { useEffect, useRef } from "react";
import {
  placementAfterDrag,
  placementAfterZoom,
  type Placement,
} from "@/lib/ready-placement";
type Point = { x: number; y: number };
type Gesture = { points: Point[]; value: Placement };
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
  const container = useRef<HTMLDivElement>(null),
    image = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Point>()),
    gesture = useRef<Gesture | null>(null);
  const latest = useRef({ value, onChange, movable });
  latest.current = { value, onChange, movable };
  function emit(next: Placement) {
    latest.current.value = next;
    latest.current.onChange(next);
  }
  function rebase() {
    gesture.current = {
      points: [...pointers.current.values()].map((p) => ({ ...p })),
      value: { ...latest.current.value },
    };
  }
  function end(id: number) {
    pointers.current.delete(id);
    if (pointers.current.size) rebase();
    else gesture.current = null;
  }
  useEffect(() => {
    pointers.current.clear();
    gesture.current = null;
  }, [movable, src]);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!latest.current.movable || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      emit(
        placementAfterZoom(
          latest.current.value,
          Math.exp(-Math.max(-100, Math.min(100, e.deltaY * unit)) * 0.002),
        ),
      );
      if (pointers.current.size) rebase();
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  return (
    <div
      ref={container}
      className={`rp-print-content rp-placed-question${movable ? " rp-placement-active" : ""}`}
      style={{ touchAction: movable ? "none" : "auto" }}
      onPointerDown={(e) => {
        if (
          !movable ||
          (e.pointerType === "mouse" && e.button !== 0) ||
          pointers.current.size >= 2
        )
          return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        rebase();
      }}
      onPointerMove={(e) => {
        if (!movable || !pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const start = gesture.current;
        if (!start) return;
        const current = [...pointers.current.values()];
        if (current.length === 2 && start.points.length === 2) {
          const distance = (a: Point, b: Point) =>
            Math.hypot(a.x - b.x, a.y - b.y);
          const before = distance(start.points[0], start.points[1]);
          if (before > 2)
            emit(
              placementAfterZoom(
                start.value,
                distance(current[0], current[1]) / before,
              ),
            );
        } else if (
          current.length === 1 &&
          start.points.length === 1 &&
          image.current
        ) {
          const r = e.currentTarget.getBoundingClientRect();
          emit(
            placementAfterDrag(
              start.value,
              current[0].x - start.points[0].x,
              current[0].y - start.points[0].y,
              r.width,
              r.height,
              image.current.naturalWidth,
              image.current.naturalHeight,
            ),
          );
        }
      }}
      onPointerUp={(e) => end(e.pointerId)}
      onPointerCancel={(e) => end(e.pointerId)}
      onLostPointerCapture={(e) => {
        if (pointers.current.has(e.pointerId)) end(e.pointerId);
      }}
    >
      <img
        ref={image}
        src={src}
        alt={`সম্পাদিত page ${page}`}
        draggable={false}
        style={{
          objectPosition: `${value.printX * 100}% ${value.printY * 100}%`,
          transform: `scale(${value.printScale})`,
          transformOrigin: `${value.printX * 100}% ${value.printY * 100}%`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
