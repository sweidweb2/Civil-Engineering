import { type ReactNode, useCallback, useEffect, useRef } from 'react'

/**
 * Shared FlatList tuning for portal grids/lists — tighter window than RN defaults
 * so tab remounts and scroll recycle less offscreen work.
 */
export const LIST_PERF = {
  windowSize: 7,
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: true,
} as const

/**
 * Stable `ListHeaderComponent` render function. Passing a new element each parent
 * render remounts the header; a stable function re-renders with the latest tree.
 */
export function useStableListHeader(header: ReactNode) {
  const ref = useRef(header)

  useEffect(() => {
    ref.current = header
  }, [header])

  return useCallback(() => ref.current ?? null, [])
}
