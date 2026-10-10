---
name: write-blog-post
description: Write a blog post for the Isar Things Shop blog (markdown in src/content/posts/) from a topic given by the user or by the scheduled topic-search automation, then open a pull request for human review. Use whenever the task is to draft or publish a blog article for isarthingshop.com.
---

# Write a blog post for Isar Things Shop

This skill only **writes** the article. It does not search the web for ideas: topic research is done by a separate automation, and the topic arrives as input.

## Input

The topic comes from one of:
- the user ("write a post about World Mental Health Day"), or
- the scheduled automation's result (a topic, plus any sources or notes it found).

If no topic is given, ask for one. Don't invent a topic from scratch.
Use only the notes and sources you were handed. Don't add facts, stats or quotes from your own memory.

## The shop's mission (every post must serve it)

Isar Things Shop is a happy place made of colours. It stands for:

- **Inclusivity**: everyone is welcome, whoever they are.
- **Gender neutrality**: clothes are clothes. Never label an item "for women" or "for men".
- **Self-acceptance of your own body**: wear what feels good on you, now, as you are.
- **A safe place**: somewhere you can feel at home.
- **Carefully selected, one-of-a-kind items**: each piece is picked by hand and will not come again.
- **How you choose to shop counts.**

If a topic or sentence works against any of these, drop it.

## Words we never use

**Never write "second-hand", "secondhand", "second hand", "pre-owned", "used", or any word built on "second".** The shop does not present itself that way. Talk about *carefully selected*, *one-of-a-kind*, *picked by hand*, *unique pieces*, *found with care* instead.

## Voice

Warm, playful, short sentences, a little bit loud, like a friend with great taste. Model it on `src/content/posts/welcome-to-isar-things.md`. Write in English.

Do:
- Talk to "you". Invite, never prescribe.
- Describe how things feel, look and move ("fuzzy", "chunky", "soft").
- Say "wear it however you like", "mix it your way", "works on any body".

Never:
- Gendered framing ("for her", "boyfriend fit", "men's / women's").
- Body-shaming or "flattering", "slimming", "hides", "fix", "flaws", "perfect body". No weight, no diets.
- Fake urgency or pressure ("last chance!!", "you NEED this").
- Guilt-tripping about other people's choices.
- Medical, financial or sustainability claims with numbers you can't source.

## Awareness days and sensitive topics (e.g. World Mental Health Day)

The shop can join the conversation, gently and honestly:
- Tie it to what the shop really is: colour, comfort, a safe place, feeling at home in your clothes and your body.
- Never claim that clothes or shopping treat, cure or fix anything. At most: small things that feel good can brighten a day.
- No diagnoses, no medical or therapy advice, no "just cheer up" tone.
- Don't use anyone's pain to sell. Keep product mentions light, one or two at most, and optional.
- Close with kindness. A short line inviting people to reach out to someone they trust or a local support service is welcome. Don't invent helpline numbers; use one only if it came with the topic input.

## Write the post

Check existing posts in `src/content/posts/` first and don't repeat one.

Create `src/content/posts/<slug>.md`. The filename (kebab-case, no date) is the URL `/blog/<slug>`.

```
---
title: ...
date: YYYY-MM-DD   # today
excerpt: one or two sentences for the blog list
cover: some-photo.webp
---
```

All four fields are required or the build fails.

Rules:
- `cover` and every `![alt](file.webp)` must be a filename that exists in `src/assets/carousel/`. Check with `ls`. Never invent one. Pick items from `src/data/carousel.csv` whose colours or mood fit the topic.
- Every image needs real alt text that describes the photo.
- Product links: copy the Vinted URL from the `link` column of `src/data/carousel.csv`. Never write one from memory. Only link items still in the CSV.
- Link style: `[Grab the striped sweater on Vinted →](URL)`.
- Structure: short hook, 2–3 `##` sections, a tip list if useful, 1–3 product moments, a short closing. About 300–500 words.
- End with the waitlist nudge (join the homepage waitlist for 24h early access) when it fits the tone. Skip it on sensitive topics.
- Sources: when the post uses news, facts, figures, dates or an awareness-day theme from the sources you were given, end the post with a short sources line after a `---` rule, e.g. `*Source: [Organisation name](URL), D Month YYYY.*` (several sources: `*Sources: [A](URL), date; [B](URL), date.*`), keeping link text short. Only list sources you were actually given and actually used. Posts with no outside facts (styling, shop or mission posts) need no sources line. Also list the sources in the PR description.
- Styling suggestions must be body- and gender-neutral.

Before finishing, search the file for "second" and rewrite any hit.

## Housekeeping

1. Add the post to `public/sitemap.xml`:
   ```
   <url>
     <loc>https://isarthingshop.com/blog/<slug></loc>
     <changefreq>monthly</changefreq>
   </url>
   ```
2. Run the build and make sure it passes (`bun run build`, or `npm run build`). A missing image or frontmatter field fails here.

## Publish through a pull request

Pushing to `main` deploys the live site immediately and syncs to Lovable, so **never push to `main`**.

1. `git checkout -b blog/<slug>` from an up-to-date `main`.
2. Commit the post and the sitemap change.
3. Push the branch and open a PR. In the description list the topic, who requested it (user or automation), the sources received, why it fits the mission, and which Vinted items are featured.
4. Stop. The human reviews and merges.

Do not rewrite published git history (no force push, rebase or amend of pushed commits).

## Cadence

At most 1–2 posts a week. Quality over volume.
