const { spawn, execSync } = require("child_process");

const port = process.env.PORT || 3000;

// Run seed before starting the server
try {
  console.log("Running database seed...");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
  console.log("Seed complete.");
} catch (e) {
  console.error("Seed failed (continuing anyway):", e.message);
}

const child = spawn("npx", ["next", "start", "-p", String(port)], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code);
});
