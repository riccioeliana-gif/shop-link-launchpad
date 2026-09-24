---
name: update-shop
description: Update the Isar Things Shop website — add/remove/reorder carousel photos, change a Vinted or Instagram link, change the shop-wide Instagram/Vinted/email links — then commit and push so it goes live. Use whenever the user wants to change a photo, a link, or a product on isarthingshop.com.
---

# Update Isar Things Shop

No coding needed. Everything you'll touch lives in `src/data/`:

- `src/data/carousel.csv` — the photos in the homepage carousel, one row each.
- `src/data/links.csv` — the three site-wide links: Instagram, Vinted shop, email.
- `src/data/README.md` — column reference, read it if unsure what a column means.

Pushing to `main` deploys the live site automatically (Cloudflare). So the
last step of every task here is a git commit + push — always ask the user to
confirm before pushing, since it goes live immediately.

## Add a new drop (new photo + Vinted link)

1. Ask the user for: the photo file, the Vinted item URL, and the product name
   (e.g. "blue linen scarf").
2. Save the photo into `src/assets/carousel/` as a `.webp` file. If it isn't
   `.webp` already, convert it (`cwebp`, or any image tool available) — don't
   add other formats, the site only globs `*.webp` there. Pick a short
   kebab-case filename, e.g. `blue-linen-scarf.webp`.
3. Write good alt text yourself from the photo: a short, plain description of
   what's visible (e.g. "Blue linen scarf folded on a wooden table"). Don't
   just ask the user for this.
4. Add a row to `src/data/carousel.csv`:
   `id,image,alt,link,product` — `id` is a short kebab-case slug (usually the
   same as the filename without `.webp`), `link` is the full Vinted URL,
   `product` is the name the user gave you.
5. Run `npm run build` to confirm nothing broke (catches typos, a missing
   image file, a malformed CSV row).
6. Show the user a one-line summary of the row you added, then ask to
   confirm before committing + pushing.

## Add a new drop that only has an Instagram post (no Vinted link yet)

Same as above, but set `link` to the literal word `instagram` and leave
`product` blank.

## Remove a photo

1. Delete its row from `src/data/carousel.csv`.
2. Leave the actual image file in `src/assets/carousel/` unless the user
   explicitly asks to delete it too (removing the CSV row is enough to take
   it off the site).
3. `npm run build`, then confirm before committing + pushing.

## Reorder photos

Carousel order = CSV row order, top to bottom. Just reorder the rows.

## Change a link (a photo now points somewhere else)

Edit the `link` (and `product`, if it's now a different item) column on that
row in `carousel.csv`. If two rows show the same product (e.g. a product shot
and a "worn" shot), keep `link` and `product` identical on both rows — that's
how the shop groups them in analytics.

## Change the shop-wide Instagram / Vinted / email link

Edit the matching `value` in `src/data/links.csv`. These three feed the
buttons in the hero, the content cards, and the footer — no other file needs
touching.

## After any change: build, then ask before pushing

```
npm run build
```

If it fails, the error will point at the CSV row or missing file — fix it and
rebuild before pushing. Once it's clean:

```
git add -A
git commit -m "<short description of what changed>"
git push
```

Always show the user what changed (`git diff` summary or plain English) and
get an explicit yes before running `git push` — that step makes it live on
isarthingshop.com immediately.

## If something looks broken instead of missing

If the user reports the site looks broken rather than "I want to change X",
that's not this skill's job — read the actual error/build output and debug
normally; don't guess at a CSV fix.
