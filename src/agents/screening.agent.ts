import { LocalScanner } from "../scanner/local-scanner.js";
import type { ScreeningResult } from "../types.js";

export class ScreeningAgent {
  constructor(private readonly scanner = new LocalScanner()) {}

  async run(): Promise<ScreeningResult> {
    return this.scanner.scan();
  }
}
