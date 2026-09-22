---
title: "Test Run: First Post from the New Editor"
date: 2026-09-21
lang: en
translationKey: uji-coba-editor-baru
tags:
  - test run
description: >-
  A test post to confirm the write-and-publish flow through the visual editor
  works from start to finish.
---

This article was written and published straight from the visual editor, without touching a terminal and without a manual commit.

If this text shows up on the blog page, the whole chain works: editor, commit to GitHub, automatic build, then live on the site.

## What is being tested

Four things are checked through this single post:

1. **Editor login** — the account can sign in and recognises the right repo
2. **Saving** — frontmatter such as title, date, tags, and description is stored in the format the site expects
3. **Automatic build** — a push from the editor triggers a build with no manual step
4. **Rendering** — the article appears on the blog page with the right date and link

## If something fails

The part that fails points to where the problem is:

- **Cannot log in** — the invitation was not accepted, or the gateway is not active
- **Cannot save** — the connection to GitHub is broken on the gateway side
- **Saved but the site does not change** — the build failed, check its log
- **It appears but looks wrong** — the text format does not match what the site reads

## After this

If everything passes, this editor is ready for real writing. This test post can be deleted at any time.

The principle is the same as with any automation: prove one small flow from start to finish before trusting it.
