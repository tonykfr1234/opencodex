import type { CSSProperties } from "react";

export interface SelectMenuTriggerRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface SelectMenuStyleOptions {
  align?: "left" | "right";
  placement?: "below" | "right";
  menuHeight?: number;
}

const MENU_GAP_PX = 4;
const FLIP_GAP_PX = 8;
const VIEWPORT_PAD_PX = 8;
const MAX_MENU_HEIGHT_PX = 280;
const MIN_MENU_HEIGHT_PX = 120;
const BESIDE_MIN_WIDTH_PX = 160;
/** Gap past the trigger's right edge for beside-placement (clears sidebar padding/border). */
const BESIDE_GAP_PX = 12;

function viewportHeight() {
  return typeof window !== "undefined" ? window.innerHeight : 800;
}

function viewportWidth() {
  return typeof window !== "undefined" ? window.innerWidth : 1024;
}

function portalZoom() {
  if (typeof window === "undefined") return 1;
  // The portal is a direct child of body. Rects include CSS zoom, but its fixed
  // position and size declarations use the unscaled html/body coordinate space.
  return [window.document.documentElement, window.document.body].reduce((scale, element) => {
    if (!element) return scale;
    const zoom = Number.parseFloat(window.getComputedStyle(element).zoom);
    return scale * (Number.isFinite(zoom) && zoom > 0 ? zoom : 1);
  }, 1);
}

export function computeSelectMenuStyle(
  viewportTrigger: SelectMenuTriggerRect,
  { align, placement = "below", menuHeight = MAX_MENU_HEIGHT_PX }: SelectMenuStyleOptions = {},
): CSSProperties {
  const zoom = portalZoom();
  const trigger = {
    top: viewportTrigger.top / zoom, bottom: viewportTrigger.bottom / zoom,
    left: viewportTrigger.left / zoom, right: viewportTrigger.right / zoom,
    width: viewportTrigger.width / zoom, height: viewportTrigger.height / zoom,
  };
  const measuredHeight = Math.min(Math.max(menuHeight, MIN_MENU_HEIGHT_PX), MAX_MENU_HEIGHT_PX);
  const vh = viewportHeight() / zoom;
  const vw = viewportWidth() / zoom;
  const availableWidth = Math.max(0, vw - VIEWPORT_PAD_PX * 2);

  if (placement === "right") {
    const spaceBelow = vh - trigger.top - VIEWPORT_PAD_PX;
    const spaceAbove = trigger.top - VIEWPORT_PAD_PX;
    const openAbove = measuredHeight + FLIP_GAP_PX > spaceBelow && spaceAbove > spaceBelow;
    const left = Math.max(VIEWPORT_PAD_PX, Math.min(trigger.right + BESIDE_GAP_PX, vw - BESIDE_MIN_WIDTH_PX - VIEWPORT_PAD_PX));

    if (openAbove) {
      return {
        position: "fixed",
        left,
        bottom: vh - trigger.top + FLIP_GAP_PX,
        minWidth: Math.min(BESIDE_MIN_WIDTH_PX, availableWidth),
        maxWidth: Math.max(0, vw - left - VIEWPORT_PAD_PX),
        maxHeight: Math.max(MIN_MENU_HEIGHT_PX, Math.min(MAX_MENU_HEIGHT_PX, trigger.top - VIEWPORT_PAD_PX - MENU_GAP_PX)),
      };
    }

    return {
      position: "fixed",
      top: trigger.top,
      left,
      minWidth: Math.min(BESIDE_MIN_WIDTH_PX, availableWidth),
      maxWidth: Math.max(0, vw - left - VIEWPORT_PAD_PX),
      maxHeight: Math.max(MIN_MENU_HEIGHT_PX, Math.min(MAX_MENU_HEIGHT_PX, vh - trigger.top - VIEWPORT_PAD_PX)),
    };
  }

  const effectiveAlign = align ?? (trigger.right > vw / 2 ? "right" : "left");
  const width = Math.min(Math.max(trigger.width, 0), availableWidth);
  const anchor = effectiveAlign === "right"
    ? Math.max(VIEWPORT_PAD_PX, Math.min(vw - trigger.right, vw - VIEWPORT_PAD_PX - width))
    : Math.max(VIEWPORT_PAD_PX, Math.min(trigger.left, vw - VIEWPORT_PAD_PX - width));
  const maxWidth = Math.max(0, vw - anchor - VIEWPORT_PAD_PX);
  const spaceBelow = vh - trigger.bottom - VIEWPORT_PAD_PX;
  const spaceAbove = trigger.top - VIEWPORT_PAD_PX;
  const flipUp = measuredHeight + MENU_GAP_PX > spaceBelow && spaceAbove > spaceBelow;

  if (flipUp) {
    const style: CSSProperties = {
      position: "fixed",
      bottom: vh - trigger.top + FLIP_GAP_PX,
      minWidth: width,
      maxWidth,
      maxHeight: Math.max(0, Math.min(MAX_MENU_HEIGHT_PX, spaceAbove - MENU_GAP_PX)),
    };
    if (effectiveAlign === "right") {
      style.right = anchor;
    } else {
      style.left = anchor;
    }
    return style;
  }

  const style: CSSProperties = {
    position: "fixed",
    top: trigger.bottom + MENU_GAP_PX,
    minWidth: width,
    maxWidth,
    maxHeight: Math.max(0, Math.min(MAX_MENU_HEIGHT_PX, spaceBelow - MENU_GAP_PX)),
  };
  if (effectiveAlign === "right") {
    style.right = anchor;
  } else {
    style.left = anchor;
  }
  return style;
}
