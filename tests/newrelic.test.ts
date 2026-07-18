const { spawnSync } = require("node:child_process");

/*
 * Guards that the New Relic agent can instrument a mongodb+srv:// connection inside a
 * transaction without crashing the process on startup. The failure mode: the agent reads
 * options.hosts[0].host, which is empty for mongodb+srv:// connections, and aborts when it
 * is missing.
 *
 * Jest's loader bypasses New Relic instrumentation, so the scenario is reproduced in a real
 * Node process with the agent preloaded. The probe exits 0 only if it did not crash.
 */
const probe = `
  const newrelic = require("newrelic");
  if (!newrelic.agent) throw new Error("New Relic agent is disabled"); // else: false pass
  const { MongoClient } = require("mongodb");
  newrelic.startBackgroundTransaction("srv-probe", async () => {
    // SRV client (empty options.hosts) inside a transaction reproduces the failure mode.
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
