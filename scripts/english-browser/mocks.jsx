function Link(p) {
  return <a {...p} />;
}
const useRouter = () => ({
  push: (url) => {
    window.lastRoute = url;
  },
});
const generateEnglishPaper = async () => ({ ok: true, key: "mock" });
const saveEnglishPaper = async () => ({
  ok: true,
  updatedAt: new Date().toISOString(),
});
export { Link as default, generateEnglishPaper, saveEnglishPaper, useRouter };

export const listPaperHeaders = async () => ({ ok: true, items: [] });
export const savePaperHeader = async () => ({ ok: false, error: "Mock-only" });
