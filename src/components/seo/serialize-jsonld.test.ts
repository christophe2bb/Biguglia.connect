import { expect, it } from 'vitest';
import { serializeJsonLd } from './serialize-jsonld';

it.each(['</script>', '</SCRIPT >', '<!-- commentaire -->', '<script src="/x.js">'])('keeps user text safe and valid JSON: %s', (name) => {
  const data = { name, count: 1 };
  const serialized = serializeJsonLd(data);
  expect(serialized).not.toContain('<');
  expect(JSON.parse(serialized)).toEqual(data);
});
