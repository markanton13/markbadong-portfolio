# markbadong.com Portfolio

Evidence-led personal portfolio and case-study platform for **Mark Anton**, positioned around virtual assistance, operations, workflow automation, quality assurance, CRM implementation, documentation, and practical systems building.

**Live site:** `https://markbadong.com`
**Repository:** `C:\Users\Mark\markbadong-portfolio`
**Hosting:** Cloudflare Pages

---

## Current milestone

The portfolio has moved beyond its Phase 1 visual foundation into a real-proof platform with:

- responsive project cards using real product screenshots;
- evidence-focused project case studies;
- direct case-study routes with Cloudflare SPA fallback;
- reusable click-to-expand screenshot lightboxes;
- a public ATS General résumé;
- a portrait-led About section;
- desktop, tablet, and mobile QA workflows.

- ApplyLang real-proof integration detected locally with at least six optimized screenshots.
- The next task is final visual QA, commit/push, and Cloudflare live verification.

---

## Featured work

| Project | Public positioning | Evidence |
|---|---|---|
| PersonalVABot | Local-first VA operations platform | Windows desktop beta, Discord workflows, multi-client operations, tasks, attendance, billing, documents, backups, and diagnostics |
| MarkHQ Assistant | Production Discord operations system | Railway deployment, private workspaces, task pipelines, onboarding, requests, backups, and production health |
| ApplyLang | Complete Discord career operations system | Application records, frozen résumé snapshots, career sources, prompt packages, dashboards, follow-ups, and résumé vault |
| Childcare Culture & Co. | GoHighLevel client implementation in progress | Responsive page foundations; full case study remains deferred until final QA and written publication approval |
| LeaveFlow | Role-based full-stack web application | Employee, manager, and administrator workflows, balances, approvals, calendars, and responsive QA |

Supporting systems include the Enterprise Assessment System, LILO LIVE / FlowTrack Engine, AnimeDNA, and Habit Tracker.

---

## Public routes

```text
/
/projects/applylang
/projects/personalvabot
/projects/markhq
/projects/leaveflow
```

Cloudflare direct-route support is provided by:

```text
public/_redirects
```

```text
/* /index.html 200
```

---

## Public résumé

The broad public résumé is stored at:

```text
public/files/Mark-Anton-Badong-Resume.pdf
```

Public URL:

```text
https://markbadong.com/files/Mark-Anton-Badong-Resume.pdf
```

Specialized ATS variants remain private career assets and are not committed to the portfolio repository.

---

## Stack

- React 19
- Vite 8
- JavaScript / JSX
- Custom responsive CSS
- Oxlint
- Git and GitHub
- Cloudflare Pages
- Manual pathname-based case-study routing
- No React Router dependency

---

## Local development

```powershell
cd "C:\Users\Mark\markbadong-portfolio"
npm install
npm run dev
```

The local URL is normally:

```text
http://localhost:5173
```

---

## Validation

Run before every commit:

```powershell
npm run check
git diff --check
git status --short
```

Current package scripts:

```json
{
  "dev": "vite",
  "build": "vite build",
  "lint": "oxlint src",
  "preview": "vite preview",
  "check": "npm run lint && npm run build"
}
```

---

## Deployment

Cloudflare Pages settings:

```text
Build command: npm run build
Output directory: dist
```

Standard release flow:

```powershell
git status --short
git add .
git commit -m "Describe the portfolio update"
git push
```

After Cloudflare deploys, verify the homepage, résumé, and every direct case-study route. Refresh each route directly to confirm the SPA fallback works.

---

## Project structure

```text
markbadong-portfolio/
├── public/
│   ├── _redirects
│   ├── files/
│   │   └── Mark-Anton-Badong-Resume.pdf
│   └── images/
│       ├── about/
│       └── projects/
├── src/
│   ├── components/
│   ├── data/
│   ├── pages/
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── MARKBADONG_PORTFOLIO_PROJECT_BIBLE.md
├── README.md
└── package.json
```

---

## Proof and privacy rules

- Use real screenshots only when they support a specific claim.
- Remove tokens, credentials, private email addresses, account IDs, private file paths, and unrelated account clutter.
- Use fictional application, company, client, and user records for public demos.
- Do not publish client brand assets, copy, pricing, forms, booking data, or screenshots without written permission.
- Keep future product functionality explicitly labeled as planned until it is implemented and validated.
- Describe AI-assisted development transparently while preserving Mark's ownership of product vision, workflow design, requirements, QA, and release decisions.

---

## Documentation

The canonical internal source of truth is:

```text
MARKBADONG_PORTFOLIO_PROJECT_BIBLE.md
```

It records current implementation state, proof assets, routes, resume outputs, privacy rules, pause checkpoint, and the upcoming portfolio and ApplyLang web-app phases.
