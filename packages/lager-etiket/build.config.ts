import { defineBuildConfig } from "obuild/config"

// Wie etiket: transform-Entry für die Library (Subpath-Exports entstehen aus
// den src/*.ts-Entries), CLI separat gebündelt.
export default defineBuildConfig({
  entries: [
    {
      type: "transform",
      input: "./src",
      outDir: "./dist",
      dts: true,
      // interne Module (Prefix _) und .d.ts nicht doppelt ausliefern
      filter: (file: string) => !file.startsWith("_") && !file.endsWith(".d.ts"),
    },
  ],
})
