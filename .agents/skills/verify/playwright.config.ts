// Run through scripts/drive.sh, which links apps/web/node_modules here and runs from apps/web.
const evidence = process.env.VERIFY_EVIDENCE ?? "../../.verify/evidence/adhoc";

export default {
  outputDir: `${evidence}/artifacts`,
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/u },
    { dependencies: ["setup"], name: "drive", testIgnore: /.*\.setup\.ts/u },
  ],
  reporter: [["list"], ["html", { open: "never", outputFolder: `${evidence}/report` }]],
  testDir: "./drives",
  use: {
    baseURL: "http://localhost:3001",
    screenshot: "on",
    trace: "on",
    video: "retain-on-failure",
  },
  workers: 1,
};
