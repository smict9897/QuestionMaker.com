/** Compact, static counterpart of the homepage brand intro. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none py-1 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/questionmaker-icon.png"
        alt=""
        width={44}
        height={44}
        className="rounded-xl shrink-0"
      />
      <div className="min-w-0">
        <span className="block text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          QuestionMakerBd<span className="text-[#4DB8AC]">.com</span>
        </span>
        <span className="block text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-300">
          Empowering Assessments with AI
        </span>
      </div>
    </div>
  );
}
