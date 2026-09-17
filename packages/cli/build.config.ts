import { defineBuildConfig } from "obuild/config"

// CLI als eigenes Bundle: citty + consola werden eingebettet (zero runtime
// dependencies, etiket-Konvention).
export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: "./src/cli.ts",
      outDir: "./dist",
      dts: false,
    },
  ],
})
