import { config } from "./config.js";

export class ModelRouter {
  routingStatus(): string {
    return [
      `Lio ${config.agents.lio.username} -> DeepSeek (${config.agents.lio.model})`,
      `Cala ${config.agents.cala.username} -> DeepSeek (${config.agents.cala.model})`,
      `Konlin ${config.agents.konlin.username} -> Claude (${config.agents.konlin.model})`
    ].join("\n");
  }

  compactStatus(): string {
    return "Lio -> DeepSeek\nCala -> DeepSeek\nKonlin -> Claude";
  }
}
