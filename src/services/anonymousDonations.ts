/**
 * Anonymous Donation Tracker
 * 
 * Tracks anonymous Lightning donations in sessionStorage.
 * Data persists across page refreshes but clears when browser closes.
 */

export interface AnonymousDonation {
  id: string; // Unique identifier (timestamp-based)
  amount: number; // Amount in sats
  timestamp: number; // Unix timestamp
  invoice: string; // Lightning invoice (for deduplication)
}

const STORAGE_KEY = 'zaptok_anonymous_donations';

class AnonymousDonationTracker {
  private static instance: AnonymousDonationTracker;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AnonymousDonationTracker {
    if (!AnonymousDonationTracker.instance) {
      AnonymousDonationTracker.instance = new AnonymousDonationTracker();
    }
    return AnonymousDonationTracker.instance;
  }

  /**
   * Add a new anonymous donation
   */
  addDonation(amount: number, invoice: string): void {
    const donations = this.loadDonations();
    
    // Check if this invoice already exists (prevent duplicates)
    const exists = donations.some(d => d.invoice === invoice);
    if (exists) {
      return;
    }

    const newDonation: AnonymousDonation = {
      id: `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount,
      timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
      invoice
    };

    donations.push(newDonation);
    this.saveDonations(donations);
  }

  /**
   * Get all anonymous donations, sorted by timestamp (newest first)
   */
  getDonations(): AnonymousDonation[] {
    const donations = this.loadDonations();
    return donations.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get total amount donated anonymously
   */
  getTotalAmount(): number {
    const donations = this.loadDonations();
    return donations.reduce((sum, d) => sum + d.amount, 0);
  }

  /**
   * Get count of anonymous donations
   */
  getCount(): number {
    return this.loadDonations().length;
  }

  /**
   * Clear all anonymous donations (for testing or user request)
   */
  clearDonations(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear anonymous donations:', error);
    }
  }

  /**
   * Load donations from sessionStorage
   */
  private loadDonations(): AnonymousDonation[] {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to load anonymous donations:', error);
      return [];
    }
  }

  /**
   * Save donations to sessionStorage
   */
  private saveDonations(donations: AnonymousDonation[]): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(donations));
    } catch (error) {
      console.warn('Failed to save anonymous donations:', error);
    }
  }
}

export const anonymousDonationTracker = AnonymousDonationTracker.getInstance();
