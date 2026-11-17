import { Presentation, text, column, fill, hug } from '@oai/artifact-tool';
const p = Presentation.create({ slideSize: { width: 1920, height: 1080 } });
const s = p.slides.add();
s.background.fill = { type: 'solid', color: '#0B1220' };
s.compose(column({ width: fill, height: fill, padding: 40, gap: 20 }, [text('Hello', { width: fill, height: hug, style: { fontSize: 40, color: '#ffffff' } })]), { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 });
const b = await s.export();
console.log(b.type, b.size);
