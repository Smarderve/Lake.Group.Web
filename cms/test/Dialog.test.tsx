import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../src/components/ui/Button';
import { ConfirmDialog } from '../src/components/ui/ConfirmDialog';
import { Dialog } from '../src/components/ui/Dialog';

describe('Dialog', () => {
  it('moves focus into the modal, traps it, and restores focus on close', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open modal</button>
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            title="Edit company"
            footer={<Button onClick={() => setOpen(false)}>Save</Button>}
          >
            <input aria-label="Company name" />
          </Dialog>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open modal' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('requires an explicit confirmation and disables both actions while loading', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        open
        title="Archive item"
        description="This removes the item from public listings."
        confirmLabel="Archive"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onConfirm).toHaveBeenCalledOnce();

    rerender(
      <ConfirmDialog
        open
        title="Archive item"
        description="This removes the item from public listings."
        confirmLabel="Archive"
        tone="danger"
        loading
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
  });

  it('has no automated accessibility violations', async () => {
    const { container } = render(
      <ConfirmDialog
        open
        title="Publish article"
        description="The article will become visible on the public website."
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
