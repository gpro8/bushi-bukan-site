#!/bin/sh
# Publish dist/ to gh-pages as gpro8. No GitHub Actions.
# Keeps makimono/ (preview). Does not touch main.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "working tree dirty — commit main first" >&2
  exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  echo "run from main (on $branch)" >&2
  exit 1
fi

sha=$(git rev-parse HEAD)
npm run build

wt=$(mktemp -d "${TMPDIR:-/tmp}/bukan-pages.XXXXXX")
cleanup() { git worktree remove --force "$wt" >/dev/null 2>&1 || rm -rf "$wt"; }
trap cleanup EXIT

git fetch origin gh-pages
git worktree add --detach "$wt" origin/gh-pages

# Drop previous root publish. Keep the 巻物 preview.
find "$wt" -mindepth 1 -maxdepth 1 ! -name '.git' ! -name 'makimono' -exec rm -rf {} +
cp -R dist/. "$wt/"
find "$wt" -name '.DS_Store' -delete
touch "$wt/.nojekyll"

cd "$wt"
git add -A
if git diff --cached --quiet; then
  echo "gh-pages already matches dist"
  exit 0
fi

export GIT_AUTHOR_NAME=gpro8
export GIT_AUTHOR_EMAIL=272957896+gpro8@users.noreply.github.com
export GIT_COMMITTER_NAME=gpro8
export GIT_COMMITTER_EMAIL=272957896+gpro8@users.noreply.github.com
git commit -m "deploy: $sha"
git push origin HEAD:gh-pages
echo "pushed gh-pages from $sha"
