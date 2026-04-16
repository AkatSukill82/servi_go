import React from 'react';

function SkeletonBox({ className }) {
  return <div className={`shimmer rounded-xl ${className}`} />;
}

export default function HomeSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {Array(9).fill(0).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 p-3 bg-card rounded-xl border border-border/50">
          <SkeletonBox className="w-14 h-14 rounded-full" />
          <SkeletonBox className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}