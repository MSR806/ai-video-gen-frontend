import { createScreenplayBlockId, type ScreenplayBlock } from '@core/screenplay';

export function createSplitBlockAttrs(
  previousAttrs: Record<string, unknown>,
  nextType: ScreenplayBlock['type'],
) {
  return {
    ...previousAttrs,
    blockType: nextType,
    // Split paragraphs inherit attrs by default, so Enter-created lines must
    // explicitly get a fresh canonical block id to avoid duplicate ids in autosave payloads.
    blockId: createScreenplayBlockId(),
  };
}

export function isImeComposingEvent(event: { isComposing?: boolean; keyCode?: number }): boolean {
  return event.isComposing === true || event.keyCode === 229;
}
