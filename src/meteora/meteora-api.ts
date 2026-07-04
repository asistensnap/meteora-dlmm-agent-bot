import axios from "axios";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import type { MeteoraRawPool } from "./types.js";

export class MeteoraApi {
  async fetchPools(): Promise<MeteoraRawPool[]> {
    const baseUrl = config.meteora.apiBaseUrl.replace(/\/$/, "");
    const endpoints = ["/pair/all", "/pools", "/dlmm/pools"];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get<unknown>(`${baseUrl}${endpoint}`, { timeout: 20_000 });
        const rows = unwrapRows(response.data);
        if (rows.length > 0) return rows;
      } catch (error) {
        logger.warn({ err: error, endpoint }, "Meteora API endpoint failed; trying next");
        continue;
      }
    }

    logger.warn({ baseUrl }, "All Meteora API endpoints failed or returned no pools");
    return [];
  }
}

function unwrapRows(data: unknown): MeteoraRawPool[] {
  if (Array.isArray(data)) return data as MeteoraRawPool[];
  if (isObject(data)) {
    for (const key of ["data", "pairs", "pools", "results"]) {
      const value = data[key];
      if (Array.isArray(value)) return value as MeteoraRawPool[];
    }
  }
  return [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
