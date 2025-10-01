import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFavoriteRelays } from '@/providers/FavoriteRelaysProvider';
import { normalizeUrl, isWebsocketUrl } from '@/lib/relayUtils';

export function AddNewRelay() {
  const { addFavoriteRelays, favoriteRelays } = useFavoriteRelays();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const normalizedUrl = normalizeUrl(input.trim());
    
    if (!isWebsocketUrl(normalizedUrl)) {
      setError('Please enter a valid WebSocket URL');
      return;
    }

    if (favoriteRelays.includes(normalizedUrl)) {
      setError('This relay is already in your favorites');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await addFavoriteRelays([normalizedUrl]);
      setInput('');
    } catch (err) {
      setError('Failed to add relay');
      console.error('Failed to add relay:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Add a new relay (e.g., wss://relay.example.com)"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={error ? 'border-destructive' : ''}
          disabled={isLoading}
        />
        <Button 
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? 'Adding...' : 'Add'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}