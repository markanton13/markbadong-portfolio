# Apply Learning Library Portfolio Integration v2

This patch is for:

```text
C:\Users\Mark\markbadong-portfolio
```

It does not change the Learning Library repository.

## Apply

Extract the patch, copy its contents into the portfolio repository, then run:

```powershell
cd "$HOME\markbadong-portfolio"
npm run check
git diff --check
git status --short
```

Review locally:

```powershell
npm run dev
```

Verify:

```text
http://localhost:5173/
http://localhost:5173/projects/learning-library
```

The Learning Library card must appear in Selected Work. The case study must link only to existing live routes:

```text
https://learn.markbadong.com
https://learn.markbadong.com/pricing/
https://learn.markbadong.com/support/
```

After review:

```powershell
git add -A
git commit -m "Add Learning Library case study and serverless skills"
git push origin main
```
