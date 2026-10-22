import { execSync } from "node:child_process";
import { defineConfig } from "vite";

const buildContent = () => execSync("python scripts/build_content.py", { stdio: "inherit" });

export default defineConfig({
  base: "./", // relative paths work on both user.github.io and user.github.io/repo
  plugins: [
    {
      // Dev only: recompile content on every .toml save; the data.json change reloads the page.
      name: "content",
      configureServer(server) {
        buildContent();
        server.watcher.add("content");
        server.watcher.on("change", (file) => {
          if (!file.endsWith(".toml")) return;
          try {
            buildContent();
          } catch {} // error already printed; keep the server alive
        });
      },
    },
  ],
});
