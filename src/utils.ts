import chalk from 'chalk';

export const theme = {
  prefix: {
    // The "dot" that appears before the question
    idle: chalk.blue('┃') + chalk.gray(' |\n') + chalk.blue('┗ ○'),
    done:
      chalk.blue('┃ ') + chalk.gray('|') + chalk.blue('\n┣ ') + chalk.blue('●'),
  },
  icon: {
    cursor: chalk.blueBright('»'),
  },
  style: {
    disabled: (text: string) => chalk.italic.gray(text),
    // Optional: Style the answer text
    answer: (text: string) => chalk.white(text),
    // Optional: Style the question message
    message: (text: string) => chalk.italic(text),
    // Optional: Remove the default help tip
    defaultAnswer: (text: string) => chalk.gray(`(${text})`),
    highlight: (text: string) => chalk.blue(text),
  },
};

export function log(...args: any[]) {
  console.log(
    chalk.blue('┃ ') + chalk.reset.white('▪'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    ...args
  );
}

export function exitMessage() {
  log(chalk.blue('Okay, goodbye.'));
}

