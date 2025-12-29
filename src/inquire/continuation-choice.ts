import { theme } from '@/utils';
import { select } from '@inquirer/prompts';

interface ContinuationChoice {
  message: string;
}

export async function inquireContinuationChoice({
  message,
}: ContinuationChoice): Promise<boolean> {
  return await select(
    {
      message,
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      theme,
    },
    { clearPromptOnDone: true }
  );
}
