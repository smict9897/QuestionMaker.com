"use client";
import { useRef, useState } from "react";
import type { PageEdit } from "@/lib/ready-papers";
import { sourceRasterPoint, type RasterPoint } from "@/lib/ready-raster";
export default function RasterTools({
  tool,
  edit,
  onCommit,
}: {
  tool: "erase" | "text";
  edit: PageEdit;
  onCommit: (start: RasterPoint, end: RasterPoint) => void;
}) {
  const gesture = useRef<{ id: number; start: RasterPoint } | null>(null);
  const [box, setBox] = useState<{
    start: RasterPoint;
    end: RasterPoint;
  } | null>(null);
  function point(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }
  function cancel() {
    gesture.current = null;
    setBox(null);
  }
  return (
    <div
      className="rp-raster-tools"
      aria-label={
        tool === "erase" ? "A4 প্রশ্ন ঢাকার ক্ষেত্র" : "A4 প্রশ্নে লেখা বসানোর ক্ষেত্র"
      }
      style={{ touchAction: "none", cursor: "crosshair" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (gesture.current || (e.pointerType === "mouse" && e.button !== 0))
          return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const start = point(e);
        gesture.current = { id: e.pointerId, start };
        setBox({ start, end: start });
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (gesture.current?.id !== e.pointerId) return;
        setBox({ start: gesture.current.start, end: point(e) });
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const g = gesture.current;
        if (!g || g.id !== e.pointerId) return;
        const end = point(e);
        cancel();
        onCommit(
          sourceRasterPoint(g.start, edit),
          sourceRasterPoint(end, edit),
        );
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
    >
      {tool === "erase" && box && (
        <div
          className="rp-erase-selection"
          style={{
            left: `${Math.min(box.start.x, box.end.x) * 100}%`,
            top: `${Math.min(box.start.y, box.end.y) * 100}%`,
            width: `${Math.abs(box.start.x - box.end.x) * 100}%`,
            height: `${Math.abs(box.start.y - box.end.y) * 100}%`,
          }}
        />
      )}
    </div>
  );
}
