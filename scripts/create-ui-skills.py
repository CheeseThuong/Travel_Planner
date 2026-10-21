"""Install the two newly requested authored skills; no unrelated config changes."""
from pathlib import Path

skills_root = Path.home() / '.codex' / 'skills'
skills = {
 'threejs': '''---
name: threejs
description: Build or review optional Three.js scenes in a web UI, including lazy loading, rendering lifecycle, GPU cleanup and accessible fallbacks. Use for actual Three.js/WebGL tasks, not SVG-only artwork or unrelated Figma shaders.
---

# Three.js UI scenes

For an existing product, preserve its framework and core non-canvas interactions. Treat decorative WebGL as an optional enhancement with a static fallback of the same dimensions. Keep text/navigation in the DOM. Load Three.js only when the scene is needed; an explicit activation control is useful when bundle/GPU cost matters.

In React, create the renderer in an effect and dispose resources on stop/unmount, including async-import cancellation. Resize using the container dimensions, not just window width. Bound devicePixelRatio; simple opaque geometry and modest segment counts are usually enough for an illustration.

Track ownership of every geometry/material/texture. Stop the animation loop, disconnect observers/listeners, dispose owned resources and renderer; remove the owned canvas. Handle unsupported WebGL and context loss by restoring the static fallback. Do not swallow unrelated exceptions as a generic graphics failure.

Pause work while the page or scene is hidden. Reduced-motion must prevent automatic rotation/parallax, and preference changes should stop running loops. Do not request high-performance GPU by default for decorative UI.

Verify observable lifecycle: activate/stop/restart, preference changes, no-WebGL fallback, no-JS content, resize, mobile overflow and console errors. Measure the real renderer on a known browser/GPU; label software-rendered results as such.

Primary references (read for the relevant task):
- https://threejs.org/manual/pages/cleanup.html
- https://threejs.org/manual/pages/how-to-dispose-of-objects.html
- https://threejs.org/docs/pages/WebGLRenderer
''',
 'motion-design': '''---
name: motion-design
description: Design and implement accessible interface motion with Motion for React, coordinated with existing GSAP or Three.js layers when present. Use for real UI transitions, feedback and reduced-motion behavior, not video generation or Figma-only timeline edits.
---

# Interface motion design

Tie movement to a user-visible purpose: orientation, hierarchy or action feedback. Preserve readable SSR content and native keyboard/focus behavior. Never hide critical content behind a client-only entrance animation or delay navigation until an animation ends.

Use Motion for small interaction/state transitions; prefer transform/opacity over layout properties. Give each engine/property one owner when Motion, GSAP and Three.js coexist. Avoid applying CSS transition-all to a transform also driven by an animation engine.

Respect reduced motion through MotionConfig reducedMotion=user and useReducedMotion. Replace large travel/parallax/rotation with immediate state changes or gentle opacity as appropriate. Account for the first server render and later OS preference changes. A CSS media rule alone does not stop a JavaScript canvas loop.

Keep bundle boundaries deliberate: server content stays server-rendered, and client wrappers/feature bundles stay small. Do not import premium features or sign up for external services unless requested. Motion library MIT and any separately licensed assets/services are different things.

Validate hover/focus/tap equivalents, reduced-motion, touch viewport, no-JS fallback and interruption/unmount. Record timing, CLS and real performance conditions rather than treating an attractive screenshot as performance evidence.

Primary references:
- https://motion.dev/docs/react-accessibility
- https://motion.dev/docs/react-use-reduced-motion
- https://motion.dev/docs/react-lazy-motion
'''
}
for name, content in skills.items():
    target = skills_root / name / 'SKILL.md'
    assert target.is_file(), f'Initialize the requested new skill first: {target}'
    assert 'TODO' in target.read_text(encoding='utf-8'), f'Refuse to overwrite an existing completed skill: {target}'
    target.write_text(content, encoding='utf-8')
    print(f'Completed newly requested authored skill: {target}')
