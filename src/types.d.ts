declare module 'labeleer-cli' {
  /**
   * Represents the configuration required to access a project.
   */
  export interface ProjectConfig {
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

    localFilePath: string;
  }

  export type PartialConfig = Omit<ProjectConfig, 'localFilePath'>;

  export type LabelFile = {
    [key: string]: {
      translations: {
        [locale: string]: string;
      };
    };
  };
}
