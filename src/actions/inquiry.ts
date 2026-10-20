import { tryCreateLabel } from '@/actions/create-labels';
import { tryPublishLocalLabels } from '@/actions/publish-labels';
import { tryRetrieveLabels } from '@/actions/retrieve-labels';
import { translate } from '@/core/i18n';
import { type Config } from '@/project/config/common';
import { exitMessage, theme } from '@/utils';
import { select } from '@inquirer/prompts';

export const enum Action {
  PUBLISH_LABELS = 'publish',
  FETCH_LABELS = 'retrieve',
  CREATE_LABEL = 'create',
  CANCEL = 'cancel',
}

async function inquireUserAction(): Promise<Action> {
  return await select(
    {
      message: translate({ label: 'actions.title' }),
      choices: [
        {
          name: translate({ label: 'actions.createNew' }),
          value: Action.CREATE_LABEL,
        },
        {
          name: translate({ label: 'actions.publish' }),
          value: Action.PUBLISH_LABELS,
        },
        {
          name: translate({ label: 'actions.retrieve' }),
          value: Action.FETCH_LABELS,
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

export async function inquireAndExecuteAction(config: Config): Promise<void> {
  const action = await inquireUserAction();

  switch (action) {
    case Action.FETCH_LABELS:
      await tryRetrieveLabels(config);
      return;
    case Action.PUBLISH_LABELS:
      await tryPublishLocalLabels(config);
      return;
    case Action.CREATE_LABEL:
      await tryCreateLabel(config);
      return;
    case Action.CANCEL:
      exitMessage();
  }
}
