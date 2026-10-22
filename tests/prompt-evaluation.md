# HTML-block prompt evaluation

The prompt has been rewritten and its host contract is covered by automated tests.
No model-to-model or prompt A/B experiment has been run: this workspace has no connected text-generation endpoint. Do not interpret structural checks as evidence that this is a proven best prompt.

For a real comparison, generate each brief with the old and new prompts on the same model and settings, three times each. Use initial frame sizes below, keep all outputs (including failures), and test them in `html-block-harness.html`. Test all five frame sizes, every control, keyboard/touch use, offline loading, Arabic direction and reduced-motion settings. Never score only the most attractive sample.

| Brief | Initial size | Required behavior |
|---|---|---|
| Arabic four-question quiz about basic science, show score and restart | 400 × 300 | Answer feedback, score, restart, RTL with readable numerals |
| Loan payment calculator with principal, annual interest and months | 480 × 280 | Correct zero/nonzero-interest results, invalid input feedback, labels |
| Weekly progress chart with clearly labeled sample data and selectable series | 520 × 300 | Series switching, responsive chart labels, no external dependency |
| Compact countdown with start, pause and reset | 320 × 200 | Pause/resume accuracy, validation, state transitions, reduced motion |
| Accessible three-tab study card | 360 × 240 | Keyboard navigation, visible focus, content switching, long-text handling |

Score each output 0–2 on: output contract, offline execution, behavior correctness, five-size fit, readability, brief fidelity, accessibility/RTL. Any executable error or nonworking core behavior is a failed output, regardless of its appearance. Compare success rate and median score, not one subjective total. Update the prompt only when failures reveal a recurring actionable weakness.


## Physics failure regression

The supplied model output packed five physics scenes into a 400×200 frame and declared a 220×110 minimum, reduced labels/buttons to 8–10px, and used arbitrary animation timing for some scientific claims. This is a concrete failure case, not an A/B experiment.

The revised prompt treats placeholder dimensions as advisory, defaults to AI-chosen usable sizing, and requests one focused experiment unless switching is explicit. New HTML placeholders start at up to 560×420. A Keep current dimensions option is available for deliberate size constraints. Use suggested size applies returned preferred dimensions even after a manual resize.

`examples/pendulum.html` is a hand-written reference block, not model output. Its 560×480 preferred / 320×420 minimum sizes prioritize legibility. It updates existing SVG nodes and uses the same ideal small-angle model for both motion and period. Model reference: [OpenStax, Pendulums](https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums). Tests verify 1m period, the quadruple-length/double-period relation, elapsed-time motion, pause and reset using a simulated DOM; no visual browser test or live model comparison is claimed.

Run `node tests/prompt-quality.test.cjs`. Paste the reference into the browser harness alongside future AI outputs and review actual appearance at its declared limits.
