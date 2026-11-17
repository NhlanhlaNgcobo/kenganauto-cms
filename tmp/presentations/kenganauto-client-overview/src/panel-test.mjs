/** @jsxRuntime automatic */
/** @jsxImportSource @oai/artifact-tool/presentation-jsx */
import { Presentation, column, panel, text, fill, hug } from '@oai/artifact-tool';
const p = Presentation.create({ slideSize: { width: 1920, height: 1080 } });
const s = p.slides.add();
s.compose(column({ width: fill, height: fill, padding: 40, gap: 20 }, [panel({ padding: { x: 20, y: 20 } }, text('Hello', { width: fill, height: hug, style: { fontSize: 40 } }))]), { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 });
const b = await s.export();
console.log(b.type, b.size);
