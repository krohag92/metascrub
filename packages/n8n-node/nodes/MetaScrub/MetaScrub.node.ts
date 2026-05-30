import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { parse, scrub, compare } from '@metascrub/core';
import type { FileInput, ScrubPreset } from '@metascrub/core';

export class MetaScrub implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'MetaScrub',
    name: 'metaScrub',
    icon: 'file:metascrub.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description:
      'Parse and scrub metadata from files — images, PDFs, DOCX, and more. Powered by metadatafinder.com.',
    defaults: {
      name: 'MetaScrub',
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    documentationUrl: 'https://metadatafinder.com',
    properties: [
      // ----------------------------------------------------------------
      // Operation
      // ----------------------------------------------------------------
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Parse',
            value: 'parse',
            description: 'Extract metadata from a file and return it as JSON',
            action: 'Parse metadata from a file',
          },
          {
            name: 'Scrub',
            value: 'scrub',
            description: 'Strip metadata from a file and return the cleaned binary',
            action: 'Scrub metadata from a file',
          },
          {
            name: 'Compare',
            value: 'compare',
            description: 'Diff the metadata of two files and return the differences as JSON',
            action: 'Compare metadata of two files',
          },
        ],
        default: 'parse',
      },

      // ----------------------------------------------------------------
      // Parse + Scrub: binary property name
      // ----------------------------------------------------------------
      {
        displayName: 'Binary Property',
        name: 'binaryProperty',
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: {
          show: {
            operation: ['parse', 'scrub'],
          },
        },
        description:
          'Name of the binary property on the n8n item that contains the file to process',
      },

      // ----------------------------------------------------------------
      // Parse + Scrub: optional filename override
      // ----------------------------------------------------------------
      {
        displayName: 'Filename Override',
        name: 'filename',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['parse', 'scrub'],
          },
        },
        description:
          'Override the filename used for format detection (leave empty to use the filename from the binary data)',
      },

      // ----------------------------------------------------------------
      // Scrub: preset
      // ----------------------------------------------------------------
      {
        displayName: 'Scrub Preset',
        name: 'preset',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['scrub'],
          },
        },
        options: [
          {
            name: 'All — Remove Every Metadata Field',
            value: 'all',
            description: 'Remove every metadata field that is safe to strip',
          },
          {
            name: 'GPS Only — Remove GPS Coordinates',
            value: 'gps-only',
            description: 'Remove GPS coordinates only; keep everything else',
          },
          {
            name: 'Personal Only — Remove Author/Owner/Software',
            value: 'personal-only',
            description: 'Remove author, owner, software, serial, and edit history',
          },
          {
            name: 'Keep Technical — Retain Camera/Exposure Data',
            value: 'keep-technical',
            description: 'Keep camera/exposure/dimensions; drop everything else',
          },
        ],
        default: 'all',
        description: 'Which fields to strip from the file',
      },

      // ----------------------------------------------------------------
      // Scrub: output binary property name
      // ----------------------------------------------------------------
      {
        displayName: 'Output Binary Property',
        name: 'outputBinaryProperty',
        type: 'string',
        default: 'data',
        displayOptions: {
          show: {
            operation: ['scrub'],
          },
        },
        description:
          'Name of the binary property on the output item that will hold the scrubbed file',
      },

      // ----------------------------------------------------------------
      // Compare: binary property A
      // ----------------------------------------------------------------
      {
        displayName: 'Binary Property A',
        name: 'binaryPropertyA',
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: {
          show: {
            operation: ['compare'],
          },
        },
        description: 'Binary property containing the first file to compare',
      },

      // ----------------------------------------------------------------
      // Compare: binary property B
      // ----------------------------------------------------------------
      {
        displayName: 'Binary Property B',
        name: 'binaryPropertyB',
        type: 'string',
        default: 'data2',
        required: true,
        displayOptions: {
          show: {
            operation: ['compare'],
          },
        },
        description: 'Binary property containing the second file to compare',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      if (operation === 'parse') {
        const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
        const filenameOverride = this.getNodeParameter('filename', i) as string;

        const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
        const filename = filenameOverride || binaryData.fileName || undefined;

        const input: FileInput = {
          kind: 'bytes',
          data: new Uint8Array(buffer),
          ...(filename ? { filename } : {}),
        };

        const result = await parse(input);

        returnData.push({
          json: result as unknown as IDataObject,
          pairedItem: { item: i },
        });
      } else if (operation === 'scrub') {
        const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
        const filenameOverride = this.getNodeParameter('filename', i) as string;
        const preset = this.getNodeParameter('preset', i) as ScrubPreset;
        const outputBinaryProperty = this.getNodeParameter('outputBinaryProperty', i) as string;

        const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
        const filename = filenameOverride || binaryData.fileName || undefined;

        const input: FileInput = {
          kind: 'bytes',
          data: new Uint8Array(buffer),
          ...(filename ? { filename } : {}),
        };

        const scrubbed = await scrub(input, { preset });
        const scrubbedBuffer = Buffer.from(scrubbed);

        const outputBinary = await this.helpers.prepareBinaryData(
          scrubbedBuffer,
          filename,
          binaryData.mimeType,
        );

        returnData.push({
          json: {
            originalSizeBytes: buffer.length,
            scrubSizeBytes: scrubbedBuffer.length,
            preset,
            filename: filename ?? null,
          },
          binary: {
            [outputBinaryProperty]: outputBinary,
          },
          pairedItem: { item: i },
        });
      } else if (operation === 'compare') {
        const binaryPropertyA = this.getNodeParameter('binaryPropertyA', i) as string;
        const binaryPropertyB = this.getNodeParameter('binaryPropertyB', i) as string;

        const binaryDataA = this.helpers.assertBinaryData(i, binaryPropertyA);
        const binaryDataB = this.helpers.assertBinaryData(i, binaryPropertyB);

        const bufferA = await this.helpers.getBinaryDataBuffer(i, binaryPropertyA);
        const bufferB = await this.helpers.getBinaryDataBuffer(i, binaryPropertyB);

        const inputA: FileInput = {
          kind: 'bytes',
          data: new Uint8Array(bufferA),
          ...(binaryDataA.fileName ? { filename: binaryDataA.fileName } : {}),
        };
        const inputB: FileInput = {
          kind: 'bytes',
          data: new Uint8Array(bufferB),
          ...(binaryDataB.fileName ? { filename: binaryDataB.fileName } : {}),
        };

        const diff = await compare(inputA, inputB);

        returnData.push({
          json: diff as unknown as IDataObject,
          pairedItem: { item: i },
        });
      }
    }

    return [returnData];
  }
}
