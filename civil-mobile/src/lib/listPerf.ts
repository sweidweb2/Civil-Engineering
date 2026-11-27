/**
 * Shared FlatList tuning for portal grids/lists — tighter window than RN defaults
 * so tab remounts and scroll recycle less offscreen work.
 *
 * `strictMode` makes FlatList memoize its internal row renderer. Without it, every
 * parent render (each search keystroke) hands all mounted cells a new `renderItem`
 * and re-renders them. Pair it with a stable `renderItem` (`useCallback`) and a
 * module-level `ItemSeparatorComponent` (`WkListGap`) so cells re-render only when
 * their item changes.
 */
export const LIST_PERF = {
  strictMode: true,
  windowSize: 7,
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: true,
} as const
