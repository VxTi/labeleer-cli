import { inquireAndExecuteAction } from '@/actions/inquiry';
import { translate } from '@/core/i18n';
import { cwd }                     from '@/files';
import { resolveAccessToken } from '@/project/access-token';
import { inquireProjectConfig } from '@/project/config/inquiry';
import { exitMessage, info } from '@/utils';
import path from 'node:path';
import { parseArgs } from 'node:util';
import chalk from 'chalk';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { values } = parseArgs({
    args,
    options: {
      ['access-token']: { type: 'string' },
      config: { type: 'string' },
    },
  });
  console.log(
    `${chalk.blue('┏━')} ${chalk.bgBlack.bold.whiteBright(translate({ label: 'cli.title' }))}`
  );

  const accessTokenRes = await resolveAccessToken(values['access-token']);

  if (!accessTokenRes.ok) {
    info(accessTokenRes.error);
    process.exit(1);
  }
  const configRes = await inquireProjectConfig(
    accessTokenRes.value,
    values['config']
  );
  if (!configRes.ok) {
    info(configRes.error);
    process.exit(1);
  }

  const config = configRes.value;
  info(
    `Found ${chalk.underline(Object.keys(config.translations).length)} translation(s) with ${chalk.underline(config.locales.length)} language(s)`
  );
  info(
    `Project file: ${chalk.underline(path.relative(cwd, config.configFile.absolutePath))} ${chalk.gray('▪')} ${chalk.underline(config.format)}`
  );

  await inquireAndExecuteAction(config);
}

main().catch(error => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    exitMessage();
    process.exit(0);
  }
  console.error(chalk.red('An unexpected error occurred:'), error);
  process.exit(1);
});
