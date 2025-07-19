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

    expect(screen.getByText('Upload Video to Nostr')).toBeInTheDocument();
    expect(screen.getByText('Select a video file')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop or click to browse')).toBeInTheDocument();
  });

  it('shows supported file formats', () => {
    render(
      <TestApp>
        <VideoUploadModal isOpen={true} onClose={() => {}} />
      </TestApp>
    );

    expect(screen.getByText('Supports: MP4, WebM, MOV, AVI (max 100MB)')).toBeInTheDocument();
  });
});
