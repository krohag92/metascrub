import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  Detail,
  Action,
  ActionPanel,
  Icon,
  Color,
  Toast,
  showToast,
  LaunchProps,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import { parse, scrub } from '@metascrub/core';
import type { MetadataResult, ScrubPreset } from '@metascrub/core';
import {
  cleanFilename,
  resolvePreset,
  presetLabel,
  computeRemovedFields,
  countFields,
} from './utils.js';

interface ScrubArgs {
  selectFile?: string;
  preset?: string;
}

type ScrubState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'done';
      outputPath: string;
      removed: number;
      originalCount: number;
      original: MetadataResult;
      cleaned: MetadataResult;
    }
  | { status: 'error'; message: string };

export default function ScrubCommand(props: LaunchProps<{ arguments: ScrubArgs }>) {
  const [state, setState] = useState<ScrubState>({ status: 'idle' });

  const filePath = props.arguments.selectFile?.trim() ?? '';
  const preset: ScrubPreset = resolvePreset(props.arguments.preset);

  useEffect(() => {
    if (!filePath) return;

    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        await showToast({ style: Toast.Style.Animated, title: 'Scrubbing metadata…' });

        const bytes = await readFile(filePath);
        const input = new Uint8Array(bytes);

        const original = await parse({ kind: 'bytes', data: input, filename: filePath });
        const scrubbedBytes = await scrub(
          { kind: 'bytes', data: input, filename: filePath },
          { preset },
        );
        const cleaned = await parse({ kind: 'bytes', data: scrubbedBytes, filename: filePath });

        const outputPath = cleanFilename(filePath);
        await writeFile(outputPath, Buffer.from(scrubbedBytes));

        const removedFields = computeRemovedFields(original, cleaned);
        const originalCount = countFields(original);

        if (!cancelled) {
          setState({
            status: 'done',
            outputPath,
            removed: removedFields.length,
            originalCount,
            original,
            cleaned,
          });
          await showToast({
            style: Toast.Style.Success,
            title: 'Metadata scrubbed',
            message: `${removedFields.length} field(s) removed → ${path.basename(outputPath)}`,
          });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setState({ status: 'error', message });
          await showToast({
            style: Toast.Style.Failure,
            title: 'Scrub failed',
            message,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath, preset]);

  if (!filePath) {
    return (
      <Detail
        markdown="## No file selected\n\nPass a file path as an argument to scrub its metadata."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open metadatafinder.com"
              url="https://metadatafinder.com"
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <Detail
        isLoading={true}
        markdown={`## Scrubbing metadata…\n\n**File:** \`${filePath}\`\n\n**Preset:** ${presetLabel(preset)}`}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <Detail
        markdown={`## Error\n\n${state.message}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open metadatafinder.com"
              url="https://metadatafinder.com"
            />
          </ActionPanel>
        }
      />
    );
  }

  const { outputPath, removed, originalCount, original, cleaned } = state;
  const cleanedCount = countFields(cleaned);
  const filename = path.basename(filePath);
  const cleanedFilename = path.basename(outputPath);

  const removedFields = computeRemovedFields(original, cleaned);
  const removedList =
    removedFields.length > 0
      ? removedFields
          .slice(0, 20)
          .map((f) => `- **${f.label ?? f.key}**: ~~${String(f.value)}~~`)
          .join('\n') +
        (removedFields.length > 20 ? `\n- …and ${removedFields.length - 20} more` : '')
      : '_No fields were removed._';

  const markdown = `
## Scrub complete

| | |
|---|---|
| **Original file** | \`${filename}\` |
| **Output file** | \`${cleanedFilename}\` |
| **Preset** | ${presetLabel(preset)} |
| **Fields before** | ${originalCount} |
| **Fields after** | ${cleanedCount} |
| **Fields removed** | ${removed} |

${original.warnings.length > 0 ? `### Warnings resolved\n\n${original.warnings.map((w) => `- ${w}`).join('\n')}\n` : ''}

### Removed fields

${removedList}

---

Powered by [metadatafinder.com](https://metadatafinder.com)
`.trim();

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.ShowInFinder title="Reveal in Finder" path={outputPath} />
          <Action.OpenInBrowser
            title="Open metadatafinder.com"
            url="https://metadatafinder.com"
            shortcut={{ modifiers: ['cmd'], key: 'o' }}
          />
          <Action.CopyToClipboard
            title="Copy Output Path"
            content={outputPath}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
          />
        </ActionPanel>
      }
    />
  );
}
