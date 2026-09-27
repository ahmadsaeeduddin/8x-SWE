export type InterfacePanel = "settings" | "help" | "shared";

export const OPEN_INTERFACE_PANEL_EVENT = "echo:open-interface-panel";
export const OPEN_GLOBAL_SEARCH_EVENT = "echo:open-global-search";

export function openInterfacePanel(panel: InterfacePanel) {
  window.dispatchEvent(
    new CustomEvent<InterfacePanel>(OPEN_INTERFACE_PANEL_EVENT, { detail: panel }),
  );
}

export function openGlobalSearch() {
  window.dispatchEvent(new Event(OPEN_GLOBAL_SEARCH_EVENT));
}
