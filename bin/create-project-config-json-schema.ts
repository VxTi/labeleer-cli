import { ProjectConfigSchema } from '../src/project/config/schema';
import chalk                   from 'chalk';
import fs from 'node:fs';
import path from 'node:path';

const __dirname = new URL('.', import.meta.url).pathname;
const schema = ProjectConfigSchema.toJSONSchema({ io: 'input' });
const schemaFileName = 'schema.json';

fs.writeFileSync(
  path.join(__dirname, schemaFileName),
  JSON.stringify(schema, null, 2)
);

console.log(chalk.green(`JSON schema has been written to ${schemaFileName}`));
