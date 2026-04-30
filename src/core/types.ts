export interface PathPickerResult {
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
}
