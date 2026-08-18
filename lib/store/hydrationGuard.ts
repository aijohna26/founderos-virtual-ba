export function shouldApplyHydration(versionAtStart: number, currentVersion: number): boolean {
  return versionAtStart === currentVersion;
}
