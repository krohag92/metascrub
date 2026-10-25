export interface ExifTag {
  description?: unknown;
}

export interface ExifRow {
  label: string;
  value: string;
}

function text(tags: Record<string, ExifTag | undefined>, key: string): string | undefined {
  const raw = tags[key]?.description;
  if (raw == null) return undefined;
  const value = String(raw).trim();
  return value === '' ? undefined : value;
}

function withPrefix(value: string | undefined, prefix: string): string | undefined {
  if (!value) return undefined;
  return value.toLowerCase().startsWith(prefix.toLowerCase()) ? value : `${prefix}${value}`;
}

function withSuffix(value: string | undefined, suffix: string): string | undefined {
  if (!value) return undefined;
  return value.toLowerCase().endsWith(suffix.toLowerCase()) ? value : `${value}${suffix}`;
}

export function formatExif(tags: Record<string, ExifTag | undefined>): ExifRow[] {
  const rows: ExifRow[] = [];
  const add = (label: string, value: string | undefined) => {
    if (value) rows.push({ label, value });
  };

  const make = text(tags, 'Make');
  const model = text(tags, 'Model');
  let camera: string | undefined;
  if (make && model) {
    camera = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`;
  } else {
    camera = model || make;
  }
  add('Camera', camera);
  add('Lens', text(tags, 'LensModel') ?? text(tags, 'Lens'));
  add('Date/Time Original', text(tags, 'DateTimeOriginal') ?? text(tags, 'DateTime'));
  add('F-Number', withPrefix(text(tags, 'FNumber'), 'f/'));
  add('Exposure Time', withSuffix(text(tags, 'ExposureTime'), 's'));
  add(
    'ISO',
    text(tags, 'ISOSpeedRatings') ??
      text(tags, 'PhotographicSensitivity') ??
      text(tags, 'ISOSpeed'),
  );
  add('Focal Length', withSuffix(text(tags, 'FocalLength'), 'mm'));
  add('Flash', text(tags, 'Flash'));
  add('Exposure Bias', text(tags, 'ExposureBiasValue'));
  add('Metering Mode', text(tags, 'MeteringMode'));
  add('White Balance', text(tags, 'WhiteBalance'));
  add('Exposure Program', text(tags, 'ExposureProgram'));
  add('Software', text(tags, 'Software'));
  add('Orientation', text(tags, 'Orientation'));
  add('GPS Latitude', text(tags, 'GPSLatitude'));
  add('GPS Longitude', text(tags, 'GPSLongitude'));
  return rows;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
