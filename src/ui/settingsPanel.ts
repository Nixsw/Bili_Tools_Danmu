export function createConnectApiUrlPatch(connectApiUrlDraft: string) {
  return {
    connectApiUrl: connectApiUrlDraft.trim()
  };
}
