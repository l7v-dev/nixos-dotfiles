interface LoadingSkeletonProps {
    lines?: number;
}

export function LoadingSkeleton({ lines = 3 }: LoadingSkeletonProps) {
    return (
        <div className="animate-pulse space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-4 bg-muted rounded"
                    style={{ width: i === lines - 1 ? "60%" : "100%" }}
                />
            ))}
        </div>
    );
}
