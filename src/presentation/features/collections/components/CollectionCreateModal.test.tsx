import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CollectionCreateModal } from './CollectionCreateModal';

describe('CollectionCreateModal', () => {
  const onClose = mock(() => {});
  const onSubmit = mock(async () => {});

  beforeEach(() => {
    onClose.mockClear();
    onSubmit.mockClear();
  });

  it('keeps submit disabled until required fields are entered', async () => {
    render(
      <CollectionCreateModal
        projectId="project-1"
        parentCollectionId={null}
        isOpen
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    const submitButton = screen.getByRole('button', { name: 'Create Collection' });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Characters' } });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'reference' } });
    expect(submitButton).toBeEnabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed payload and clears fields on close', async () => {
    render(
      <CollectionCreateModal
        projectId="project-1"
        parentCollectionId="parent-9"
        isOpen
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Characters  ' } });
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: '  refs  ' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '  Desc  ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Collection' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      projectId: 'project-1',
      parentCollectionId: 'parent-9',
      name: 'Characters',
      tag: 'refs',
      description: 'Desc',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows submit errors and blocks closing while submitting', async () => {
    onSubmit.mockImplementationOnce(async () => {
      throw new Error('Backend rejected request');
    });

    const { rerender } = render(
      <CollectionCreateModal
        projectId="project-1"
        parentCollectionId={null}
        isOpen
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Characters' } });
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'reference' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Collection' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Backend rejected request'),
    );

    rerender(
      <CollectionCreateModal
        projectId="project-1"
        parentCollectionId={null}
        isOpen
        isSubmitting
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
