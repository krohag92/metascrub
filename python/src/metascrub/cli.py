"""
MetaScrub CLI — mirrors the TypeScript CLI (packages/cli/).

Commands:
  metascrub view <file>          -- print metadata
  metascrub scrub <file>         -- strip metadata
  metascrub compare <a> <b>      -- diff metadata
  metascrub batch <dir> [...]    -- walk and report
  metascrub formats              -- list supported formats
"""

from __future__ import annotations

import json
import os
import sys

import click

from . import __version__


@click.group()
@click.version_option(version=__version__, prog_name="metascrub")
def main():
    """MetaScrub — See and strip metadata from any file.

    Web: https://metadatafinder.com
    """


@main.command("view")
@click.argument("file", type=click.Path(exists=True, readable=True))
@click.option("--json", "output_json", is_flag=True, help="Output as JSON.")
@click.option("--csv", "output_csv", is_flag=True, help="Output as CSV (highlights only).")
def cmd_view(file: str, output_json: bool, output_csv: bool):
    """View metadata for FILE."""
    from .api import parse

    try:
        result = parse(file)
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)

    if output_json:
        click.echo(json.dumps(result.to_dict(), indent=2, default=str))
        return

    if output_csv:
        import csv
        import io as _io

        writer_out = _io.StringIO()
        w = csv.writer(writer_out)
        w.writerow(["group", "key", "value", "sensitive"])
        for group, fields in result.groups.items():
            for f in fields:
                w.writerow([group, f.key, f.value, "yes" if f.sensitive else "no"])
        click.echo(writer_out.getvalue())
        return

    # Human-readable
    click.echo(f"File:    {result.filename or file}")
    click.echo(f"Format:  {result.format}")
    click.echo(f"Size:    {result.size_bytes:,} bytes")
    click.echo("")

    if result.highlights.gps:
        g = result.highlights.gps
        alt_str = f", alt={g.alt:.1f}m" if g.alt is not None else ""
        click.echo(f"  GPS:     {g.lat:.6f}, {g.lon:.6f}{alt_str}")
    if result.highlights.captured_at:
        click.echo(f"  Taken:   {result.highlights.captured_at}")
    if result.highlights.device:
        d = result.highlights.device
        parts = [x for x in [d.make, d.model] if x]
        if parts:
            click.echo(f"  Device:  {' '.join(parts)}")
    if result.highlights.author:
        click.echo(f"  Author:  {result.highlights.author}")
    if result.highlights.software:
        click.echo(f"  Software:{result.highlights.software}")
    if result.highlights.last_modified_by:
        click.echo(f"  Modified by: {result.highlights.last_modified_by}")

    click.echo("")
    for group, fields in result.groups.items():
        click.echo(f"[{group}]")
        for f in fields:
            marker = " *" if f.sensitive else ""
            click.echo(f"  {f.key} = {f.value}{marker}")
        click.echo("")

    if result.warnings:
        click.echo("Warnings:")
        for w in result.warnings:
            click.secho(f"  ! {w}", fg="yellow")


@main.command("scrub")
@click.argument("file", type=click.Path(exists=True, readable=True))
@click.option("-o", "--output", default=None, help="Output file path.")
@click.option(
    "--preset",
    default="all",
    type=click.Choice(["all", "gps-only", "personal-only", "keep-technical"]),
    show_default=True,
    help="Scrub preset.",
)
def cmd_scrub(file: str, output: str | None, preset: str):
    """Scrub metadata from FILE."""
    from .api import scrub as do_scrub

    if output is None:
        base, ext = os.path.splitext(file)
        output = f"{base}.clean{ext}"

    try:
        clean = do_scrub(file, preset=preset)
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)

    with open(output, "wb") as fh:
        fh.write(clean)

    orig_size = os.path.getsize(file)
    click.echo(f"Scrubbed: {file} -> {output}")
    click.echo(f"  Original: {orig_size:,} bytes")
    click.echo(f"  Cleaned:  {len(clean):,} bytes")
    reduction = orig_size - len(clean)
    if reduction > 0:
        click.echo(f"  Removed:  {reduction:,} bytes of metadata")


@main.command("compare")
@click.argument("file_a", type=click.Path(exists=True, readable=True))
@click.argument("file_b", type=click.Path(exists=True, readable=True))
@click.option("--json", "output_json", is_flag=True, help="Output as JSON.")
def cmd_compare(file_a: str, file_b: str, output_json: bool):
    """Compare metadata between FILE_A and FILE_B."""
    from .api import compare as do_compare

    try:
        diff = do_compare(file_a, file_b)
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)

    if output_json:
        click.echo(json.dumps(diff.to_dict(), indent=2, default=str))
        return

    if diff.only_in_a:
        click.echo(f"Only in {os.path.basename(file_a)}:")
        for f in diff.only_in_a:
            click.echo(f"  - {f.key} = {f.value}")
    if diff.only_in_b:
        click.echo(f"Only in {os.path.basename(file_b)}:")
        for f in diff.only_in_b:
            click.echo(f"  + {f.key} = {f.value}")
    if diff.changed:
        click.echo("Changed:")
        for c in diff.changed:
            click.echo(f"  ~ {c.a.key}: {c.a.value!r} -> {c.b.value!r}")
    if not diff.only_in_a and not diff.only_in_b and not diff.changed:
        click.echo("No differences found.")


@main.command("batch")
@click.argument("dirs", nargs=-1, type=click.Path(exists=True))
@click.option("--json", "output_json", is_flag=True, help="Output as JSON.")
@click.option("--csv", "output_csv", is_flag=True, help="Output as CSV.")
@click.option("--no-recursive", is_flag=True, default=False, help="Do not recurse into subdirs.")
def cmd_batch(dirs, output_json: bool, output_csv: bool, no_recursive: bool):
    """Walk DIR(s) and report metadata for all supported files."""
    from .api import batch_view

    if not dirs:
        click.echo("No directories specified.", err=True)
        sys.exit(1)

    all_results = []
    for d in dirs:
        results = batch_view(d, as_dataframe=False, recursive=not no_recursive)
        all_results.extend(results)

    if not all_results:
        click.echo("No supported files found.")
        return

    if output_json:
        click.echo(json.dumps([r.to_dict() for r in all_results], indent=2, default=str))
        return

    if output_csv:
        import csv
        import io as _io

        out = _io.StringIO()
        w = csv.writer(out)
        w.writerow(
            ["filename", "format", "captured_at", "gps_lat", "gps_lon", "author", "warnings"]
        )
        for r in all_results:
            g = r.highlights.gps
            w.writerow(
                [
                    r.filename,
                    r.format,
                    r.highlights.captured_at or "",
                    g.lat if g else "",
                    g.lon if g else "",
                    r.highlights.author or "",
                    "; ".join(r.warnings),
                ]
            )
        click.echo(out.getvalue())
        return

    # Human readable
    for r in all_results:
        g = r.highlights.gps
        gps_str = f"  GPS: {g.lat:.4f},{g.lon:.4f}" if g else ""
        warn_str = f"  [{len(r.warnings)} warning(s)]" if r.warnings else ""
        click.echo(f"{r.filename}  [{r.format}]{gps_str}{warn_str}")


@main.command("formats")
def cmd_formats():
    """List supported file formats."""
    from .api import supported_formats

    fmts = supported_formats()
    click.echo("Supported formats:")
    for fmt in fmts:
        click.echo(f"  {fmt}")
