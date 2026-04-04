export interface TextReplacement {
  from: number;
  to: number;
  text: string;
}

export function applyTextReplacementsBottomUp(
  replacements: ReadonlyArray<TextReplacement>,
  applyReplacement: (replacement: TextReplacement) => void,
): void {
  [...replacements]
    .sort((left, right) => right.from - left.from)
    .forEach((replacement) => {
      applyReplacement(replacement);
    });
}
