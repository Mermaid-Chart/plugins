// import {SystemError} from "node:errors";
import { homedir } from 'os';
import { join } from 'path';

import { type JsonMap, parse, stringify } from '@iarna/toml';
import { readFile, writeFile } from 'fs/promises';

/**
 * Gets the user config directory.
 *
 * Adapted from Go's `os.UserConfigDir()` function.
 *
 * @see https://pkg.go.dev/os#UserConfigDir
 */
function userConfigDir() {
  switch (process.platform) {
    case 'darwin':
      return `${homedir()}/Library/Application Support`;
    case 'win32':
      if (process.env['APPDATA']) {
        return process.env['APPDATA'];
      } else {
        throw new Error('%APPDATA% is not set correctly');
      }
    case 'aix':
    case 'freebsd':
    case 'openbsd':
    case 'sunos':
    case 'linux':
      return process.env['XDG_CONFIG_HOME'] || `${homedir()}/.config`;

    default:
      throw new Error(`The platform ${process.platform} is currently unsupported.`);
  }
}

export function defaultConfigPath() {
  return join(userConfigDir(), 'mermaid-chart.toml');
}

export interface Config extends JsonMap {
  /**
   * Mermaid-Chart API token.
   */
  auth_token?: string;
  /**
   * The Mermaid Chart API URL. You'll normally only override this if you are
   * using an on-premises instance of Mermaid Chart.
   *
   * Defaults to "https://mermaidchart.com"
   */
  base_url?: string;
}

// TODO: we could use something like https://www.npmjs.com/package/keytar
//       to store authentication in an OS keyring

/**
 * Read the given config file.
 *
 * @param configFile - The TOML file to read.
 * @throws if the config file does not exist, or is not a valid TOML file.
 */
export async function readConfig(configFile: string): Promise<Config> {
  const configFileContents = await readFile(configFile, { encoding: 'utf8' });
  return parse(configFileContents)['mermaid-chart'] as Config;
}

export async function writeConfig(configFile: string, config: Config) {
  await writeFile(configFile, stringify({ 'mermaid-chart': config }), { encoding: 'utf8' });
}
