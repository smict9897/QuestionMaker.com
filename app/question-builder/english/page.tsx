import EnglishSetup from "@/components/english-setup";
export const metadata = { title: "English printable paper — 2027 practice" };
export default async function EnglishPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; paper?: string }>;
}) {
  const p = await searchParams;
  const grade = Number(p.grade),
    paper = Number(p.paper);
  return (
    <EnglishSetup
      initialGrade={
        grade >= 6 && grade <= 12 && Number.isInteger(grade) ? grade : 6
      }
      initialPaper={paper === 2 ? 2 : 1}
    />
  );
}
