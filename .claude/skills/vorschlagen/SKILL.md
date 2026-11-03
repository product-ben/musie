---
name: vorschlagen
description: Send Lucia's current idea to Ben — commit, push the branch, open a pull request, and give her the link. Only when she types /vorschlagen.
disable-model-invocation: true
---

# /vorschlagen — send it to Ben

## 1 · Only from her own branch

`git branch --show-current` must start with `vorschlag/`. On `main`, or with
nothing changed since `origin/main`, stop and tell her in German there is
nothing to send — `/neu` starts an idea.

## 2 · Check first

Run `pnpm check`. If it fails and you cannot fix it, send the pull request
anyway, as a **draft** (`--draft` below), with the failure in the description.
Ben would rather see an unfinished idea than none.

## 3 · Commit

Never `git add -A` or `git commit -a` (both denied by the repo). Add each
changed file by name: `git add -- <file> <file>`. Check `git status` first
and leave out anything that is not part of this idea — and above all anything
like `.env*`.

The commit message is English. Follow the repo's style — read
`git log --oneline -15`: the subject says what is now true, as a plain
sentence, not "Update X". End it with:

```
Proposed-by: Lucia
```

## 4 · Push the branch and open the pull request

```sh
git push -u origin HEAD
gh pr create --base main --title "<title>" --body-file <file in the scratchpad>
```

The title is the commit subject. The body, in English:

```markdown
## What Lucia asked for
<her idea in one or two sentences. Quote her German where it says it best.>

## Why
<the therapeutic or user reason, as she gave it. If she gave none, ask her
before sending — this is the part only she can write.>

## What changed
<the files and what each change does, briefly, for Ben.>

## How to see it
<the page at localhost:5173 and what to do there.>

## What Ben has to do
<anything the guard kept you from doing: a migration, an Edge Function
change, a failed check. "Nothing" if nothing.>

## Content changes made live alongside this
<anything she changed by hand at /maintenance or in the exercise builder
while working on this, if she mentions it. "None" if none.>
```

No screenshots from the command line. If a picture would help, tell her she
can drag one into the pull request page in the browser — and that it must not
show anyone's diary.

## 5 · Tell her

In German: it is with Ben now, the link, and that she can keep working on
something else with `/neu`. When Ben comments, she opens a session on this
branch and says so; then read the comments with `gh pr view --comments`,
make the changes, commit and `git push` again — the pull request updates
itself.
