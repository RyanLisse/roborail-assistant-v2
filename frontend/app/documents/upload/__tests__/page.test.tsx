// Vitest + React Testing Library test file for DocumentUploadPage
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DocumentUploadPage from '../page';

// Use vi.mocked for type-safe mocking
const mockedUseMutation = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useMutation: mockedUseMutation,
}));

describe('DocumentUploadPage', () => {
  it('shows success state after upload', async () => {
    mockedUseMutation.mockReturnValue({
      mutate: (formData: FormData, { onSuccess }: any) => {
        onSuccess && onSuccess({ documentId: 123, status: 'queued', fileName: 'test.pdf' });
      },
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
      data: { documentId: 123, status: 'queued', fileName: 'test.pdf' },
    });
    render(<DocumentUploadPage />);
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Document File/i), { target: { files: [file] } });
    fireEvent.click(screen.getByText(/Upload Document/i));
    await waitFor(() => {
      expect(screen.getByText(/Upload Successful/i)).toBeInTheDocument();
      expect(screen.getByText(/test.pdf/i)).toBeInTheDocument();
    });
  });

  it('shows error state on upload failure', async () => {
    mockedUseMutation.mockReturnValue({
      mutate: (formData: FormData, { onError }: any) => {
        onError && onError(new Error('Upload failed!'));
      },
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Upload failed!'),
      data: null,
    });
    render(<DocumentUploadPage />);
    const file = new File(['dummy content'], 'fail.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Document File/i), { target: { files: [file] } });
    fireEvent.click(screen.getByText(/Upload Document/i));
    await waitFor(() => {
      expect(screen.getByText(/Upload Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload failed!/i)).toBeInTheDocument();
    });
  });

  it('shows alert for invalid JSON in metadata', async () => {
    render(<DocumentUploadPage />);
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Document File/i), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/Metadata/i), { target: { value: '{invalidJson: true' } });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.click(screen.getByText(/Upload Document/i));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Invalid JSON in metadata field.');
    });
    alertSpy.mockRestore();
  });
}); 