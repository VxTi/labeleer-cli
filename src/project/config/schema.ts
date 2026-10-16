import {
  type CompressedFormat,
  compressedFormats,
  FileFormat,
  isCompressedFormat,
  Locales,
} from '@labeleer/translation-dataset-transformers';
import * as z from 'zod';

const LocaleSchema = z
  .enum(Locales, { error: 'Expected a POSIX formatted locale' })
  .meta({ id: 'Locale' });

const ComposedFileFormat = z.enum(compressedFormats);
const SingularFileFormat = z.enum(
  Object.values(FileFormat).filter(
    (f): f is Exclude<FileFormat, CompressedFormat> => !isCompressedFormat(f)
  )
);

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
    format: SingularFileFormat,
    labelFile: z.string().describe('Name of the primary labels file'),
  })
  .transform(props => ({ ...props, type: 'single' as const }));

const ComposedProjectConfigSchema = z
  .object({
    ...CommonProjectConfigSchema.shape,
    format: ComposedFileFormat,
    paths: z
      .array(
        z
          .string()
          .describe('Path to one of the label files included in this project')
      )
      .describe('List of paths to label files'),
  })
  .transform(props => ({ ...props, type: 'composed' as const }));

export const ProjectConfigSchema = z.union([
  SingularProjectConfig,
  ComposedProjectConfigSchema,
]);
