import { Err, Ok, type Result } from '@/core/result';
import {
  hasArrayLength,
  isEmptyArray,
  isNonEmptyArray,
} from '@/core/type-utils';
import { theme } from '@/utils';
import { select } from '@inquirer/prompts';
import { readdir, readFile } from 'fs/promises';
import { isNil } from 'lodash-es';
import { parseEnv } from 'node:util';

export async function resolveAccessToken(
  accessToken?: string
): Promise<Result<string>> {
  if (accessToken) return Ok(accessToken);

  return await extractProjectConfigFromEnv();
}

async function extractProjectConfigFromEnv(): Promise<Result<string>> {
  const envFilePathRes = await getEnvFilePath();
  if (!envFilePathRes.ok) return envFilePathRes;

  const content = await readFile(envFilePathRes.value, { encoding: 'utf-8' });
  const parsed = parseEnv(content);

  type KeyPair = { key: string; value: string };

  const accessTokenCandidates: KeyPair[] = [];

  Object.entries(parsed).forEach(([key, value]) => {
    if (key.includes('LABELEER') && key.includes('TOKEN') && !isNil(value)) {
      accessTokenCandidates.push({ key, value });
    }
  });

  if (isEmptyArray(accessTokenCandidates))
    return Err(
      'Unable to resolve access token. Please set the LABELEER_TOKEN environment variable.'
    );

  if (hasArrayLength(accessTokenCandidates, 1))
    return Ok(accessTokenCandidates[0].value);

  return await select({
    message: 'Multiple access tokens found. Please select one:',
    choices: accessTokenCandidates.map(({ key, value }) => ({
      name: key,
      value,
    })),
    theme,
  }).then(res => Ok(res));
}

async function getEnvFilePath(): Promise<Result<string>> {
  const envFileExpression = /\.env(\..*)?$/;
  const files = await readdir(process.cwd());
  const candidates: string[] = files.filter(fileName =>
    envFileExpression.test(fileName)
  );
  if (!isNonEmptyArray(candidates)) {
    return Err('No .env files found');
  }

  if (hasArrayLength(candidates, 1)) {
    return Ok(candidates[0]);
  }

  return await select(
    {
      message: 'Identified multiple .env files. Please select one to use:',
      choices: candidates.map(fileName => ({
        name: fileName,
        value: fileName,
      })),
      theme,
    },
    { clearPromptOnDone: true }
  ).then(res => Ok(res));
}
