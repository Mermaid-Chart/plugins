/* eslint-disable no-console */
import { browser } from '$app/environment';
import { env as publicEnv } from '$env/dynamic/public';
import pino, { type LoggerOptions } from 'pino';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';
type LogLevelException = { name: string; level: LogLevel };
type LogLevelExceptionArray = LogLevelException[];

const logLevel = publicEnv.PUBLIC_LOG_LEVEL as LogLevel;
const exceptionsStr = publicEnv.PUBLIC_LEVEL_EXCEPTIONS;

let urlOverride;
if (browser) {
  urlOverride = new URLSearchParams(window.location.search).get('log-level') as LogLevel;
}
const logLevelKey = urlOverride || logLevel || 'info';

function logMethod(args: string[], method: unknown) {
  let newArgs;
  if (args.length > 1) {
    newArgs = ['%s', args.join(' ')];
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  method.apply(this, newArgs ?? args);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const getLoggerForLevel = (level: LogLevel) => {
  let logger;
  if (import.meta.env?.DEV) {
    logger = {
      trace: console.trace,
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error
    };

    switch (level) {
      case 'error': {
        {
          logger.warn = noop;
          logger.info = noop;
          logger.debug = noop;
          logger.trace = noop;
        }
        break;
      }
      case 'warn': {
        {
          logger.info = noop;
          logger.debug = noop;
          logger.trace = noop;
        }
        break;
      }
      case 'info': {
        {
          logger.debug = noop;
          logger.trace = noop;
        }
        break;
      }
      case 'debug': {
        logger.trace = noop;
      }
    }
  } else {
    const pinoOptions: LoggerOptions = {
      hooks: { logMethod },
      level
    };
    logger = pino(pinoOptions);
  }
  return logger;
};
const log = getLoggerForLevel(logLevelKey);

export const getLogger = (name: string) => {
  try {
    const exceptions = JSON.parse(exceptionsStr || '[]') as LogLevelExceptionArray;
    let logLevelForName = logLevelKey;

    if (exceptions) {
      for (const e of exceptions) {
        if (e.name === name) {
          logLevelForName = e.level;
        }
      }
    }

    const namedLogger = getLoggerForLevel(logLevelForName || logLevelKey);
    return namedLogger;
  } catch (error) {
    console.error('error parsing log level exceptions', error);
  }

  return log;
};

export const getModuleLogger = (name: string) => {
  return pino({ name, timestamp: true });
};

export default log;
