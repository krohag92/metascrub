import * as vscode from 'vscode';
import * as path from 'path';
import { parse, scrub } from '@metascrub/core';
import { MetadataPanel } from './MetadataPanel.js';

export function activate(context: vscode.ExtensionContext): void {
  const viewCmd = vscode.commands.registerCommand('metascrub.view', async (uri?: vscode.Uri) => {
    const fileUri = uri ?? vscode.window.activeTextEditor?.document.uri;
    if (!fileUri) {
      await vscode.window.showErrorMessage(
        'MetaScrub: No file selected. Right-click a file in Explorer or open it in the editor.',
      );
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'MetaScrub: Reading metadata…',
        cancellable: false,
      },
      async () => {
        try {
          const bytes = await vscode.workspace.fs.readFile(fileUri);
          const filename = path.basename(fileUri.fsPath);
          const result = await parse({
            kind: 'bytes',
            data: bytes,
            filename,
          });
          MetadataPanel.create(context.extensionUri, result, filename);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await vscode.window.showErrorMessage(`MetaScrub: ${msg}`);
        }
      },
    );
  });

  const scrubCmd = vscode.commands.registerCommand('metascrub.scrub', async (uri?: vscode.Uri) => {
    const fileUri = uri ?? vscode.window.activeTextEditor?.document.uri;
    if (!fileUri) {
      await vscode.window.showErrorMessage(
        'MetaScrub: No file selected. Right-click a file in Explorer or open it in the editor.',
      );
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'MetaScrub: Scrubbing metadata…',
        cancellable: false,
      },
      async () => {
        try {
          const bytes = await vscode.workspace.fs.readFile(fileUri);
          const filename = path.basename(fileUri.fsPath);

          // Parse first to get the field count for user feedback
          const before = await parse({
            kind: 'bytes',
            data: bytes,
            filename,
          });

          const totalFields = Object.values(before.groups).reduce(
            (sum, fields) => sum + fields.length,
            0,
          );

          // Scrub with "all" preset
          const cleanBytes = await scrub(
            { kind: 'bytes', data: bytes, filename },
            { preset: 'all' },
          );

          // Write to sibling file: photo.clean.jpg
          const ext = path.extname(fileUri.fsPath);
          const base = path.basename(fileUri.fsPath, ext);
          const dir = path.dirname(fileUri.fsPath);
          const cleanPath = path.join(dir, `${base}.clean${ext}`);
          const cleanUri = vscode.Uri.file(cleanPath);

          await vscode.workspace.fs.writeFile(cleanUri, cleanBytes);

          await vscode.window
            .showInformationMessage(
              `MetaScrub: Scrubbed ${totalFields} fields → ${path.basename(cleanPath)}`,
              'Open file',
            )
            .then(async (choice) => {
              if (choice === 'Open file') {
                await vscode.commands.executeCommand('vscode.open', cleanUri);
              }
            });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await vscode.window.showErrorMessage(`MetaScrub: ${msg}`);
        }
      },
    );
  });

  context.subscriptions.push(viewCmd, scrubCmd);
}

export function deactivate(): void {
  // Nothing to clean up
}
