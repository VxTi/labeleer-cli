import { theme } from '@/utils';
import { select } from '@inquirer/prompts';

export const enum UserAction {
  PUBLISH = 'publish',
  RETRIEVE = 'retrieve',
  CREATE = 'create',
  CANCEL = 'cancel',
}

interface UserActionOptions {
  isNew: boolean;
}

export async function inquireUserAction(
  options: UserActionOptions
): Promise<UserAction> {
  const { isNew } = options;
  return await select(
    {
      message: 'What would you like to do?',
      choices: [
        { name: 'Retrieve', value: UserAction.RETRIEVE },
        { name: 'Publish', value: UserAction.PUBLISH, disabled: isNew },
        { name: 'Create New Label', value: UserAction.CREATE },
        { name: '⨯ Cancel', value: UserAction.CANCEL },
      ],
      theme,
    },
    { clearPromptOnDone: true }
  );
}
