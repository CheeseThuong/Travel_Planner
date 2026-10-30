# Travel Plan · Sổ hành trình redesign (UI-only)

**Implementation format:** replacement overlay for the existing `D:\Projects\travel_plan` Next.js project. This is **not** a new standalone application. The connected Travel Plan MCP allows source inspection but not repository writes or command execution, so this bundle must be applied locally. No claims of working deployment or completed itinerary algorithm are made.

## Design concept
A Vietnamese travel journal with two illustrated destination postcards, editorial asymmetric layout, ink-green `#275241`, vermilion `#BD5941`, cream paper `#F5F0E4` and quiet border-led components. Existing locally bundled Be Vietnam Pro continues as body font; display uses a serif with Vietnamese-capable Windows fallback. No external fonts, image-CDN, new npm dependencies, hover-only interactions or pervasive animations. Existing opt-in 3D scenes stay available; scroll-world is deliberately not turned into a billable video experience.

## Apply safely in Windows PowerShell

Extract this ZIP into any separate folder, e.g. `D:\Projects\travel-plan-redesign`. **Do not** extract over the application repository.

```powershell
cd D:\Projects\travel_plan
# Confirm your project state. The tool refuses to overwrite dirty UI files.
git status --short

cd D:\Projects\travel-plan-redesign
python tools\apply-redesign.py D:\Projects\travel_plan --dry-run
python tools\apply-redesign.py D:\Projects\travel_plan

cd D:\Projects\travel_plan
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run dev
```

Open http://127.0.0.1:3000/ for the local demo. For a first install only, run `npm.cmd ci --strict-peer-deps` before the checks. If Chrome dev tools report `bis_skin_checked` / `bis_register`, test in Chrome Guest or a clean profile without extensions before making a React hydration change.

## Scope and limitations

- Replaces the home page, destination landing, catalog, global visual style and shared layout.
- Reworks the wizard's **markup only**, retaining its state, existing validation, calculations and submit handlers. The import form receives explanatory shortlink guidance, not unsafe URL fetching.
- The script checks the expected workspace, verifies that selected UI files have no uncommitted changes, creates a timestamped backup, then writes the overlay. It will not edit `src/domain`, `src/adapters`, Supabase or APIs.
- Existing planner engine generation, Google Maps shortlink expansion, routing reliability, persistence and sharing are **not delivered** by this package. They require separate architecture/acceptance work.
- Adds `tests/demo/redesign.spec.mjs` as a regression test for mobile overflow and clean-browser hydration. All Next.js/Playwright tests listed above are **NOT RUN** in the connected Windows workspace; run them and fix any failures before considering the change accepted.
- Browser screenshot + accessibility + mobile checks are required for sign-off. The original repo's `AGENTS.md` phase/gate rules continue to apply.

## Roll back

Copy the files back from the printed `D:\Projects\travel_plan.redesign-backup\<timestamp>\src\` tree, or selectively restore just the UI files using Git **only if** those files were clean when you applied the bundle. Never use `git reset --hard`, as other workspace changes may exist.
