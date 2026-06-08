import fs from "node:fs";

export function agentHealth(): { lio: "READY" | "ERROR"; cala: "READY" | "ERROR"; konlin: "READY" | "ERROR"; hermes: "READY" | "ERROR" } {
  const lioFile = fs.existsSync("hermes/agents/lio-operator.md");
  const calaFile = fs.existsSync("hermes/agents/cala-screening.md");
  const konlinFile = fs.existsSync("hermes/agents/konlin-analyst.md");
  return {
    lio: lioFile ? "READY" : "ERROR",
    cala: calaFile ? "READY" : "ERROR",
    konlin: konlinFile ? "READY" : "ERROR",
    hermes: lioFile && calaFile && konlinFile ? "READY" : "ERROR"
  };
}
