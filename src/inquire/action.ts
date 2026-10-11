import { translate } from '@/core/i18n';
import { theme } from '@/utils';
import { select } from '@inquirer/prompts';

export const enum Action {
  PUBLISH_LABELS = 'publish',
  FETCH_LABELS = 'retrieve',
  CREATE_LABEL = 'create',
  CANCEL = 'cancel',
}

interface UserActionOptions {
  isNew: boolean;
}

export async function inquireUserAction(
  options: UserActionOptions
): Promise<Action> {
  const { isNew } = options;
  return await select(
    {
      message: 'What would you like to do?',
      choices: [
        { name: translate('actions.retrieve'), value: Action.FETCH_LABELS },
        {
          name: translate('actions.publish'),
          value: Action.PUBLISH_LABELS,
          disabled: isNew,
        },
        {
          name: translate('actions.createNew'),
          value: Action.CREATE_LABEL,
        },
        {
          name: translate('actions.cancel'),
          value: Action.CANCEL,
        },
      ],
      theme,
    },
    { clearPromptOnDone: true }
  );
}
