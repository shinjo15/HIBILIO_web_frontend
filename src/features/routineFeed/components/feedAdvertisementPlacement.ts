export function shouldInsertFeedAdvertisement(index: number, enabled: boolean): boolean {
  return enabled && (index + 1) % 20 === 0;
}
