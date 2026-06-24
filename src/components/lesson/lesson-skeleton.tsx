import { Skeleton } from "@heroui/react";

/**
 * Genuine-loading placeholder for the lesson player, used while the profile /
 * progress / lesson data are still fetching (e.g. a direct load or refresh on a
 * lesson URL). Mirrors the {@link LessonShell} frame so the layout doesn't jump
 * once content arrives. The branded Rive animation is reserved for the
 * deliberate map → lesson transition.
 */
export function LessonSkeleton() {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      {/* Top bar: close + progress + trailing stat. */}
      <div className="flex items-center gap-4 px-3 py-3 sm:px-6 md:px-10 xl:px-12">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-3 flex-1 rounded-full" />
        <Skeleton className="h-8 w-14 rounded-lg" />
      </div>

      {/* Bordered stage (matches LessonShell). */}
      <main className="flex min-h-0 flex-1 px-3 pb-3 pt-3 sm:px-6 sm:pb-6 md:px-10 md:pb-8 md:pt-4 xl:px-12">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[24px] border-2 border-[color:var(--lesson-frame)] sm:rounded-[28px]">
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-6 sm:py-8">
            <div className="m-auto flex w-full max-w-3xl flex-col items-center gap-8">
              {/* Prompt. */}
              <div className="flex w-full max-w-md flex-col items-center gap-2.5">
                <Skeleton className="h-5 w-4/5 rounded-lg" />
                <Skeleton className="h-5 w-3/5 rounded-lg" />
              </div>

              {/* Figure. */}
              <Skeleton className="size-48 rounded-2xl" />

              {/* Answer choices. */}
              <div className="flex w-full max-w-md flex-col gap-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            </div>
          </div>

          {/* Footer CTA. */}
          <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
            <Skeleton className="mx-auto h-12 w-full max-w-44 rounded-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
