import pino from "pino";

const loggerConfig: pino.LoggerOptions = {
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
};

if (process.env.NODE_ENV === "development") {
  loggerConfig.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  };
}

const logger = pino(loggerConfig);

export default logger;
