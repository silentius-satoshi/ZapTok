// Utility functions for notification formatting and processing

export const truncateNumber = (amount: number, from?: 1 | 2 | 3 | 4) => {
  const t = 1_000;
  const s = from || 1;

  const l = Math.pow(t, s);

  if (amount < l) {
    return amount.toLocaleString();
  }

  if (amount < Math.pow(t, 2)) {
    return `${Math.floor(amount / t).toLocaleString()}K`;
  }

  if (amount < Math.pow(t, 3)) {
    return `${Math.floor(amount / Math.pow(t, 2)).toLocaleString()}M`
  }

  if (amount < Math.pow(t, 4)) {
    return `${Math.floor(amount / Math.pow(t, 3)).toLocaleString()}B`
  }

  return `1T+`;
};

export const truncateNumber2 = (amount: number, from?: 1 | 2 | 3 | 4) => {
  const t = 1_000;
  const s = from || 1;

  const l = Math.pow(t, s);

  if (amount < l) {
    return amount.toLocaleString();
  }

  if (amount < Math.pow(t, 2)) {
    return `${(amount / t).toFixed(1)}K`;
  }

  if (amount < Math.pow(t, 3)) {
    return `${(amount / Math.pow(t, 2)).toFixed(1)}M`
  }

  if (amount < Math.pow(t, 4)) {
    return `${(amount / Math.pow(t, 3)).toFixed(1)}B`
  }

  return `1T+`;
};

export const truncateNpub = (npub: string) => {
  if (npub.length < 24) {
    return npub;
  }
  return `${npub.slice(0, 15)}..${npub.slice(-10)}`;
};

export const truncateName = (name: string, limit = 20) => {
  if (name.length < limit) {
    return name;
  }
  return `${name.slice(0, limit)}...`;
};

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp * 1000; // Convert to milliseconds
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
};
