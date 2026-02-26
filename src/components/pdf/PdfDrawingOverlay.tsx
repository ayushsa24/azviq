import React, { useRef, useState, useEffect } from "react";

export interface Stroke {
    color: string;
    width: number;
    path: { x: number; y: number }[];
}

interface PdfDrawingOverlayProps {
    width: number;
    height: number;
    activeTool: "pen" | "eraser";
    currentColor: string;
    strokeWidth: number;
    strokes: Stroke[];
    setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
}

export function PdfDrawingOverlay({
    width,
    height,
    activeTool,
    currentColor,
    strokeWidth,
    strokes,
    setStrokes
}: PdfDrawingOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

    // Redraw everything when strokes, currentPath, or dimensions change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Draw saved strokes
        strokes.forEach(stroke => {
            if (stroke.path.length === 0) return;
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.moveTo(stroke.path[0].x, stroke.path[0].y);
            for (let i = 1; i < stroke.path.length; i++) {
                ctx.lineTo(stroke.path[i].x, stroke.path[i].y);
            }
            ctx.stroke();
        });

        // Draw current path in progress
        if (currentPath.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = activeTool === "eraser" ? "rgba(255, 0, 0, 0.3)" : currentColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.stroke();
        }
    }, [strokes, currentPath, width, height, activeTool, currentColor, strokeWidth]);

    const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        // Use rect.width/height instead of canvas.width/height to handle CSS scaling if any
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        setIsDrawing(true);
        const coords = getCoordinates(e);
        setCurrentPath([coords]);
    };

    const distance = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const coords = getCoordinates(e);

        if (activeTool === "eraser") {
            // Eraser logic: find intersecting existing strokes and remove them
            setCurrentPath((prev) => [...prev, coords]);

            setStrokes((prevStrokes) => prevStrokes.filter(stroke => {
                // If any point in the stroke is close to the eraser, discard the stroke
                const eraserRadius = strokeWidth * 2; // Make eraser hitbox a bit larger
                return !stroke.path.some(p => distance(p, coords) < eraserRadius);
            }));

        } else {
            // Pen logic: just add to current path
            setCurrentPath((prev) => [...prev, coords]);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
        if (!isDrawing) return;
        setIsDrawing(false);

        if (activeTool === "pen" && currentPath.length > 0) {
            const newStroke: Stroke = {
                color: currentColor,
                width: strokeWidth,
                path: currentPath
            };
            setStrokes([...strokes, newStroke]);
        }
        setCurrentPath([]);
    };

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            // Increase resolution for crisp drawing on retina displays while keeping identical logic dimensions
            style={{ width: width, height: height, touchAction: "none" }}
            className={`absolute top-0 left-0 z-20 ${activeTool === "pen" ? "cursor-crosshair" : "cursor-cell"}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
        />
    );
}
