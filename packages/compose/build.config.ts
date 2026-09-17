import { defineBuildConfig } from "obuild/config"

export default defineBuildConfig({
  entries: [
    {
      type: "transform",
      input: "./src",
      outDir: "./dist",
      dts: true,
      filter: (file: string) => !file.startsWith("_") && !file.endsWith(".d.ts"),
    },
  ],
})
