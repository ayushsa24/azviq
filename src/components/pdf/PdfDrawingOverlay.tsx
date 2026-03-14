import React, { useRef, useEffect, useState } from "react";

export interface StrokeAnnotation {
    kind: "stroke";
    color: string;
    width: number;
    opacity: number; // 1.0 for pen, 0.35 for highlight
    path: { x: number; y: number }[];
}

export interface TextAnnotation {
    kind: "text";
    x: number;
    y: number;
    text: string;
    color: string;
    fontSize: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontFamily?: string;
    textAlign?: "left" | "center" | "right";
}

export type Annotation = StrokeAnnotation | TextAnnotation;

// Keep backward compat alias
export type Stroke = StrokeAnnotation;

interface PdfDrawingOverlayProps {
    width: number;
    height: number;
    activeTool: "pen" | "eraser" | "highlight" | "text";
    currentColor: string;
    strokeWidth: number;
    annotations: Annotation[];
    onAnnotationAdd: (a: Annotation) => void;
    onEraseAt: (coords: { x: number; y: number }) => void;
    onTextClick?: (x: number, y: number) => void;
}

export function PdfDrawingOverlay({
    width,
    height,
    activeTool,
    currentColor,
    strokeWidth,
    annotations,
    onAnnotationAdd,
    onEraseAt,
    onTextClick,
}: PdfDrawingOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

    // Redraw everything
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (const ann of annotations) {
            if (ann.kind === "stroke") {
                if (ann.path.length === 0) continue;
                ctx.save();
                ctx.globalAlpha = ann.opacity;
                ctx.strokeStyle = ann.color;
                ctx.lineWidth = ann.width;
                ctx.beginPath();
                ctx.moveTo(ann.path[0].x, ann.path[0].y);
                for (let i = 1; i < ann.path.length; i++) {
                    ctx.lineTo(ann.path[i].x, ann.path[i].y);
                }
                ctx.stroke();
                ctx.restore();
            } else if (ann.kind === "text") {
                ctx.save();
                const weight = ann.bold ? "bold" : "normal";
                const style = ann.italic ? "italic" : "normal";
                const family = ann.fontFamily || "sans-serif";
                ctx.font = `${style} ${weight} ${ann.fontSize}px ${family}`;
                ctx.fillStyle = ann.color;
                ctx.textAlign = (ann.textAlign as CanvasTextAlign) || "left";
                ctx.fillText(ann.text, ann.x, ann.y);
                if (ann.underline) {
                    const metrics = ctx.measureText(ann.text);
                    const w = metrics.width;
                    const startX = ann.textAlign === "center" ? ann.x - w / 2
                        : ann.textAlign === "right" ? ann.x - w : ann.x;
                    ctx.beginPath();
                    ctx.strokeStyle = ann.color;
                    ctx.lineWidth = 1;
                    ctx.moveTo(startX, ann.y + 3);
                    ctx.lineTo(startX + w, ann.y + 3);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // Draw current in-progress path
        if (currentPath.length > 0 && (activeTool === "pen" || activeTool === "highlight")) {
            ctx.save();
            ctx.globalAlpha = activeTool === "highlight" ? 0.35 : 1.0;
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = activeTool === "highlight" ? Math.max(strokeWidth, 16) : strokeWidth;
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }, [annotations, currentPath, width, height, activeTool, currentColor, strokeWidth]);

    const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

        if (activeTool === "text") {
            const coords = getCoordinates(e);
            onTextClick?.(coords.x, coords.y);
            return;
        }

        setIsDrawing(true);
        setCurrentPath([getCoordinates(e)]);
    };

    const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
        Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const coords = getCoordinates(e);
        if (activeTool === "eraser") {
            setCurrentPath((prev) => [...prev, coords]);
            onEraseAt(coords);
        } else {
            setCurrentPath((prev) => [...prev, coords]);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
        if (!isDrawing) return;
        setIsDrawing(false);

        if ((activeTool === "pen" || activeTool === "highlight") && currentPath.length > 0) {
            onAnnotationAdd({
                kind: "stroke",
                color: currentColor,
                width: activeTool === "highlight" ? Math.max(strokeWidth, 16) : strokeWidth,
                opacity: activeTool === "highlight" ? 0.35 : 1.0,
                path: currentPath,
            });
        }
        setCurrentPath([]);
    };

    const cursor =
        activeTool === "pen" ? "cursor-crosshair"
        : activeTool === "highlight" ? "cursor-text"
        : activeTool === "text" ? "cursor-text"
        : "cursor-cell";

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width, height, touchAction: "none" }}
            className={`absolute top-0 left-0 z-20 ${cursor}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
        />
    );
}
