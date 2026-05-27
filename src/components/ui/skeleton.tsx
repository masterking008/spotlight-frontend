import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export { Skeleton }

export function AppSkeletonTheme({ children }: { children: React.ReactNode }) {
  return (
    <SkeletonTheme baseColor="var(--border)" highlightColor="var(--surface)">
      {children}
    </SkeletonTheme>
  )
}
