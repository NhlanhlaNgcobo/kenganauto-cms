import React from 'react';

export const Skeleton = ({ className = '', style = {} }) => {
    return (
        <div
            className={`relative overflow-hidden bg-white/5 rounded-xl ${className}`}
            style={style}
        >
            <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.05), transparent)',
                }}
            />
        </div>
    );
};

export const SkeletonTable = ({ columns = 5, rows = 5 }) => {
    return (
        <div className="w-full">
            <div className="flex gap-4 p-4 border-b border-white/5 pb-2">
                {Array(columns).fill(0).map((_, i) => (
                    <Skeleton key={`h-${i}`} className="h-4 flex-1" />
                ))}
            </div>
            {Array(rows).fill(0).map((_, r) => (
                <div key={`r-${r}`} className="flex gap-4 p-4 border-b border-white/5">
                    {Array(columns).fill(0).map((_, c) => (
                        <Skeleton key={`c-${r}-${c}`} className="h-6 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
};
