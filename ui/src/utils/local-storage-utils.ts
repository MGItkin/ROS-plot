import { GlobalState } from "../store";
import { message } from "antd";

const localStorageKey = "CERES_VIZ_STATE";
const fieldPathCacheKey = "FIELD_PATHS";

export function saveStateToStorage(state: Partial<GlobalState>): void {
  const currentState = readStateFromStorage();
  localStorage.setItem(
    localStorageKey,
    JSON.stringify({ ...currentState, ...state })
  );
}

export function readStateFromStorage(): Partial<GlobalState> {
  const stateData = localStorage.getItem(localStorageKey) || "{}";
  return sanitizeStorage(JSON.parse(stateData));
}

export function clearStateFromStorage(preserveRosAddress = true): void {
  const currentState = readStateFromStorage();
  let newState: Partial<GlobalState> = {};
  if (preserveRosAddress) {
    newState.rosAddress = currentState.rosAddress;
  }
  localStorage.setItem(localStorageKey, JSON.stringify(newState));
  window.location.reload();
}

export function saveFieldPathsToCache(type: string, paths: string[]) {
  const pathMapJson = localStorage.getItem(fieldPathCacheKey) || "{}";
  const pathMap: Record<string, string[]> = JSON.parse(pathMapJson);
  pathMap[type] = paths;
  localStorage.setItem(fieldPathCacheKey, JSON.stringify(pathMap));
}

export function readFieldPathsFromStorage(type: string): string[] | null {
  const pathMapJson = localStorage.getItem(fieldPathCacheKey) || "{}";
  const pathMap: Record<string, string[]> = JSON.parse(pathMapJson);
  if (type in pathMap) {
    return pathMap[type];
  }
  return null;
}

export function clearFieldPathsFromStorage(): void {
  localStorage.removeItem(fieldPathCacheKey);
  message.success("Message type schema cleared from local storage.");
}

// im-place mutation of storage to wipe legacy storage if it is found.
export function sanitizeStorage(
  importedState: Partial<GlobalState>
): Partial<GlobalState> {
  let shouldSaveChanges = false;
  // clear dashboard and layouts from state
  if (importedState.dashboard) {
    delete importedState.dashboard;
    shouldSaveChanges = true;
  }
  if (importedState.layouts) {
    delete importedState.layouts;
    shouldSaveChanges = true;
  }
  // Save changes is data mutated
  if (shouldSaveChanges) {
    localStorage.setItem(localStorageKey, JSON.stringify(importedState));
  }

  return importedState;
}
