export const EVILPANDA_STRATEGY_NAME = "EvilPanda Strategy";

export const evilPandaStrategy = {
  name: EVILPANDA_STRATEGY_NAME,
  timeframe: "15m",
  purpose: "One-sided SOL DLMM entries on filtered high-volume meme/volatile coins using Supertrend breakouts and indicator confluence exits.",
  coinSelection: {
    dexscreener: {
      minMarketCapUsd: 250_000,
      minVolume24hUsd: 1_000_000,
      sortBy: "AGE",
      ignoreWithoutPicture: true,
      fallbackAction: "Press/open profile button for manual verification when image/profile data is unclear."
    },
    gmgn: {
      minFeesUsd: 30,
      maxPhishingPercent: 30,
      maxBundlingPercent: 60,
      maxInsidersPercent: 10,
      maxTop10Percent: 30
    }
  },
  poolChoosing: {
    stage: "After coin selection, before entry.",
    purpose: "Choose the DLMM pool that keeps the position in range long enough to print fees while reducing out-of-range impairment loss.",
    rules: [
      "Prefer pools that match the planned one-sided SOL DLMM setup.",
      "Prefer 80/100/125 bin pools for EvilPanda entries.",
      "Use a wide downside range, generally -86% to -94%.",
      "For very new coins, especially under 12 hours old, prefer higher-fee 5%/10% pools when available.",
      "Avoid pools where liquidity/fee conditions make the position likely to go out of range too quickly.",
      "If no pool fits the range, fee, and bin-step requirements, do nothing."
    ],
    usedBy: {
      cala: "Hard filter and local scoring before candidates are sent to Konlin.",
      konlin: "Final validation of pool choice, range, fee tier, and strategy fit.",
      lio: "Workflow enforcement and Telegram reporting."
    }
  },
  entryCriteria: {
    chart: "Dexscreener",
    indicators: ["Supertrend"],
    timeframe: "15m",
    trigger: "Wait for price to break above Supertrend before opening a one-sided SOL DLMM position.",
    allowedDlmmShapes: ["SPOT", "BID_ASK"],
    preferredBinSteps: [80, 100, 125],
    rangePercent: {
      minDownside: -94,
      maxDownside: -86
    }
  },
  exitCriteria: {
    chart: "Dexscreener",
    indicators: ["Bollinger Bands", "MACD", "RSI"],
    rsi: {
      length: 2,
      upperLimit: 90
    },
    version: "EvilPanda Exit Strategy v2",
    logic: "Exit requires confluence of at least 2 indicators; do not exit from one indicator alone unless manual risk override is required.",
    validSignals: [
      "RSI(2) closes above 90 and price closes above Bollinger Band upper line at the same time.",
      "RSI(2) closes above 90 and MACD prints first green histogram at the same time."
    ],
    operatingContext: [
      "Exit logic depends on where the coin is in its trend and on the trader's plan/lifestyle.",
      "For EvilPanda one-sided SOL DLMM, the preferred path is: earn fees during the dump, then exit on bounce strength.",
      "If the position is already strongly profitable, taking the systematic exit is preferred over trying to catch the exact top.",
      "When multiple indicators fire together, treat it as a stronger exit signal.",
      "If price/risk invalidates the setup, cut the position even without a perfect profit exit."
    ],
    exitDecisionOrder: [
      "1. Check whether the original pool/coin thesis is still valid.",
      "2. Check whether the position is in range and still printing fees.",
      "3. Check RSI(2), Bollinger Band upper close, and MACD histogram.",
      "4. Exit when at least two configured exit indicators confirm.",
      "5. Log every close into Trade Log with pnlUsd, pnlPercent, exitReason, and source."
    ],
    emergencyExitReasons: [
      "Coin risk changes materially.",
      "Liquidity/volume collapses.",
      "Pool moves out of planned range and fee printing no longer justifies holding.",
      "Original entry was a mistake.",
      "Market conditions become dry or unsafe."
    ]
  },
  riskAndBehaviorRules: [
    "Prefer 15m chart to reduce over-monitoring and lower-trap timeframes.",
    "1m/5m charts are optional but have more traps.",
    "A dump is expected; the goal is to earn fees and benefit if token fees increase in value on bounce.",
    "Do not force trades in dry markets; wait until a coin passes all filters.",
    "Exit when the strategy gives an exit signal.",
    "If the setup is wrong, cut the position even at a loss.",
    "Do not over-position; divide portfolio into at least 6 positions.",
    "Increase size only after a clean profitable day without losses.",
    "Do not open new positions after 18:00 local time to avoid overnight babysitting.",
    "Do not revenge DLMM after a loss; pause until tomorrow.",
    "Focus on process and profitability, not emotional price targets."
  ],
  safety: {
    liveExecutionEnabled: false,
    requiresManualOrPaperMode: true,
    noProfitGuarantee: true
  }
} as const;

export type EvilPandaStrategy = typeof evilPandaStrategy;

export function evilPandaStrategyPrompt(): string {
  return [
    `${evilPandaStrategy.name}`,
    "",
    "Coin Selection:",
    "- Dexscreener: market cap >= $250k, 24h volume >= $1,000,000.",
    "- Sort coins by age.",
    "- Ignore coins without picture, or open/check profile manually when unclear.",
    "- GMGN: fees > 30, phishing < 30%, bundling < 60%, insiders < 10%, top 10 holders < 30%.",
    "",
    "DLMM Pool Choosing:",
    "- Use after coin selection and before entry.",
    "- Choose pools that keep the position in range long enough to print fees.",
    "- Prefer 80/100/125 bin pools.",
    "- General downside range: -86% to -94%.",
    "- For very new coins under 12h, prefer higher-fee 5%/10% pools when available.",
    "- Avoid pools likely to go out of range too quickly.",
    "- If no pool fits, do nothing.",
    "",
    "Entry Criteria:",
    "- Dexscreener chart with Supertrend.",
    "- Use 15m chart.",
    "- Wait for price to break above Supertrend.",
    "- Open one-sided SOL DLMM position.",
    "- Use SPOT or BID_ASK depending on pool behavior.",
    "- Prefer 80/100/125 bin pools.",
    "- General range: -86% to -94%.",
    "",
    "Exit Criteria:",
    "- Dexscreener chart with Bollinger Bands, MACD, RSI.",
    "- RSI setting: length 2, upper limit 90.",
    "- Exit needs at least 2-indicator confluence.",
    "- Signal A: RSI(2) close above 90 + price close above BB upper line.",
    "- Signal B: RSI(2) close above 90 + MACD first green histogram.",
    "- Multiple indicators firing together means a stronger exit.",
    "- Prefer systematic exit over trying to catch the exact top.",
    "- Emergency/manual cut is allowed if risk changes, volume/liquidity collapses, pool is out of useful range, or the entry was a mistake.",
    "- Every close must be logged to Trade Log with PnL and exit reason.",
    "",
    "Behavior Rules:",
    ...evilPandaStrategy.riskAndBehaviorRules.map((rule) => `- ${rule}`),
    "",
    "Safety:",
    "- Real execution remains disabled unless explicit future safety gates are added.",
    "- No private keys.",
    "- No guaranteed profit."
  ].join("\n");
}
