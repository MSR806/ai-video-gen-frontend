import type { ScreenplayBlockType } from '@core/screenplay';

export function createSplitBlockAttrs(
  previousAttrs: Record<string, unknown>,
  nextType: ScreenplayBlockType,
) {
  return {
    ...previousAttrs,
    blockType: nextType,
  };
}

export function isImeComposingEvent(event: { isComposing?: boolean; keyCode?: number }): boolean {
  return event.isComposing === true || event.keyCode === 229;
}
