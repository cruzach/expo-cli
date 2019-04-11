/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import clearConsole from 'react-dev-utils/clearConsole';
import * as ProjectUtils from './project/ProjectUtils';
const CONSOLE_TAG = 'webpack';

function log(projectRoot, message) {
  ProjectUtils.logInfo(projectRoot, CONSOLE_TAG, message);
}

function logWarning(projectRoot, message) {
  ProjectUtils.logWarning(projectRoot, CONSOLE_TAG, message);
}

function logError(projectRoot, message) {
  ProjectUtils.logError(projectRoot, CONSOLE_TAG, message);
}

function printInstructions(projectRoot, appName, urls, useYarn) {
  const _log = message => log(projectRoot, message);

  _log(` `);
  _log(`You can now view ${chalk.bold(appName)} in the browser.`);
  _log(` `);
  if (urls.lanUrlForTerminal) {
    _log(`  ${chalk.bold('Local:')}            ${urls.localUrlForTerminal}`);
    _log(`  ${chalk.bold('On Your Network:')}  ${urls.lanUrlForTerminal}`);
    _log(` `);
  } else {
    _log(`  ${urls.localUrlForTerminal}`);
  }

  _log(`Note that the development build is not optimized.`);
  _log(`To create a production build, use ${chalk.bold(`expo build:web`)}.`);
  _log(` `);
}

export function printPreviewNotice(projectRoot) {
  log(projectRoot, ` `);
  log(
    projectRoot,
    chalk.underline.yellow('Web support in Expo is experimental and subject to breaking changes.')
  );
  log(projectRoot, chalk.underline.yellow('Do not use this in production yet.'));
}

export default function createWebpackCompiler({
  projectRoot,
  appName,
  config,
  urls,
  nonInteractive,
  useYarn,
  webpack,
  onFinished,
}) {
  const devSocket = {
    warnings: warnings => logWarning(projectRoot, warnings),
    errors: errors => logError(projectRoot, errors),
  };

  // "Compiler" is a low-level interface to Webpack.
  // It lets us listen to some events and provide our own custom messages.
  let compiler;
  try {
    compiler = webpack(config);
  } catch (err) {
    logError(projectRoot, ' ');
    logError(projectRoot, 'Failed to compile');
    logError(projectRoot, ' ');
    logError(projectRoot, err.message || err);
    logError(projectRoot, ' ');
    process.exit(1);
  }

  // "invalid" event fires when you have changed a file, and Webpack is
  // recompiling a bundle. WebpackDevServer takes care to pause serving the
  // bundle, so if you refresh, it'll wait instead of serving the old one.
  // "invalid" is short for "bundle invalidated", it doesn't imply any errors.
  compiler.hooks.invalid.tap('invalid', () => {
    if (!nonInteractive) {
      clearConsole();
    }
    log(projectRoot, chalk.white('\nCompiling...'));
  });

  let isFirstCompile = true;

  // "done" event fires when Webpack has finished recompiling the bundle.
  // Whether or not you have warnings or errors, you will get this event.
  compiler.hooks.done.tap('done', async stats => {
    if (!nonInteractive) {
      clearConsole();
    }

    // We have switched off the default Webpack output in WebpackDevServer
    // options so we are going to "massage" the warnings and errors and present
    // them in a readable focused way.
    // We only construct the warnings and errors for speed:
    // https://github.com/facebook/create-react-app/issues/4492#issuecomment-421959548
    const statsData = stats.toJson({
      all: false,
      warnings: true,
      errors: true,
    });

    const messages = formatWebpackMessages(statsData);

    if (messages.errors.length > 0) {
      devSocket.errors(messages.errors);
    } else if (messages.warnings.length > 0) {
      devSocket.warnings(messages.warnings);
    }

    // New line after the bundle analyzer finishes
    log(projectRoot, ` `);

    const isSuccessful = !messages.errors.length && !messages.warnings.length;
    if (isSuccessful) {
      log(projectRoot, chalk.bold.cyan(`Compiled successfully!`));
      printPreviewNotice(projectRoot);
    }
    if (isSuccessful && (!nonInteractive || isFirstCompile)) {
      printInstructions(projectRoot, appName, urls, useYarn);
    }
    onFinished();
    isFirstCompile = false;

    // If errors exist, only show errors.
    if (messages.errors.length) {
      // Only keep the first error. Others are often indicative
      // of the same problem, but confuse the reader with noise.
      if (messages.errors.length > 1) {
        messages.errors.length = 1;
      }
      logError(projectRoot, chalk.red('Failed to compile.\n'));
      logError(projectRoot, messages.errors.join('\n\n'));
      return;
    }

    // Show warnings if no errors were found.
    if (messages.warnings.length) {
      logWarning(projectRoot, chalk.yellow('Compiled with warnings.\n'));
      logWarning(projectRoot, messages.warnings.join('\n\n'));

      // Teach some ESLint tricks.
      logWarning(
        projectRoot,
        '\nSearch for the ' +
          chalk.underline(chalk.yellow('keywords')) +
          ' to learn more about each warning.'
      );
      logWarning(
        projectRoot,
        'To ignore, add ' + chalk.cyan('// eslint-disable-next-line') + ' to the line before.\n'
      );
    }
  });

  return compiler;
}