#!/usr/bin/env node

/**
 * AWS Application Load Balancer (ALB) Log Analyzer
 * Main entry point - Clean Architecture
 */

import * as fs from 'fs';
import { LogAnalyzerUseCase } from '@application/log-analyzer.usecase';
import { FileLogReader } from '@infrastructure/filesystem/file-log-reader';
import { StdinLogReader } from '@infrastructure/filesystem/stdin-log-reader';
import { ConsolePresenter, PresentationOptions } from '@presentation/console-presenter';
import { JsonPresenter } from '@presentation/json-presenter';
import { CsvPresenter } from '@presentation/csv-presenter';

async function main(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let filePath: string | null = null;
  let output: string | null = null;
  let format: 'txt' | 'json' | 'csv' = 'txt';
  let slowRequestLimit: number | null | undefined = undefined;
  let slowRequestThreshold = 1.0;

  for (const arg of args) {
    if (arg.startsWith('--output=')) {
      output = arg.split('=')[1];
    } else if (arg.startsWith('--format=')) {
      const formatValue = arg.split('=')[1];
      format = (formatValue === 'json' || formatValue === 'csv') ? formatValue : 'txt';
    } else if (arg.startsWith('--slow-limit=')) {
      const value = arg.split('=')[1];
      slowRequestLimit = value === 'all' ? null : parseInt(value);
    } else if (arg.startsWith('--slow-threshold=')) {
      slowRequestThreshold = parseFloat(arg.split('=')[1]);
    } else if (!arg.startsWith('--')) {
      filePath = arg;
    }
  }

  try {
    // Infrastructure Layer: Read logs
    const logReader = filePath
      ? new FileLogReader(filePath)
      : new StdinLogReader();

    if (filePath) {
      console.log(`ログファイルを解析中: ${filePath}\n`);
    } else {
      console.log('stdinから読み込み中（ログを貼り付けてCtrl+Dで終了）...\n');
    }

    const lines = await logReader.readLines();

    // Domain Layer: Analyze logs
    const useCase = new LogAnalyzerUseCase();
    const result = useCase.analyze(lines);

    // Presentation Layer: Format and display results
    const options: PresentationOptions = {
      slowRequestLimit,
      slowRequestThreshold
    };

    const consolePresenter = new ConsolePresenter();
    consolePresenter.present(result, options);

    // Write to file if output is specified
    if (output) {
      let content = '';
      let actualPath = output;

      switch (format) {
        case 'json':
          const jsonPresenter = new JsonPresenter();
          content = JSON.stringify(jsonPresenter.format(result), null, 2);
          if (!actualPath.endsWith('.json')) actualPath += '.json';
          break;
        case 'csv':
          const csvPresenter = new CsvPresenter();
          content = csvPresenter.format(result);
          if (!actualPath.endsWith('.csv')) actualPath += '.csv';
          break;
        case 'txt':
        default:
          // Capture console output for txt format
          const originalLog = console.log;
          let txtContent = '';
          console.log = (...args: any[]): void => {
            txtContent += args.join(' ') + '\n';
          };
          consolePresenter.present(result, options);
          console.log = originalLog;
          content = txtContent;
          if (!actualPath.endsWith('.txt')) actualPath += '.txt';
          break;
      }

      await fs.promises.writeFile(actualPath, content, 'utf8');
      console.log(`\n結果をファイルに保存しました: ${actualPath}`);
    }
  } catch (error) {
    console.error(`エラー: ${(error as Error).message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
