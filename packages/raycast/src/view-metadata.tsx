import { readFile } from 'node:fs/promises';
import {
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  Toast,
  showToast,
  LaunchProps,
  open,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import { parse } from '@metascrub/core';
import type { MetadataResult } from '@metascrub/core';
import { orderedGroups, formatValue, parseSummary } from './utils.js';

interface ViewMetadataArgs {
  selectFile?: string;
}

export default function ViewMetadataCommand(props: LaunchProps<{ arguments: ViewMetadataArgs }>) {
  const [result, setResult] = useState<MetadataResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const filePath = props.arguments.selectFile?.trim() ?? '';

  useEffect(() => {
    if (!filePath) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const bytes = await readFile(filePath);
        const data = await parse({
          kind: 'bytes',
          data: new Uint8Array(bytes),
          filename: filePath,
        });
        if (!cancelled) {
          setResult(data);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          await showToast({
            style: Toast.Style.Failure,
            title: 'Failed to read metadata',
            message: msg,
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (!filePath) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.Document}
          title="No file selected"
          description="Pass a file path as an argument to view its metadata."
        />
      </List>
    );
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Error reading file"
          description={error}
        />
      </List>
    );
  }

  const groups = result ? orderedGroups(result) : [];
  const summary = result ? parseSummary(result) : '';

  return (
    <List
      isLoading={isLoading}
      navigationTitle={result?.filename ?? filePath.split('/').pop() ?? 'Metadata'}
      searchBarPlaceholder="Filter metadata fields..."
    >
      {result && result.warnings.length > 0 && (
        <List.Section title="Warnings" subtitle={`${result.warnings.length} issue(s) found`}>
          {result.warnings.map((warning, idx) => (
            <List.Item
              key={`warning-${idx}`}
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              title={warning}
              accessories={[{ icon: { source: Icon.Warning, tintColor: Color.Red } }]}
              actions={
                <ActionPanel>
                  <SharedActions filePath={filePath} result={result} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {groups.map(({ group, fields }) => (
        <List.Section key={group} title={group} subtitle={`${fields.length} field(s)`}>
          {fields.map((field) => (
            <List.Item
              key={field.key}
              title={field.label ?? field.key}
              subtitle={formatValue(field.value)}
              accessories={
                field.sensitive
                  ? [
                      {
                        icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
                        tooltip: 'Sensitive field',
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Value"
                    content={formatValue(field.value)}
                    shortcut={{ modifiers: ['cmd'], key: 'c' }}
                  />
                  <SharedActions filePath={filePath} result={result} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {result && groups.length === 0 && (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="No metadata found"
          description={`${summary} — this file appears clean.`}
        />
      )}
    </List>
  );
}

function SharedActions({ filePath, result }: { filePath: string; result: MetadataResult | null }) {
  const json = result
    ? JSON.stringify(
        { format: result.format, groups: result.groups, warnings: result.warnings },
        null,
        2,
      )
    : '';

  return (
    <>
      {result && (
        <Action.CopyToClipboard
          title="Copy as JSON"
          content={json}
          shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
        />
      )}
      <Action.OpenInBrowser
        title="Open metadatafinder.com"
        url="https://metadatafinder.com"
        shortcut={{ modifiers: ['cmd'], key: 'o' }}
      />
      <Action.Open
        title="Open in Scrub Command"
        target={`raycast://extensions/metadatafinder/metascrub/scrub?arguments=${encodeURIComponent(JSON.stringify({ selectFile: filePath }))}`}
        shortcut={{ modifiers: ['cmd', 'shift'], key: 's' }}
      />
    </>
  );
}
