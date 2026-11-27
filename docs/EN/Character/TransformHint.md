# Transformation Hint

Use `<<transform-hint "horse" "softbrown">>` outside a choice link to display a transformation label.

```twine
<<link "Continue" "Next Passage">>
  <<transform "horse" 5>>
<</link>>
<<transform-hint "horse" "softbrown">>
```

The first argument is a framework translation key. The second is a CSS colour class supplied by your mod, such as `blue`, `orange`, `gold`, or `softbrown`; the framework does not impose a colour.

> [!NOTE]
> This macro only renders a `| <label>` hint, matching vanilla animal-transformation hints. It does **not** change transformation progress (call `<<transform>>` in your link or action), and it outputs nothing when numerical hints are hidden by `blindStatsEnabled`.
