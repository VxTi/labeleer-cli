import {
  defaultTransformerSet,
  Locales,
} from '@labeleer/translation-dataset-transformers';
import * as z from 'zod';

const CommonProjectConfigSchema = z.object({
  projectId: z
    .string()
    .describe(
      'The unique ID of the project. This can be found in the project settings menu'
    ),
  rootDir: z
    .string()
    .describe('The root directory in which the translations files live'),
});

const SingularProjectConfig = z
  .object({
    ...CommonProjectConfigSchema.shape,
    format: z.enum(defaultTransformerSet.singleOutputFormats),
    labelFile: z.string().describe('Name of the primary labels file'),
  })
  .transform(props => ({ ...props, type: 'single' as const }));

const ComposedProjectConfigSchema = z
  .object({
    ...CommonProjectConfigSchema.shape,
    format: z.enum(defaultTransformerSet.multipleOutputFormats),
    paths: z
      .partialRecord(
        z.enum(Locales),
        z
          .string()
          .describe('Path to one of the label files included in this project')
      )
      .describe('Record of paths to label files'),
  })
  .transform(props => ({ ...props, type: 'composed' as const }));

export const ProjectConfigSchema = z.union([
  SingularProjectConfig,
  ComposedProjectConfigSchema,
]);

export type RawProjectConfig = z.input<typeof ProjectConfigSchema>;
