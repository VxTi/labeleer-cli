import type { Locale } from '@labeleer/translation-dataset-transformers';

/**
 * Represents the configuration required to access a project.
 */
export interface ProjectConfig extends BasicProjectConfig {
  localFilePath: string;
  locales: Locale[];
}

export interface BasicProjectConfig {
  /**
   * The unique identifier of the project.
   * This is the segment after `../projects/` in the project URL.
   */
  projectId: string;
  /**
   * The access token used for authenticating requests to the project.
   * This can be acquired in the `'Settings'` screen under the `'Access Tokens'` section.
   */
  accessToken: string;
}
