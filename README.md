# markbadong.com Portfolio

Evidence-led personal portfolio and case-study platform for **Mark Anton**, positioned around virtual assistance, operations, workflow automation, quality assurance, CRM implementation, documentation, and practical systems building.

- **Live site:** https://markbadong.com
- **GitHub profile:** https://github.com/markanton13
- **Hosting:** Cloudflare Pages
- **Local repository:** `C:\Users\Mark\markbadong-portfolio`

---

## Current milestone

**Phase 4 complete — career-source activation, public GitHub proof, and portfolio integration.**

The portfolio now connects four flagship case studies to dedicated public proof repositories:

| Project | Case study | Public GitHub proof |
|---|---|---|
| PersonalVABot | https://markbadong.com/projects/personalvabot | https://github.com/markanton13/personalvabot |
| MarkHQ Assistant | https://markbadong.com/projects/markhq | https://github.com/markanton13/markhq-assistant-downloads |
| ApplyLang | https://markbadong.com/projects/applylang | https://github.com/markanton13/applylang |
| LeaveFlow | https://markbadong.com/projects/leaveflow | https://github.com/markanton13/leaveflow |

PersonalVABot also has a public Windows Desktop Beta prerelease:

https://github.com/markanton13/personalvabot/releases/tag/v0.3.12-beta

---

## Completed portfolio foundation

- Responsive homepage and project cards
- Four full flagship case studies
- Real screenshots and an embedded LeaveFlow demo
- Reusable accessible screenshot lightbox
- Public ATS General résumé
- Portrait-led About section
- Direct route HTML entries
- Route-specific SEO and social metadata
- JSON-LD structured data
- Sitemap and static 404
- Route-level JavaScript splitting
- Image dimension, loading, and caching improvements
- Desktop, tablet, mobile, keyboard, and direct-route QA workflows
- Public/private GitHub proof architecture

---

## Public routes

```text
/
/projects/personalvabot
/projects/markhq
/projects/applylang
/projects/leaveflow
/files/Mark-Anton-Badong-Resume.pdf
```

---

## Featured work

### PersonalVABot

Local-first Windows operations platform connecting multi-client work, tasks, attendance, billing, documents, automation, backups, diagnostics, and Discord workflows.

### MarkHQ Assistant

Railway-hosted Discord operations system for task pipelines, private workspaces, onboarding, requests, documentation, backups, and production health.

### ApplyLang

Complete Discord career operations system for reusable career sources, frozen application snapshots, truth-safe prompt packages, dashboards, follow-ups, and résumé version control.

### LeaveFlow

Role-based React, Express, and MySQL leave-management application with employee, manager, and administrator experiences.

### Childcare Culture & Co.

GoHighLevel client implementation in progress. The full public case study remains deferred until final QA and written publication approval.

---

## Stack

- React 19
- Vite 8
- JavaScript / JSX
- Custom responsive CSS
- Oxlint
- Git and GitHub
- Cloudflare Pages
- Multi-page route entries with shared React components

---

## Local development

```powershell
cd "C:\Users\Mark\markbadong-portfolio"
npm install
npm run dev
```

Production-style preview:

```powershell
npm run check
npm run preview
```

---

## Validation

Run before every commit:

```powershell
npm run check
git diff --check
git status --short
```

After deployment, verify:

- homepage;
- all four direct case-study routes;
- résumé link;
- every GitHub proof link;
- PersonalVABot release;
- LeaveFlow demo;
- invalid route returns HTTP 404.

---

## Proof and privacy rules

- Use real screenshots only when they support a specific claim.
- Remove credentials, private IDs, private file paths, and unrelated account clutter.
- Use fictional or controlled data for public demos.
- Keep production source, databases, backups, logs, and credentials private where appropriate.
- Do not publish client materials without written permission.
- Label planned functionality as planned.
- Describe AI-assisted development transparently while preserving Mark's ownership of product vision, workflow design, requirements, QA, and release decisions.

---

## Documentation

The canonical source of truth is:

```text
MARKBADONG_PORTFOLIO_PROJECT_BIBLE.md
```

It records the Phase 4 closeout, public/private repository map, routes, career-source rules, proof standards, deployment safety, and next-phase roadmap.
