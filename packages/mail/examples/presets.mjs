// node examples/presets.mjs  → writes every preset, filled with its sample values, to ./previews/<key>.html
import { mkdir, writeFile } from 'node:fs/promises';
import { presetList, renderTemplate } from '@cartiqo/mail';

await mkdir('previews', { recursive: true });
for (const preset of presetList) {
  const { subject, html } = renderTemplate(preset, preset.sample);
  await writeFile(`previews/${preset.key}.html`, html);
  console.log(`${preset.key.padEnd(22)} ${subject}`);
}
