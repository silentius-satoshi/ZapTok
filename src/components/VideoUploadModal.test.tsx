import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoUploadModal } from './VideoUploadModal';
import { TestApp } from '@/test/TestApp';

// Mock the hooks
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { pubkey: 'test-pubkey' } }),
}));

vi.mock('@/hooks/useUploadFile', () => ({
  useUploadFile: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useNostrPublish', () => ({
  useNostrPublish: () => ({
    mutate: vi.fn(),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('VideoUploadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when closed', () => {
    render(
      <TestApp>
        <VideoUploadModal isOpen={false} onClose={() => {}} />
      </TestApp>
    );

    expect(screen.queryByText('Upload Video to Nostr')).not.toBeInTheDocument();
  });

  it('renders correctly when open', () => {
    render(
      <TestApp>
        <VideoUploadModal isOpen={true} onClose={() => {}} />
      </TestApp>
    );

    // Check for camera upload button (image icon button in bottom left)
    const uploadButton = document.querySelector('button svg');
    expect(uploadButton).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <TestApp>
        <VideoUploadModal isOpen={false} onClose={() => {}} />
      </TestApp>
    );

    // Dialog should not be visible when closed
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
