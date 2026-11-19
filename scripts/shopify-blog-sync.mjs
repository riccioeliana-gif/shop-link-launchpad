// Publishes the markdown posts in src/content/posts/ to the Shopify blog.
// Idempotent: a post is matched by its Shopify handle (= file name), created if new, updated otherwise.
//
// Usage:
//   node scripts/shopify-blog-sync.mjs --dry-run        # print what would be sent, no network
//   node scripts/shopify-blog-sync.mjs                  # publish (needs env vars below)
//
// Env: SHOPIFY_STORE (e.g. ckm400-ib.myshopify.com), SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET
// Optional: SHOPIFY_BLOG_HANDLE (default "news"), ASSET_BASE_URL (public base URL of src/assets/carousel)
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { marked } from 'marked';

const DRY = process.argv.includes('--dry-run');
const POSTS_DIR = 'src/content/posts';
const API_VERSION = '2025-10';
const BLOG_HANDLE = process.env.SHOPIFY_BLOG_HANDLE || 'news';
const ASSET_BASE =
  process.env.ASSET_BASE_URL ||
  'https://raw.githubusercontent.com/riccioeliana-gif/shop-link-launchpad/main/src/assets/carousel';
const AUTHOR = 'Isar Things Shop';

function parsePost(file) {
  const raw = readFileSync(join(POSTS_DIR, file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1');
  }
  const body = m[2].replace(/!\[([^\]]*)\]\((?!https?:)([^)]+)\)/g, (_, alt, src) => `![${alt}](${ASSET_BASE}/${src})`);
  return {
    handle: basename(file, '.md'),
    title: meta.title,
    summary: meta.excerpt || '',
    tags: (meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    publishDate: meta.date ? new Date(`${meta.date}T09:00:00Z`).toISOString() : undefined,
    image: meta.cover ? { url: `${ASSET_BASE}/${meta.cover}`, altText: meta.title } : undefined,
    body: marked.parse(body),
  };
}

const posts = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md')).map(parsePost);

if (DRY) {
  for (const p of posts) console.log(JSON.stringify({ ...p, body: p.body.slice(0, 120) + '…' }, null, 2));
  console.log(`\nDry run: ${posts.length} posts parsed, nothing sent.`);
  process.exit(0);
}

const { SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = process.env;
if (!SHOPIFY_STORE || !SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
  throw new Error('Set SHOPIFY_STORE, SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET');
}

async function getToken() {
  const res = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  return (await res.json()).access_token;
}

const token = await getToken();
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
const fail = (errs) => { if (errs?.length) throw new Error(JSON.stringify(errs)); };

// Find or create the blog
const blogs = (await gql(`{ blogs(first: 20) { nodes { id handle title } } }`)).blogs.nodes;
let blog = blogs.find((b) => b.handle === BLOG_HANDLE);
if (!blog) {
  const r = (await gql(`mutation($b: BlogCreateInput!){ blogCreate(blog: $b){ blog{ id handle } userErrors{ field message } } }`,
    { b: { title: 'News', handle: BLOG_HANDLE } })).blogCreate;
  fail(r.userErrors);
  blog = r.blog;
  console.log(`Created blog "${BLOG_HANDLE}"`);
}

const existing = (await gql(
  `query($q: String!){ articles(first: 250, query: $q){ nodes { id handle } } }`,
  { q: `blog_id:${blog.id.split('/').pop()}` },
)).articles.nodes;
const byHandle = new Map(existing.map((a) => [a.handle, a.id]));

for (const p of posts) {
  const article = {
    title: p.title, handle: p.handle, body: p.body, summary: p.summary, tags: p.tags,
    isPublished: true, publishDate: p.publishDate, image: p.image, author: { name: AUTHOR },
  };
  const id = byHandle.get(p.handle);
  if (id) {
    const r = (await gql(`mutation($id: ID!, $a: ArticleUpdateInput!){ articleUpdate(id: $id, article: $a){ article{ id } userErrors{ field message } } }`,
      { id, a: article })).articleUpdate;
    fail(r.userErrors);
    console.log(`Updated  ${p.handle}`);
  } else {
    const r = (await gql(`mutation($a: ArticleCreateInput!){ articleCreate(article: $a){ article{ id } userErrors{ field message } } }`,
      { a: { ...article, blogId: blog.id } })).articleCreate;
    fail(r.userErrors);
    console.log(`Created  ${p.handle}`);
  }
}
