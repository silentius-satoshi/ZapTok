// Stub for missing user store - redirects to main cashu store
export * from './cashuStore';
export { useCashuStore as useUserCashuStore } from './cashuStore';

// Additional missing functions
export function clearCashuStoreCache() {
  // Stub function
  console.log('Clear cashu store cache not implemented');
}