#!/usr/bin/env node

import { createCommanderCommand } from './commander.js';

createCommanderCommand()
  .parseAsync()
  .catch((error) => {
    console.error(error); // eslint-disable-line no-console
    process.exitCode = 1;
  });
