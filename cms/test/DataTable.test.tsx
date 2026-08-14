import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type Column } from '../src/components/ui/DataTable';

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: '1', name: 'Lake Oil' },
  { id: '2', name: 'Lake Gas' },
];

const columns: Column<Row>[] = [
  {
    key: 'name',
    header: 'Company',
    cell: (row) => row.name,
    sortValue: (row) => row.name,
  },
];

function SelectableTable() {
  const [selected, setSelected] = useState(new Set<string>());
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      selectedKeys={selected}
      onSelectionChange={setSelected}
    />
  );
}

describe('DataTable', () => {
  it('renders rows and emits server-sort direction changes', async () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        sortKey="name"
        sortDir="asc"
        onSortChange={onSortChange}
      />,
    );

    expect(screen.getByText('Lake Oil')).toBeVisible();
    expect(screen.getByText('Lake Gas')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /Company/i }));
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('selects individual rows and all rows using accessible controls', async () => {
    render(<SelectableTable />);
    const first = screen.getByRole('checkbox', { name: 'Select row 1' });
    await userEvent.click(first);
    expect(first).toBeChecked();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(screen.getByRole('checkbox', { name: 'Select row 1' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select row 2' })).toBeChecked();
  });

  it('renders actionable empty and error states', async () => {
    const retry = vi.fn();
    const { rerender } = render(
      <DataTable columns={columns} rows={[]} rowKey={(row) => row.id} emptyTitle="No companies" />,
    );
    expect(screen.getByText('No companies')).toBeVisible();

    rerender(
      <DataTable
        columns={columns}
        rows={undefined}
        rowKey={(row) => row.id}
        error={new Error('Backend unavailable')}
        onRetry={retry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('has no automated accessibility violations in its interactive state', async () => {
    const { container } = render(<SelectableTable />);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
