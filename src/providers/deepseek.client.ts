import { config } from "../config.js";

export class DeepSeekClient {
  describe(): string {
    return `${config.providers.deepseek.baseUrl} (${config.providers.deepseek.operatorModel}/${config.providers.deepseek.screeningModel})`;
  }
}
