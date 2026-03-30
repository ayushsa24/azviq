import React from "react";

interface SkeletonProps {
    className?: string;
    variant?: "text" | "rect" | "circle";
}

export function Skeleton({ className = "", variant = "rect" }: SkeletonProps) {
    const baseClass = "animate-pulse bg-[#E8E5E0] dark:bg-[#3A3A3A]";
    const variantClass = variant === "circle" ? "rounded-full" : variant === "text" ? "rounded-md h-4 w-full" : "rounded-xl";
    
    return (
        <div className={`${baseClass} ${variantClass} ${className}`} />
    );
}
