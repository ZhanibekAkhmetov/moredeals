export type SmartphoneIdentity = {
  brand: string;
  model: string;
  storageGb: number | null;
  ramGb: number | null;
  color: string;
  variantName: string;
};

const brands = [
  'Samsung',
  'Apple',
  'Google',
  'Xiaomi',
  'OnePlus',
  'Motorola',
  'Sony',
  'Huawei',
  'Honor',
  'Nokia',
  'Nothing',
  'Oppo',
  'Realme',
  'Asus',
  'LG',
];

const colors: { canonical: string; aliases: string[] }[] = [
  { canonical: 'Natural Titanium', aliases: ['natural titanium'] },
  { canonical: 'Desert Titanium', aliases: ['desert titanium'] },
  { canonical: 'Blue Black', aliases: ['blue black'] },
  { canonical: 'Cobalt Violet', aliases: ['cobalt violet'] },
  { canonical: 'Space Black', aliases: ['space black'] },
  { canonical: 'Space Gray', aliases: ['space gray', 'space grey'] },
  { canonical: 'Black', aliases: ['black', 'schwarz'] },
  { canonical: 'Blue', aliases: ['blue', 'blau'] },
  { canonical: 'White', aliases: ['white', 'weiss', 'weiß'] },
  { canonical: 'Silver', aliases: ['silver', 'silber'] },
  { canonical: 'Gold', aliases: ['gold'] },
  { canonical: 'Green', aliases: ['green', 'grun', 'grün'] },
  { canonical: 'Pink', aliases: ['pink'] },
  { canonical: 'Red', aliases: ['red', 'rot'] },
  { canonical: 'Yellow', aliases: ['yellow', 'gelb'] },
  { canonical: 'Violet', aliases: ['violet', 'violett'] },
  { canonical: 'Purple', aliases: ['purple', 'lila'] },
  { canonical: 'Navy', aliases: ['navy'] },
  { canonical: 'Ultramarine', aliases: ['ultramarine'] },
  { canonical: 'Obsidian', aliases: ['obsidian'] },
  { canonical: 'Porcelain', aliases: ['porcelain', 'porzellan'] },
  { canonical: 'Hazel', aliases: ['hazel'] },
  { canonical: 'Titanium', aliases: ['titanium', 'titan'] },
  { canonical: 'Graphite', aliases: ['graphite', 'graphit'] },
  { canonical: 'Cream', aliases: ['cream', 'creme'] },
  { canonical: 'Lavender', aliases: ['lavender', 'lavendel'] },
  { canonical: 'Mint', aliases: ['mint'] },
  { canonical: 'Tieflau', aliases: ['tieflau'] },
  { canonical: 'Gray', aliases: ['gray', 'grey', 'grau'] },
];

function searchable(value: string) {
  return value
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function titleBrand(title: string, hint: string) {
  const normalizedTitle = searchable(title);
  const found = brands.find((brand) =>
    new RegExp(`(?:^| )${searchable(brand)}(?: |$)`).test(normalizedTitle),
  );
  if (found) return found;
  const normalizedHint = searchable(hint);
  return (
    brands.find((brand) => searchable(brand) === normalizedHint) ?? hint.trim()
  );
}

function titleModel(title: string, brand: string) {
  if (!title || !brand) return '';
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const afterBrand = title.match(new RegExp(`${escaped}\\s+(.+)`, 'i'))?.[1];
  if (!afterBrand) return '';
  const patterns: Record<string, RegExp> = {
    samsung: /^(Galaxy\s+[A-Z]?\d+[A-Z]?(?:\s+(?:Ultra|Plus|FE))?)/i,
    apple: /^(iPhone\s+\d+(?:\s+(?:Pro\s+Max|Pro|Plus|Mini|SE))?)/i,
    google: /^(Pixel\s+\d+[A-Z]?(?:\s+(?:Pro\s+XL|Pro|XL|Fold))?)/i,
    xiaomi: /^(\d+[A-Z]?(?:\s+(?:Ultra|Pro|Lite))?)/i,
    oneplus: /^(\d+[A-Z]?(?:\s+(?:Pro|R|T))?)/i,
  };
  const known = patterns[brand.toLowerCase()]?.exec(afterBrand)?.[1];
  const model = (known ?? afterBrand)
    .replace(/\b(?:AI\s+)?Smartphone\b.*$/i, '')
    .replace(/\b5G\b.*$/i, '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:TB|GB|MB)\b.*$/i, '')
    .replace(
      /\b(?:Dual SIM|Single SIM|ohne Vertrag|Handy|mit Galaxy AI|Android|Privacy Display)\b.*$/i,
      '',
    )
    .replace(/[|,;\-–]+$/g, '')
    .trim();
  return `${brand} ${model}`.replace(/\s+/g, ' ').trim();
}

function capacity(title: string) {
  const matches = Array.from(
    title.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(TB|GB)\b/gi),
  );
  const storage =
    matches.find((match) =>
      /^\s*Speicher\b/i.test(title.slice((match.index ?? 0) + match[0].length)),
    ) ??
    matches.find(
      (match) =>
        !/^\s*RAM\b/i.test(title.slice((match.index ?? 0) + match[0].length)),
    );
  if (!storage) return null;
  return Math.round(
    Number(storage[1].replace(',', '.')) *
      (storage[2].toUpperCase() === 'TB' ? 1024 : 1),
  );
}

export function extractSmartphoneColor(value: string) {
  const normalized = ` ${searchable(value)} `;
  for (const color of colors) {
    if (
      color.aliases.some((alias) =>
        normalized.includes(` ${searchable(alias)} `),
      )
    ) {
      return color.canonical;
    }
  }
  return '';
}

export function normalizeSmartphoneColor(value: string | null | undefined) {
  if (!value?.trim()) return '';
  return searchable(extractSmartphoneColor(value) || value);
}

export function parseSmartphoneTitle(
  title: string,
  brandHint = '',
): SmartphoneIdentity {
  const brand = titleBrand(title, brandHint);
  const storageGb = capacity(title);
  const ram = title.match(/\b(\d+)\s*GB\s*RAM\b/i);
  const color = extractSmartphoneColor(title);
  return {
    brand,
    model: titleModel(title, brand),
    storageGb,
    ramGb: ram ? Number(ram[1]) : null,
    color,
    variantName: [storageGb === null ? '' : `${storageGb} GB`, color]
      .filter(Boolean)
      .join(' '),
  };
}
