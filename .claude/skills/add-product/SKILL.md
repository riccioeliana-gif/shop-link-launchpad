---
name: add-product
description: Add a new product to the Isar Things Shopify store from a supplier/manufacturer page (e.g. Yehwang) — read the page, build the tile-wall photo, write products/<handle>.json in the shop's format and upload it as a DRAFT. Use when the user gives a manufacturer link + SKU/size and wants it in the Shopify shop.
---

# Add a product to Shopify

Living skill: when something new is learned or fixed, update this file
(especially **Open points** at the bottom) in the same PR.

Input from the user: the manufacturer page URL + the supplier SKU and size
(e.g. `0605843-331 SM`). Ask for price and stock if they didn't say.

## One-time setup (per computer)

- `.env` in the repo root (git-ignored) must contain
  `SHOPIFY_STORE=ckm400-ib.myshopify.com`, `SHOPIFY_CLIENT_ID=`, `SHOPIFY_CLIENT_SECRET=`
  (Shopify Dev Dashboard app, installed on the store). Never print or commit them.
- `uv` installed (`brew install uv`) — runs the photo script with its own Python.
- First photo run downloads the cut-out model (~1 GB, to `~/.rembg`).

Quick check that Shopify works: `node scripts/shopify-product.mjs products/<any>.json --dry-run`
then a real run on an existing product (it updates, never duplicates).

## Steps

1. **Read the supplier page.** Yehwang blocks scripts with a browser check —
   do not try to bypass it; read it through Claude in Chrome (user's browser).
   Decline cookies. Click the right colour's row in the SKU table so the
   gallery switches to that colour. Collect:
   - colour name, sizes, SKU row for the requested size
   - Material, weight (`Il peso`, grams), brand
   - size table (CM): Shoulders / Bust / Sleeve length / Overall length, all sizes
   - image URLs (`img-cdn.yehwang.com/image/catalog/...`, drop `?image_process=...`)
   - MSRP and cost, to tell the user (never put cost anywhere public)
2. **Pick images.** Download them into the scratchpad and make a contact sheet;
   keep only photos of the **requested colour** (galleries mix colours).
   Order: tile photo, packshot front, packshot back, worn close-up, worn full-length.
3. **Tile photo** from the best front packshot:
   ```
   uv run scripts/product-photo.py IN.jpg -o OUT_DIR --save-cutout --hook off
   ```
   `--hook off` for packshots without a hanger; default `auto` adds a hook only
   when a hanger is detected. Look at the result before using it. Copy it to
   `products/images/<handle>-<size>-tiles.jpg`.
4. **Write `products/<handle>.json`** — copy the newest file in `products/` as
   template. Conventions (match the products already in the store):
   - `title`: `<Style> – <Detail> – <Colour(s)>` in English, en dash, e.g.
     `Striped Ruffle Cardigan – Big Collar – Fuchsia & Pink`
   - `handle`: kebab-case of the title without the detail part
   - `vendor`: `Isar Things` (never the supplier brand)
   - `status`: `DRAFT` — the user publishes from the admin
   - `sku`: supplier SKU with `-` instead of space: `0605843-331-SM`
   - options: `Color` (single word, e.g. `Pink`) and `Size` (`S/M`, `L/XL`)
   - `weightKg` from the page weight
   - description HTML: intro paragraph (what it is + how to wear it) →
     `Made for every body and every style, because at Isar no piece has just one way to be worn.` →
     **Details** list (Brand new with tags, Colour, Size, Material, Fit) →
     **Size guide (cm)** table with all sizes → **Shipping & returns** line.
     Write the copy yourself in the shop's warm voice; don't copy the supplier text.
   - tags: lowercase kebab, always `autumn-winter`/season, `new-with-tags`,
     product kind, colours, `colourful` when it fits
   - `seo.title` `<Name>, <Size> | Isar Things`; `seo.description` ≤ 160 chars
   - every image gets a descriptive `alt`
   - category + metafields: copy from a similar product (see table below)
5. **Dry run**, show the user a short summary (title, price, SKU, images), then upload:
   ```
   node scripts/shopify-product.mjs products/<handle>.json --dry-run
   node scripts/shopify-product.mjs products/<handle>.json
   ```
   Re-running updates the same product (matched by handle) and keeps its images;
   add `--replace-images` to re-upload them.
6. Give the user the admin link the script prints and the list of things to
   check (price, stock, empty fields). Commit the JSON + tile image on a branch
   and open a PR (never push to `main` directly — Lovable syncs it).

## Reference values

| What | Value |
|---|---|
| Category Cardigans | `gid://shopify/TaxonomyCategory/aa-1-13-3` |
| age-group (adults) | `gid://shopify/Metaobject/819500843334` |
| target-gender (as used on all products) | `gid://shopify/Metaobject/825237766470` |
| size-type (regular) | `gid://shopify/Metaobject/819450904902` |
| sleeve-length-type (long) | `gid://shopify/Metaobject/818958926150` |
| color-pattern Pink | `gid://shopify/Metaobject/819448742214` |
| Price striped cardigans / fuzzy jumpers | €28 |

For other categories/colours: look at an existing product of that kind
(GraphQL `products(query: "title:*Scarf*")` → `category { id }`, `metafields`).

## Open points (update as they get solved)

- **Stock** can't be set yet: the app lacks `read_locations` + `write_inventory`.
  Products are created with stock 0 → set it in the admin. Once the scopes are
  added, extend `shopify-product.mjs` with `inventoryQuantities`.
- **Neckline / fabric** metafields left empty: values are metaobjects and the app
  lacks `read_metaobjects` to look up their names. Fill them in the admin.
- **Barcode/GTIN**: Yehwang shows the GTIN of the default colour only — leave empty
  unless it's clearly the right variant's.
- **Hook** drawing in `product-photo.py` isn't right yet (shape vs. the real
  wooden-hanger hook). Use `--hook off` until fixed.
- **Packshots without hanger** look flat on the wall; consider adding a hanger image.
