import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFavoriteRelays } from '@/providers/FavoriteRelaysProvider';

export function AddNewRelaySet() {
  const { createRelaySet } = useFavoriteRelays();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const name = input.trim();
    if (!name) {
      setError('Please enter a name for the relay set');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await createRelaySet(name);
      setInput('');
    } catch (err) {
      setError('Failed to create relay set');
      console.error('Failed to create relay set:', err);
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
          placeholder="Add a new relay set name"
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
          {isLoading ? 'Creating...' : 'Create'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}