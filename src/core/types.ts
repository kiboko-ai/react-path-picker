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
  onCancel: () => void;
  getRoute: () => string;
  /** Explicit project label. Overrides the root auto-derived from React dev source info. */
  getProject?: () => string | null | undefined;
}
