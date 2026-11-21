import { next } from "@moonwitness/eslint-config/next";

export default [
  ...next,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "Use @moonwitness/contracts/sdk (moonwitnessSdk / requestApiJson / requestApiResponse) instead of direct fetch().",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Use NativeSelect or Select from @moonwitness/ui instead of raw <select>.",
        },
        {
          selector: "JSXOpeningElement[name.name='button']",
          message:
            "Use Button, ZineButton, or DnaButton from @moonwitness/ui instead of raw <button>.",
        },
        {
          selector: "JSXOpeningElement[name.name='input']",
          message: "Use Input or Checkbox from @moonwitness/ui instead of raw <input>.",
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message: "Use Textarea from @moonwitness/ui instead of raw <textarea>.",
        },
        {
          selector: "JSXOpeningElement[name.name='svg']",
          message:
            "Use @moonwitness/ui/icons or @moonwitness/ui/imperium primitives instead of raw <svg>.",
        },
        {
          selector: "JSXAttribute[name.name='role'][value.value='dialog']",
          message: 'Use Dialog, Sheet, or Popover from @moonwitness/ui instead of role="dialog".',
        },
        {
          selector: "JSXAttribute[name.name='aria-modal']",
          message: "Use Dialog or Sheet from @moonwitness/ui instead of raw aria-modal.",
        },
        {
          selector:
            "Literal[value=/\\b(btn-zine|zine-card|btn-luxe-|btn-chamfer)/], TemplateElement[value.raw=/\\b(btn-zine|zine-card|btn-luxe-|btn-chamfer)/]",
          message:
            "Use ZineButton, ZineCard, ZineCardRough, or DnaButton instead of legacy skin classes.",
        },
        {
          selector: "Literal[value=/^\\/art\\/.*\\.(png|webp)$/]",
          message:
            "Use @moonwitness/assets (artSrc, artPlateSrc, ZineImage, SkinArtworkFrame) instead of raw /art/ file literals.",
        },
      ],
    },
  },
  {
    files: ["src/app/api/**/*.ts", "src/lib/ecosystem-probe.ts"],
    rules: {
      "no-restricted-globals": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      ".vinext/**",
      ".cloudflare/**",
      "out/**",
      "playwright-report/**",
      "test-results/**",
      "pacts/**",
      "next-env.d.ts",
      "postcss.config.mjs",
    ],
  },
];
