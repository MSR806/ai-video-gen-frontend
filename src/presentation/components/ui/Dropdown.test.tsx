import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Dropdown, DropdownItem } from './Dropdown';

describe('Dropdown', () => {
  it('opens from trigger click and closes on outside click', () => {
    render(
      <div>
        <button type="button">Outside target</button>
        <Dropdown trigger={<button type="button">Open menu</button>}>
          <DropdownItem label="Edit" onClick={() => undefined} />
        </Dropdown>
      </div>,
    );

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside target' }));
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('closes on Escape and on dropdown item selection', () => {
    let clicked = 0;

    render(
      <Dropdown trigger={<button type="button">Actions</button>}>
        <DropdownItem
          label="Delete"
          onClick={() => {
            clicked += 1;
          }}
        />
      </Dropdown>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(clicked).toBe(1);
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
