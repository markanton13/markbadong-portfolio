# MARKBADONG.COM PORTFOLIO — PROJECT BIBLE

**Canonical source of truth for the MARK PORTFOLIO DOMAIN project**
**Owner:** Mark Anton
**Primary domain:** `markbadong.com`
**Portfolio repository:** `C:\Users\Mark\markbadong-portfolio`
**Hosting:** Cloudflare Pages
**Last updated:** July 19, 2026
**Current milestone:** **Phase 4 complete — career system activated, flagship GitHub proof integrated, and public proof ecosystem connected**

---

## 1. Purpose

This Bible preserves the current portfolio architecture, brand, routes, project status, proof assets, repository boundaries, résumé system, privacy rules, deployment workflow, completed phases, and next actions.

Read this file first when beginning a new MARK PORTFOLIO DOMAIN thread.

Update it whenever:

- a project status changes;
- a case study or route changes;
- a public repository or release changes;
- the public résumé changes;
- a client grants or withdraws publication permission;
- a major QA, deployment, or architecture milestone is completed.

---

## 2. Portfolio positioning

The portfolio presents Mark as:

> **An operations-focused systems builder who combines virtual assistance, workflow design, automation, QA, documentation, client implementation, web development, and product thinking.**

The strongest public message is:

> **Mark does not only use tools. He understands the work, designs the workflow, builds practical systems, tests real scenarios, documents decisions, and turns functioning products into clear proof.**

### Evidence model

> **Skill → real project → screenshot or demo → problem solved → workflow shown → proof point → public technical evidence**

### Best-fit directions

- Virtual Assistance
- Operations and workflow coordination
- Automation and systems support
- Quality assurance and product testing
- CRM and GoHighLevel implementation
- Documentation, training, and SOP work
- Junior web and internal-tools development

---

## 3. Public identity and brand

- **Public name:** Mark Anton
- **Domain:** `markbadong.com`
- **GitHub:** `https://github.com/markanton13`
- **Primary portfolio email:** `markantonbadong@gmail.com`
- **Alternate portfolio email:** `markantonbadong13@gmail.com`

### Visual direction

- warm cream background;
- dark ink text;
- strong blue accent;
- restrained gold accent;
- rounded editorial cards;
- Manrope headings;
- DM Sans body text;
- spacious layouts;
- real proof instead of decorative placeholders.

### Core tokens

```css
--paper: #f4f0e8;
--paper-deep: #e9e2d5;
--ink: #171714;
--muted: #69665f;
--blue: #3157d5;
--blue-dark: #203a91;
--gold: #8b641f;
--white: #fffdf8;
```

---

## 4. Technical architecture

### Stack

- React 19
- Vite 8
- JavaScript / JSX
- custom responsive CSS
- Oxlint
- Cloudflare Pages
- route-specific HTML entries
- shared React case-study components
- no React Router dependency

### Public routes

```text
/
/projects/personalvabot
/projects/markhq
/projects/applylang
/projects/leaveflow
/files/Mark-Anton-Badong-Resume.pdf
```

### Build and metadata model

The portfolio uses:

- route-specific titles and descriptions;
- canonical URLs;
- Open Graph and Twitter metadata;
- JSON-LD structured data;
- social-sharing images;
- sitemap and robots configuration;
- a static custom 404;
- route-level JavaScript splitting;
- intrinsic image dimensions and loading hints.

### Architecture rule

Do not add React Router unless future complexity clearly requires it. The current Vite entry and pathname model is sufficient.

---

## 5. Homepage structure

1. Header
2. Hero
3. Trust strip
4. Selected Work
5. Supporting Projects
6. Capabilities
7. How I Work
8. About Mark
9. Contact
10. Footer

### Current featured order

1. PersonalVABot
2. MarkHQ Assistant
3. ApplyLang
4. Childcare Culture & Co.
5. LeaveFlow

### Supporting projects

- Enterprise Assessment System
- LILO LIVE Dashboard / FlowTrack Engine
- AnimeDNA
- Habit Tracker

---

## 6. Flagship public-proof architecture

### Canonical public/private map

| Product | Private source/runtime | Public proof |
|---|---|---|
| PersonalVABot | `markanton13/personalvabot-source` | `markanton13/personalvabot` |
| MarkHQ Assistant | Private Railway production source; local path `C:\Users\Mark\markhq-assistant` | `markanton13/markhq-assistant-downloads` |
| ApplyLang | `markanton13/applylang-bot` | `markanton13/applylang` |
| LeaveFlow | `markanton13/leaveflow-source` | `markanton13/leaveflow` |

### Public proof URLs

```text
https://github.com/markanton13/personalvabot
https://github.com/markanton13/markhq-assistant-downloads
https://github.com/markanton13/applylang
https://github.com/markanton13/leaveflow
```

### PersonalVABot public release

```text
https://github.com/markanton13/personalvabot/releases/tag/v0.3.12-beta
```

### Boundary rule

Public proof repositories may contain:

- recruiter-facing README files;
- sanitized screenshots and demos;
- architecture and validation documentation;
- privacy and security policies;
- release assets explicitly approved for public distribution.

They must not contain:

- private application source unless intentionally open-sourced;
- `.env` files;
- credentials;
- production databases;
- backups;
- private logs;
- real résumé or career-profile records;
- private client, employee, or workspace data;
- Railway variables;
- internal recovery secrets.

---

## 7. PersonalVABot

### Public route

```text
/projects/personalvabot
```

### Positioning

**PersonalVABot — Local-First VA Operations Platform**

A Windows desktop and Discord-connected system for:

- multi-client work;
- projects and task lifecycles;
- attendance and DTR;
- billing agreements and earnings references;
- documents and templates;
- recurring work and reminders;
- backups, exports, health, and diagnostics.

### Public status

- Windows Desktop Beta
- version `0.3.12`
- installer validated
- local-first SQLite data
- 72 built-in templates
- public prerelease and SHA-256 checksum

### Mark's role

- creator;
- product director;
- workflow designer;
- QA owner;
- release and packaging owner.

### Product decisions

- archive before permanent deletion;
- attendance remains optional;
- billing logic must remain explainable;
- suggestions never silently create work;
- local data must survive normal upgrades;
- Discord remains a companion interface.

---

## 8. MarkHQ Assistant

### Public route

```text
/projects/markhq
```

### Positioning

**MarkHQ Assistant — Production Discord Operations System**

A Railway-hosted workspace system for:

- task pipelines and timers;
- private workspaces;
- onboarding and request approvals;
- documentation sync;
- recurring work and reminders;
- persistent SQLite data;
- automated backups;
- runtime health and deployment readiness.

### Public status

- live Railway production deployment;
- persistent storage;
- multi-workspace operations;
- automated backups;
- health and deployment-preflight commands.

### Mark's role

- creator;
- product director;
- workflow architect;
- QA and release-validation owner;
- deployment and documentation owner.

### Product decisions

- private workspaces require approval;
- system guides remain separate from personal notes;
- archive precedes permanent deletion;
- production health must be visible;
- workspace rename preserves records;
- startup and synchronization behavior must be traceable.

---

## 9. ApplyLang

### Public route

```text
/projects/applylang
```

### Positioning

**ApplyLang — Complete Discord Career Operations System**

Release screenshots may retain the earlier internal **ApplyHQ** label. ApplyLang is the official public product identity and planned standalone-platform name.

### Complete functionality

- private Discord career workspaces;
- reusable Master Résumé and Master Career Profile;
- version and integrity references;
- frozen application source snapshots;
- unique application IDs;
- company, role, platform, date, responsibilities, status, notes, and follow-ups;
- ATS, tailoring, cover-letter, interview, outreach, negotiation, and full-pack prompt workflows;
- saved Markdown prompt files;
- role-profile detection and confidence reporting;
- dashboards, conversion tracking, platform metrics, and follow-up aging;
- résumé vault;
- no required paid bot-managed AI API.

### Truth rule

The résumé remains authoritative for formal employment history. The Master Career Profile may add verified supporting detail. Neither the system nor generated prompts may invent employers, dates, tools, credentials, metrics, or completed experience.

### Future direction

The standalone RBAC web application remains **planned**, not implemented.

---

## 10. LeaveFlow

### Public route

```text
/projects/leaveflow
```

### Positioning

**LeaveFlow — Role-Based Full-Stack Leave Management System**

A React, Express, and MySQL application connecting:

- employee requests and cancellation;
- balances and request history;
- manager approval and rejection;
- employee and team calendars;
- administrator user, role, activation, and manager assignment;
- responsive mobile behavior.

### Stack

- React
- Vite
- Tailwind CSS
- Axios
- FullCalendar
- Node.js
- Express
- MySQL
- JWT
- layered controller/service/repository architecture

### Mark's role

- system design;
- frontend and backend development;
- database relationships;
- role and approval workflows;
- business-rule implementation;
- functional and responsive QA.

---

## 11. Childcare Culture & Co.

### Current public treatment

```text
Client project · In progress
```

A full case study remains deferred.

### Publish only after

1. final design polish;
2. remaining pages are complete;
3. forms and booking flows are validated;
4. desktop, tablet, and mobile QA pass;
5. written client or TL approval is saved;
6. sensitive GoHighLevel and customer data are removed.

### Never publish

- lead data;
- form submissions;
- contact details;
- calendar bookings;
- account IDs;
- credentials;
- payment information;
- private client conversations.

---

## 12. Résumé and career-source system

### Canonical v2 outputs

1. Master Resume
2. ATS General Resume
3. VA / Operations Resume
4. QA / Product Testing Resume
5. CRM / GoHighLevel Resume
6. Junior Web / Automation Resume

### Public résumé

```text
public/files/Mark-Anton-Badong-Resume.pdf
https://markbadong.com/files/Mark-Anton-Badong-Resume.pdf
```

The public file is ATS General Resume v2. Editable masters, targeted variants, and application-specific outputs remain private.

### ApplyLang canonical pair

- Master Resume v2
- Master Career Profile v2

### Phase 4A completion

Phase 4A is complete because:

- both canonical sources were registered;
- source history and downloads were verified;
- a real application was captured without a custom résumé override;
- the application used the active Master Résumé;
- the prompt package contained one frozen résumé snapshot and one frozen Master Career Profile snapshot;
- the workflow persisted correctly.

### Wipro date rule

Until the official relieving date:

```text
Process Trainer | Wipro — 2023–Present
```

After August 14, 2026:

```text
Process Trainer | Wipro — 2023–Aug 2026
```

Update all résumé sources, the Master Career Profile, ApplyLang canonical sources, and the public PDF together.

---

## 13. Accessibility, SEO, and performance baseline

### Accessibility

- skip link;
- semantic page structure;
- keyboard-visible focus;
- screenshot-dialog focus containment;
- Escape and outside-click dismissal;
- focus return;
- accessible mobile menu labels and controls;
- demo text alternative;
- meaningful alt text and captions.

### SEO

- route-specific HTML and metadata;
- canonical URLs;
- indexable case-study pages;
- Open Graph and Twitter cards;
- JSON-LD;
- sitemap;
- robots configuration;
- real static 404.

### Performance

- route-specific JavaScript chunks;
- lazy case-study fallback loading;
- lazy project images below the fold;
- eager high-priority case-study hero images;
- image dimensions and asynchronous decoding;
- document-level font preconnect;
- immutable caching for hashed build assets.

---

## 14. Phase history

### Phase 1 — Foundation

**Complete**

- React/Vite foundation;
- brand and layout system;
- initial positioning;
- Cloudflare Pages and `markbadong.com`;
- responsive homepage structure.

### Phase 2 — Real proof

**Complete**

- four flagship case studies;
- real screenshots and LeaveFlow demo;
- reusable screenshot lightbox;
- portrait-led About section;
- six-résumé system;
- public ATS résumé;
- accurate project positioning.

### Phase 3 — Accessibility, SEO, and performance

**Complete**

- route integrity and static 404;
- accessibility and keyboard improvements;
- route-specific SEO and social metadata;
- structured data and sitemap;
- route splitting and image-performance work.

### Phase 4A — Résumé and ApplyLang activation

**Complete**

- résumé system v2 synchronized;
- public résumé replaced at stable URL;
- Master Resume v2 and Master Career Profile v2 registered;
- real application and frozen-source workflow validated.

### Phase 4B — GitHub proof upgrade and integration

**Complete**

- PersonalVABot private/public split and public Windows prerelease;
- MarkHQ public proof repository;
- ApplyLang private/public split;
- LeaveFlow private/public split;
- four GitHub proof links integrated into portfolio case studies and project cards;
- GitHub profile rewritten around current positioning and projects;
- repository metadata and homepage links standardized;
- final public-link and route QA completed before merge.

---

## 15. GitHub profile standard

The GitHub profile README should lead with:

1. portfolio positioning;
2. `markbadong.com`;
3. four flagship systems;
4. practical capabilities;
5. documentation-first and truth-safe working style.

Recommended pinned repositories:

1. `markbadong-portfolio`
2. `personalvabot`
3. `markhq-assistant-downloads`
4. `applylang`
5. `leaveflow`
6. `GAS-Assessment-Dashboard`

Pinning is a manual GitHub profile action.

---

## 16. Git and deployment safety

### Before work

```powershell
cd "C:\Users\Mark\markbadong-portfolio"
git status --short
```

### Branch rule

Use a dedicated branch for portfolio closeout changes:

```powershell
git switch main
git pull --ff-only origin main
git switch -c phase4b-closeout
```

### Validation

```powershell
npm run check
git diff --check
git status --short
npm run preview
```

### Safety rules

1. never auto-push;
2. never force-push;
3. keep `_patch-backups/` ignored;
4. preserve route-specific HTML entries and the static 404;
5. do not add unnecessary dependencies;
6. never overwrite newer local changes blindly;
7. visually review desktop, tablet, and mobile before commit;
8. verify every external proof link;
9. confirm invalid production routes still return 404;
10. merge only after local and live QA.

---

## 17. Phase 4 final QA

### Portfolio

- homepage project-card links;
- four case-study GitHub buttons;
- PersonalVABot release button;
- LeaveFlow demo anchor;
- résumé download;
- contact and email links;
- direct route refresh;
- mobile wrapping of action links;
- screenshot lightboxes;
- invalid route behavior.

### GitHub

- four repositories are public;
- private source repositories remain private;
- README screenshots render;
- internal documentation links work;
- PersonalVABot release contains only approved assets;
- no credentials, databases, backups, logs, or personal career records are exposed;
- repository descriptions, topics, and homepage URLs are current;
- profile README displays correctly.

### Cloudflare

```text
https://markbadong.com
https://markbadong.com/projects/personalvabot
https://markbadong.com/projects/markhq
https://markbadong.com/projects/applylang
https://markbadong.com/projects/leaveflow
https://markbadong.com/files/Mark-Anton-Badong-Resume.pdf
```

---

## 18. Next phase

### Phase 5 — Career launch and continuous proof

Primary objective:

> Use the completed portfolio and ApplyLang system in real applications, then improve both only from verified evidence.

Planned work:

- begin targeted application campaigns;
- use the appropriate résumé variant per role;
- track applications and follow-ups in ApplyLang;
- maintain Master Career Profile accuracy;
- update the Wipro date after August 14, 2026;
- add verified testimonials or outcomes when available;
- complete Childcare Culture & Co. and publish only after written approval;
- expand supporting-project proof selectively;
- review portfolio conversion points and recruiter feedback.

### Deferred product track

ApplyLang standalone web application remains a separate product-development phase. It should begin only with a written product specification, role model, source-of-truth rules, and architecture plan.

---

## 19. Exact restart message

Use this at the beginning of the next portfolio thread:

> Continue MARKBADONG.COM after the Phase 4 closeout. Read `MARKBADONG_PORTFOLIO_PROJECT_BIBLE.md` first. Phase 1 foundation, Phase 2 real proof, Phase 3 accessibility/SEO/performance, Phase 4A career-source activation, and Phase 4B GitHub proof integration are complete. Begin Phase 5 career launch and continuous proof, while keeping Childcare Culture & Co. deferred until final QA and written publication permission.

---

---

---

## Public contact standard

The public portfolio exposes the following verified professional contact details:

- **Primary email:** `markantonbadong@gmail.com`
- **Alternate email:** `markantonbadong13@gmail.com`
- **LinkedIn:** `https://linkedin.com/in/markanton13`
- **GitHub:** `https://github.com/markanton13`
- **Telegram:** `https://t.me/markanton13`
- **WhatsApp / Telegram / Discord handle:** `@markanton13`
- **Résumé:** `https://markbadong.com/files/Mark-Anton-Badong-Resume.pdf`
- **Location:** Quezon City, Philippines
- **Availability:** Open to remote opportunities

Both email addresses remain visible. Each address provides a browser-based Gmail compose action and a Copy address control with a manual-copy fallback. Footer and case-study Email CTAs route visitors to the full Contact section instead of depending on an operating-system `mailto:` handler.

Do not publish a phone number, private street address, or account-specific internal identifiers.

### GoHighLevel contact-layer status

TL Anj confirmed that the GoHighLevel agency is currently closed/suspended because it is not yet being used. Therefore:

- no GoHighLevel contact form is active on the portfolio;
- no GoHighLevel booking calendar is active;
- no public portfolio CTA should depend on the suspended agency;
- the GHL contact layer may be reconsidered only after the account is reactivated and the form routing, calendar, confirmation state, privacy behavior, and spam protection are tested end to end.

### Messaging-link rule

Display `@markanton13` for WhatsApp, Telegram, and Discord. Telegram may use its verified public handle URL. Do not create a WhatsApp or Discord direct-profile URL until a working public URL is confirmed.

---

## End of Bible
