function Link(p) {
  return <a {...p} />;
}
const useRouter = () => ({
  push: (url) => {
    window.lastRoute = url;
  },
});
const generateEnglishPaper = async () =>
  window.mockGenerationFailure
    ? {
        ok: false,
        error:
          "Generation অসম্পূর্ণ। ১টি সম্পূর্ণ অংশ ব্যক্তিগত recovered draft ও অ্যাডমিনের অনুমোদন তালিকায় সংরক্ষিত আছে। [INVALID_OUTPUT] নিয়ম: prepositions: Wrong subitem count.",
      }
    : { ok: true, key: "mock" };
const saveEnglishPaper = async () => ({
  ok: true,
  updatedAt: new Date().toISOString(),
});
export { Link as default, generateEnglishPaper, saveEnglishPaper, useRouter };

export const listPaperHeaders = async () => ({ ok: true, items: [] });
export const savePaperHeader = async () => ({ ok: false, error: "Mock-only" });
