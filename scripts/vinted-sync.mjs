#!/usr/bin/env node
/**
 * vinted-sync — validates the Vinted item links in the shop data and blog.
 *
 * It scans src/data/carousel.csv and every markdown file in
 * src/content/posts/ for Vinted item links, fetches each item page (no
 * login needed) and checks whether the listing is still live. When an item
 * has been sold and its link no longer resolves, the link is swapped for
 * your Vinted profile URL (from links.csv) so visitors never hit a 404.
 *
 * Modes:
 *   node scripts/vinted-sync.mjs            report only (default)
 *   node scripts/vinted-sync.mjs --apply    fix dead links in carousel.csv
 *                                           and blog posts
 *
 * Runs on a daily schedule via .github/workflows/vinted-sync.yml.
 */

const CAROUSEL_PATH = new URL("../src/data/carousel.csv", import.meta.url);
const LINKS_PATH = new URL("../src/data/links.csv", import.meta.url);
const POSTS_DIR = new URL("../src/content/posts/", import.meta.url);

const APPLY = process.argv.includes("--apply");
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const REQUEST_DELAY_MS = 3000;
const REQUEST_JITTER_MS = 2000;
const MAX_RETRIES = 3;

// ---------------------------------------------------------------- CSV helpers

/** Parse a CSV string (handles quoted fields with commas and "" escapes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

/** Serialize rows back to CSV, quoting only where necessary. */
function csvEscape(value) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function stringifyCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

// ---------------------------------------------------------------- Item checks

function extractItemId(link) {
  const match = link.match(/vinted\.it\/items\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch the item page and classify it as live, dead, or unknown.
 *
 * Only definitive signals flip a link to dead (404, or a page without the
 * "| Vinted" title). Anything ambiguous — rate limiting (429), server
 * errors, network failures — is reported as "unknown" and is NEVER allowed
 * to trigger a link rewrite. A live link must never be broken by a bad run.
 */
async function checkItem(itemId, depth = 0) {
  const response = await fetch(`https://www.vinted.it/items/${itemId}`, {
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
  });

  // Rate-limited or transient server error: back off and retry.
  if (response.status === 429 || response.status >= 500) {
    if (depth < MAX_RETRIES) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : (depth + 1) * 10000;
      await sleep(waitMs);
      return checkItem(itemId, depth + 1);
    }
    return { live: null, status: response.status, title: "" };
  }

  const html = await response.text();
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  if (response.ok && title.includes("| Vinted")) {
    return { live: true, status: response.status, title };
  }
  if (response.status === 404) {
    return { live: false, status: response.status, title };
  }
  // Unexpected state (redirect loop, captcha page, unknown 3xx/4xx…):
  // treat as unknown rather than guessing.
  return { live: null, status: response.status, title };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------- Main

async function main() {
  const linksRows = parseCsv((await read(LINKS_PATH)).trimEnd());
  const profileLink = linksRows.find((r) => r[0] === "vinted" && r[1])?.[1] ?? "";
  if (!profileLink) {
    console.error("✗ No 'vinted' profile link found in src/data/links.csv");
    process.exit(1);
  }

  const carouselRows = parseCsv((await read(CAROUSEL_PATH)).trimEnd());
  const [header, ...items] = carouselRows;
  const col = Object.fromEntries(header.map((name, i) => [name, i]));

  // Blog posts can embed Vinted item links too — scan them so a sold item
  // never leaves a 404 inside an article.
  const postFiles = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".md"));
  const posts = new Map(); // filename -> raw markdown
  for (const file of postFiles) {
    posts.set(file, await read(new URL(file, POSTS_DIR)));
  }

  const uniqueItemIds = new Set();
  for (const item of items) {
    const id = extractItemId(item[col.link] ?? "");
    if (id) uniqueItemIds.add(id);
  }
  const postRefs = new Map(); // itemId -> ["post.md", …]
  for (const [file, text] of posts) {
    for (const match of text.matchAll(/vinted\.it\/items\/(\d+)/g)) {
      const id = match[1];
      uniqueItemIds.add(id);
      postRefs.set(id, [...(postRefs.get(id) ?? []), file]);
    }
  }

  const postNote = postRefs.size ? ` (${postRefs.size} also referenced in blog posts)` : "";
  console.log(
    `Checking ${uniqueItemIds.size} Vinted item link(s) across ${items.length} carousel row(s) and ${posts.size} blog post(s)${postNote}…\n`,
  );

  const results = new Map(); // itemId -> check result
  let unknownCount = 0;
  for (const id of uniqueItemIds) {
    let result;
    try {
      result = await checkItem(id);
    } catch (error) {
      result = { live: null, status: 0, title: "", error: String(error) };
    }
    results.set(id, result);
    console.log(
      result.live
        ? `  ✓ ${id} — ${result.title.replace(" | Vinted", "")}`
        : result.live === false
          ? `  ✗ ${id} — DEAD (HTTP ${result.status})`
          : `  ? ${id} — UNKNOWN (HTTP ${result.status}${result.error ? `, ${result.error}` : ""}) — skipped, link untouched`,
    );
    if (result.live === null) unknownCount++;
    const delay = REQUEST_DELAY_MS + Math.random() * REQUEST_JITTER_MS;
    await sleep(delay);
  }

  const deadRows = [];
  const deadIds = new Set();
  const unlinkedRows = [];
  for (const item of items) {
    const id = extractItemId(item[col.link] ?? "");
    if (id && results.get(id)?.live === false) {
      deadRows.push(item);
      deadIds.add(id);
    }
    if (!item[col.product] && !(item[col.link] ?? "").startsWith("https://"))
      unlinkedRows.push(item[col.id]);
  }
  for (const id of postRefs.keys()) {
    if (results.get(id)?.live === false) deadIds.add(id);
  }

  if (unlinkedRows.length > 0) {
    console.log(
      `\nℹ Rows without a Vinted link (add one manually or ask me to): ${unlinkedRows.join(", ")}`,
    );
  }

  if (deadIds.size === 0) {
    if (unknownCount > 0) {
      console.log(
        `\n⚠ ${unknownCount} link(s) could not be verified (rate limit or network). No changes will be made — run again later.`,
      );
    } else {
      console.log("\n✓ All Vinted links are live. Nothing to do.");
    }
    return;
  }

  if (unknownCount > 0) {
    // Refuse to rewrite anything while the run was only partially verified:
    // a rate-limited or captcha-blocked fetch must never break a live link.
    console.log(
      `\n⚠ ${unknownCount} link(s) could not be verified. Aborting without changes — retry later or run npm run vinted-sync to re-check.`,
    );
    return;
  }

  console.log(
    `\n${deadIds.size} item link(s) are sold/removed — new link would be: ${profileLink}`,
  );
  for (const id of deadIds) {
    const inPosts = postRefs.get(id) ?? [];
    console.log(`  • ${id}${inPosts.length ? ` — also used in ${inPosts.join(", ")}` : ""}`);
  }

  if (!APPLY) {
    console.log(
      "\nDry run. Run `npm run vinted-sync:apply` (or wait for the GitHub Action) to fix.",
    );
    return;
  }

  let fixedRows = 0;
  for (const item of deadRows) {
    if (item[col.link] !== profileLink) {
      item[col.link] = profileLink;
      fixedRows++;
    }
  }
  let fixedPosts = 0;
  for (const [file, text] of posts) {
    let updated = text;
    let changed = false;
    for (const id of deadIds) {
      // Match the entire URL (scheme + host + id + optional slug) so the
      // replacement doesn't leave a doubled "https://www." prefix behind.
      const regex = new RegExp(`https?:\\/\\/[^)"\\s]*vinted\\.it/items/${id}\\b[^)"\\s]*`, "g");
      if (regex.test(updated)) {
        updated = updated.replace(
          new RegExp(`https?:\\/\\/[^)"\\s]*vinted\\.it/items/${id}\\b[^)"\\s]*`, "g"),
          profileLink,
        );
        changed = true;
      }
    }
    if (changed) {
      await write(new URL(file, POSTS_DIR), updated);
      fixedPosts++;
    }
  }
  if (fixedRows > 0) await write(CAROUSEL_PATH, stringifyCsv(carouselRows));
  console.log(
    `\n✓ Updated carousel.csv (${fixedRows} row(s)) and ${fixedPosts} blog post(s) to point at your Vinted profile.`,
  );
}

// Small async file helpers so this stays dependency-free.
import { readFile, writeFile, readdir } from "node:fs/promises";
function read(path) {
  return readFile(path, "utf8");
}
function write(path, content) {
  return writeFile(path, content, "utf8");
}

main().catch((error) => {
  console.error("✗ vinted-sync failed:", error);
  process.exit(1);
});
