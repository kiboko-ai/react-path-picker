export interface PathPickerResult {
  /**
   * Page origin, e.g. `http://localhost:3000`. Disambiguates which app the pick came from.
   * Optional so hand-built results stay valid — `PathPickerInspector` always sets it.
   */
  origin?: string;
  /**
   * Which codebase this is. Explicit `project` option when given, otherwise the
   * absolute repo root derived from React's dev source info. null when neither is available.
   */
  project?: string | null;
  route: string;
  xpath: string;
  cssSelector: string;
  tagName: string;
  id: string | null;
  textContent: string;
  reactComponent: string | null;
  reactSource: string | null;
}

export interface InspectorCallbacks {
  onPick: (result: PathPickerResult) => void;
  /**
   * Fired when a multi-element selection is confirmed with Enter.
   * Shift+click accumulation stays off unless this is supplied — a caller that
   * only knows how to handle one result never gets handed an array it can't use.
   */
  onPickMany?: (results: PathPickerResult[]) => void;
  onCancel: () => void;
  getRoute: () => string;
  /** Explicit project label. Overrides the root auto-derived from React dev source info. */
  getProject?: () => string | null | undefined;
  /**
   * Shift+click accumulation. `true` by default, and still needs `onPickMany`.
   * Set `false` for the original one-pick-then-close behavior.
   */
  multi?: boolean;
}
