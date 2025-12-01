import chalk from 'chalk';

export const theme = {
  prefix: {
    // The "dot" that appears before the question
    idle: chalk.blue('┃\n┃ ') + chalk.gray('○'),
    done: chalk.blue('┃\n┃ ') + chalk.green('●'),
  },
  icon: {
    cursor: `${chalk.blue('┃')} ${chalk.magentaBright('»')}`,
  },
  style: {
    // Optional: Style the answer text
    answer: (text: string) => chalk.gray(text),
    // Optional: Style the question message
    message: (text: string) => text,
    // Optional: Remove the default help tip
    defaultAnswer: (text: string) => chalk.gray(`(${text})`),
  },
};

export function log(...args: any[]) {
  console.log(
    chalk.blue('┃ ') + chalk.reset.white('▪'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    ...args
  );
}
