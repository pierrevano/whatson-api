const { spawnSync } = require("node:child_process");

/*
 * Regression test + upgrade signal for the crash that pins us to newrelic@14.1.2:
 * newrelic >= 14.2.0 reads options.hosts[0].host, which is empty for
 * mongodb+srv:// connections (ours), and crashes the process on startup.
 *
 * jest's loader bypasses New Relic instrumentation, so we reproduce it in a real
 * Node process with the agent preloaded. The probe exits 0 only if it did NOT
 * crash — so after bumping newrelic, green = safe to upgrade, red = keep the pin.
 */
const probe = `
  const newrelic = require("newrelic");
  if (!newrelic.agent) throw new Error("New Relic agent is disabled"); // else: false pass
  const { MongoClient } = require("mongodb");
  newrelic.startBackgroundTransaction("srv-probe", async () => {
    // SRV client (empty options.hosts) used in a transaction = the crash trigger.
    new MongoClient("mongodb+srv://user:pass@cluster.example.mongodb.net/db")
      .db("probe")
      .collection("probe");
    newrelic.getTransaction().end();
    await new Promise((r) => newrelic.shutdown({ collectPendingData: false }, r));
    process.exit(0);
  });
`;

test("New Relic instruments a mongodb+srv:// connection without crashing", () => {
  const result = spawnSync(process.execPath, ["-r", "newrelic", "-e", probe], {
    env: {
      ...process.env,
      NEW_RELIC_APP_NAME: "whatson-api-test",
      NEW_RELIC_LICENSE_KEY: "0".repeat(40), // dummy: we only instrument, never send data
      NEW_RELIC_LOG: "stdout", // keep newrelic_agent.log out of the repo
    },
  });

  expect(result.status).toBe(0);
});
