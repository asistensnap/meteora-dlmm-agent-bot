export default {
  apps: [
    {
      name: "meteora-dlmm-agent-bot",
      script: "dist/index.js",
      autorestart: true,
      out_file: "./logs/out.log",
      error_file: "./logs/error.log"
    }
  ]
};
