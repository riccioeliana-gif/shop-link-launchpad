// Creates or updates a Shopify product from a JSON spec in products/.
// Idempotent: matched by handle (productSet upsert). New products should use "status": "DRAFT".
//
// Usage:
//   node scripts/shopify-product.mjs products/<handle>.json --dry-run   # validate + print payload, no network
//   node scripts/shopify-product.mjs products/<handle>.json             # upload
//
// Env (.env or environment): SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET
// App scopes needed: write_products (+ read_locations, write_inventory to set stock).
//
// Images: { "url": "https://..." } is fetched by Shopify; { "file": "images/x.jpg" } (relative to the
// JSON file) is uploaded through a staged upload first.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';

const API_VERSION = '2025-10';
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const specPath = args.find((a) => !a.startsWith('--'));
if (!specPath) throw new Error('Usage: node scripts/shopify-product.mjs products/<handle>.json [--dry-run]');

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const specDir = dirname(resolve(specPath));
for (const k of ['handle', 'title', 'descriptionHtml', 'options', 'variants', 'images']) {
  if (!spec[k]) throw new Error(`${specPath}: missing "${k}"`);
}
for (const img of spec.images) {
  if (img.file && !existsSync(resolve(specDir, img.file))) throw new Error(`image not found: ${img.file}`);
}

function productInput(files) {
  return {
    handle: spec.handle,
    title: spec.title,
    descriptionHtml: spec.descriptionHtml,
    vendor: spec.vendor,
    productType: spec.productType,
    status: spec.status || 'DRAFT',
    tags: spec.tags,
    category: spec.category,
    seo: spec.seo,
    metafields: (spec.metafields || []).map((m) => ({
      namespace: m.namespace,
      key: m.key,
      type: m.type,
      value: typeof m.value === 'string' ? m.value : JSON.stringify(m.value),
    })),
    productOptions: spec.options.map((o) => ({ name: o.name, values: o.values.map((name) => ({ name })) })),
    variants: spec.variants.map((v) => ({
      optionValues: Object.entries(v.options).map(([optionName, name]) => ({ optionName, name })),
      sku: v.sku,
      barcode: v.barcode || undefined,
      price: v.price,
      compareAtPrice: v.compareAtPrice || undefined,
      inventoryItem: {
        tracked: v.tracked ?? true,
        ...(v.weightKg != null && { measurement: { weight: { value: v.weightKg, unit: 'KILOGRAMS' } } }),
      },
    })),
    files,
  };
}

if (DRY) {
  const files = spec.images.map((i) => ({ originalSource: i.url || `file:${i.file}`, alt: i.alt, contentType: 'IMAGE' }));
  console.log(JSON.stringify(productInput(files), null, 2));
  console.log(`\nDry run OK: ${spec.images.length} images, ${spec.variants.length} variant(s). Nothing sent.`);
  process.exit(0);
}

const { SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = process.env;
if (!SHOPIFY_STORE || !SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
  throw new Error('Set SHOPIFY_STORE, SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env');
}

const tokenRes = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }),
});
if (!tokenRes.ok) {
  const body = await tokenRes.text();
  throw new Error(`Token request failed: ${tokenRes.status} ${body.match(/<title>(.*?)<\/title>/)?.[1] ?? ''}`);
}
const token = (await tokenRes.json()).access_token;

async function gql(query, variables) {
  const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}
const fail = (where, errs) => {
  if (errs?.length) throw new Error(`${where}: ${JSON.stringify(errs)}`);
};

async function stageUpload(path) {
  const filename = basename(path);
  const mimeType = /\.png$/i.test(path) ? 'image/png' : /\.webp$/i.test(path) ? 'image/webp' : 'image/jpeg';
  const data = await gql(
    `mutation($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } } }`,
    { input: [{ filename, mimeType, resource: 'IMAGE', httpMethod: 'POST', fileSize: String(statSync(path).size) }] },
  );
  fail('stagedUploadsCreate', data.stagedUploadsCreate.userErrors);
  const target = data.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([readFileSync(path)], { type: mimeType }), filename);
  const up = await fetch(target.url, { method: 'POST', body: form });
  if (!up.ok) throw new Error(`upload of ${filename} failed: ${up.status}`);
  return target.resourceUrl;
}

// Existing product? Then keep its media (productSet with files replaces media, so skip re-uploading).
const existing = (await gql(`query($q: String!) { products(first: 1, query: $q) { nodes { id media(first: 1) { nodes { id } } } } }`, {
  q: `handle:${spec.handle}`,
})).products.nodes[0];

let files;
if (!existing || existing.media.nodes.length === 0 || args.includes('--replace-images')) {
  files = [];
  for (const img of spec.images) {
    const originalSource = img.file ? await stageUpload(resolve(specDir, img.file)) : img.url;
    files.push({ originalSource, alt: img.alt, contentType: 'IMAGE' });
  }
}

const input = productInput(files);
if (!files) delete input.files;

const data = await gql(
  `mutation($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
    productSet(synchronous: true, input: $input, identifier: $identifier) {
      product { id handle status title variants(first: 10) { nodes { sku price } } }
      userErrors { field message code } } }`,
  { input, identifier: { handle: spec.handle } },
);
fail('productSet', data.productSet.userErrors);
const p = data.productSet.product;
const numericId = p.id.split('/').pop();
console.log(`${existing ? 'Updated' : 'Created'} ${p.status} product "${p.title}"`);
console.log(`  variants: ${p.variants.nodes.map((v) => `${v.sku} €${v.price}`).join(', ')}`);
console.log(`  admin: https://admin.shopify.com/store/${SHOPIFY_STORE.replace('.myshopify.com', '')}/products/${numericId}`);
