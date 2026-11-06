import type { BorderDiagram } from '@dorkroom/logic';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DiagramLayout {
  paper: Rect;
  print: Rect;
}

/** The paper and the print on it, scaled to fit a `box`-point square. */
export function diagramSize(
  diagram: BorderDiagram,
  box: number
): DiagramLayout {
  const longest = Math.max(diagram.paperW, diagram.paperH);
  const scale = longest > 0 ? box / longest : 0;
  return {
    paper: {
      x: 0,
      y: 0,
      width: diagram.paperW * scale,
      height: diagram.paperH * scale,
    },
    print: {
      x: diagram.printX * scale,
      y: diagram.printY * scale,
      width: diagram.printW * scale,
      height: diagram.printH * scale,
    },
  };
}
