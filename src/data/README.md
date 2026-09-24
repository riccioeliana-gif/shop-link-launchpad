# Site data

Plain CSV files — open them in Excel/Numbers/Google Sheets, or just ask Claude
Code ("add this new drop to the carousel") using the `update-shop` skill.

## `carousel.csv`

One row per carousel photo, in the order they appear on the site.

| column    | meaning                                                                 |
| --------- | ------------------------------------------------------------------------ |
| `id`      | unique short slug, e.g. `sage-bag`. Used as the React key.               |
| `image`   | filename of the photo in `src/assets/carousel/` (must already exist there). |
| `alt`     | short description of the photo, for screen readers and SEO.              |
| `link`    | the word `instagram` (links to the Instagram profile), or a full Vinted item URL. |
| `product` | product name, only when `link` is a Vinted URL. Leave blank for `instagram` rows. Same product photographed twice (e.g. a "worn" shot) should reuse the same `link` + `product` so analytics group them together. |

## `links.csv`

Site-wide links: `instagram`, `vinted` (shop front page), `email`. Edit the
`value` column only.

## After editing

Run `npm run build` once to catch typos (missing image file, broken CSV row)
before pushing — the `update-shop` skill does this automatically.
