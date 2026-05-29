import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ScrubPanel } from '../src/popup/components/ScrubPanel.js';
import type { ScrubPreset } from '@metascrub/core';

describe('ScrubPanel', () => {
  it('renders all four preset options', () => {
    render(<ScrubPanel onScrub={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /remove all/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /gps only/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /personal info/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /keep technical/i })).toBeDefined();
  });

  it('defaults to "all" preset selected', () => {
    render(<ScrubPanel onScrub={vi.fn()} />);
    const allRadio = screen.getByRole('radio', { name: /remove all/i }) as HTMLInputElement;
    expect(allRadio.checked).toBe(true);
  });

  it('selects a different preset on click', async () => {
    const user = userEvent.setup();
    render(<ScrubPanel onScrub={vi.fn()} />);

    const gpsRadio = screen.getByRole('radio', { name: /gps only/i }) as HTMLInputElement;
    await user.click(gpsRadio);
    expect(gpsRadio.checked).toBe(true);

    const allRadio = screen.getByRole('radio', { name: /remove all/i }) as HTMLInputElement;
    expect(allRadio.checked).toBe(false);
  });

  it('calls onScrub with the selected preset when button is clicked', async () => {
    const user = userEvent.setup();
    const onScrub = vi.fn();
    render(<ScrubPanel onScrub={onScrub} />);

    // Select personal-only
    await user.click(screen.getByRole('radio', { name: /personal info/i }));
    await user.click(screen.getByRole('button', { name: /scrub/i }));

    expect(onScrub).toHaveBeenCalledTimes(1);
    expect(onScrub).toHaveBeenCalledWith('personal-only' as ScrubPreset);
  });

  it('calls onScrub with "all" by default', async () => {
    const user = userEvent.setup();
    const onScrub = vi.fn();
    render(<ScrubPanel onScrub={onScrub} />);

    await user.click(screen.getByRole('button', { name: /scrub/i }));
    expect(onScrub).toHaveBeenCalledWith('all' as ScrubPreset);
  });

  it('disables radios and shows spinner when disabled=true', () => {
    render(<ScrubPanel onScrub={vi.fn()} disabled />);

    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    radios.forEach((r) => {
      expect(r.disabled).toBe(true);
    });

    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText(/scrubbing/i)).toBeDefined();
  });

  it('calls onScrub with keep-technical preset', async () => {
    const user = userEvent.setup();
    const onScrub = vi.fn();
    render(<ScrubPanel onScrub={onScrub} />);

    await user.click(screen.getByRole('radio', { name: /keep technical/i }));
    await user.click(screen.getByRole('button', { name: /scrub/i }));

    expect(onScrub).toHaveBeenCalledWith('keep-technical' as ScrubPreset);
  });
});
