import { translate } from '@/core/i18n';
import { theme } from '@/utils';
import { select } from '@inquirer/prompts';

export const enum Action {
  PUBLISH_LABELS = 'publish',
  FETCH_LABELS = 'retrieve',
  CREATE_LABEL = 'create',
  CANCEL = 'cancel',
}

export async function inquireUserAction(): Promise<Action> {
  return await select(
    {
      message: translate({ label: 'actions.title' }),
      choices: [
        {
          name: translate({ label: 'actions.retrieve' }),
          value: Action.FETCH_LABELS,
        },
        {
          name: translate({ label: 'actions.publish' }),
          value: Action.PUBLISH_LABELS,
        },
        {
          name: translate({ label: 'actions.createNew' }),
          value: Action.CREATE_LABEL,
        },
        {
          name: translate({ label: 'actions.cancel' }),
          value: Action.CANCEL,
        },
      ],
      theme,
    },
    { clearPromptOnDone: true }
  );
}
