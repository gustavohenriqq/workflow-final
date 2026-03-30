import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-neutral-100 rounded',
        className,
      )}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-md" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-5 w-16 rounded" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function KpiSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="w-7 h-7 rounded-md" />
      </div>
      <Skeleton className="h-7 w-16 mb-1" />
      <Skeleton className="h-3 w-28" />
    </div>
  )
}
