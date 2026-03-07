export default function DashboardLoading() {
    return (
        <div className="flex flex-col h-full bg-transparent dark:bg-[#1A1A1A] overflow-hidden">
            <div className="flex-1 w-full overflow-y-auto min-h-0 pb-16">
                <div className="w-full 2xl:max-w-[1600px] mx-auto flex flex-col pt-3 sm:pt-4 lg:pt-6 px-4 sm:px-6 lg:px-8 gap-5">

                    {/* 1. Greeting Header Skeleton */}
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-full bg-[#E8E5E0] dark:bg-[#2C2C2C] animate-pulse" />
                        <div className="flex flex-col gap-2">
                            <div className="h-5 w-40 rounded-full bg-[#E8E5E0] dark:bg-[#2C2C2C] animate-pulse" />
                            <div className="h-3 w-24 rounded-full bg-[#F0EDE8] dark:bg-[#252525] animate-pulse" />
                        </div>
                    </div>

                    {/* 2. AI Prompt Bar Skeleton */}
                    <div className="h-12 w-full rounded-2xl bg-[#E8E5E0] dark:bg-[#252525] animate-pulse" />

                    {/* 3. Stats Row Skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                        {/* Study Timer card */}
                        <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 min-h-[88px] flex flex-col justify-between animate-pulse">
                            <div className="h-3 w-24 rounded-full bg-[#E8E5E0] dark:bg-[#383838]" />
                            <div className="flex items-center justify-between mt-2">
                                <div className="h-7 w-20 rounded-full bg-[#E8E5E0] dark:bg-[#383838]" />
                                <div className="w-10 h-10 rounded-full bg-[#E8E5E0] dark:bg-[#383838]" />
                            </div>
                        </div>
                        {/* Tasks Due — hidden on mobile */}
                        <div className="hidden sm:flex bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 min-h-[88px] items-center justify-between animate-pulse">
                            <div className="flex flex-col gap-2">
                                <div className="h-3 w-20 rounded-full bg-[#E8E5E0] dark:bg-[#383838]" />
                                <div className="h-7 w-10 rounded-full bg-[#E8E5E0] dark:bg-[#383838]" />
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333]" />
                        </div>
                        {/* Revision Due — mobile combined card */}
                        <div className="sm:hidden bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-3.5 min-h-[88px] flex flex-col gap-2 animate-pulse">
                            <div className="h-3 w-16 rounded-full bg-[#E8E5E0] dark:bg-[#383838]" />
                            <div className="flex gap-3 mt-1">
                                <div className="h-8 w-20 rounded-xl bg-[#E8E5E0] dark:bg-[#383838]" />
                                <div className="h-8 w-20 rounded-xl bg-[#F0EDE8] dark:bg-[#2C2C2C]" />
                            </div>
                        </div>
                        <div className="hidden sm:flex bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 min-h-[88px] items-center justify-between animate-pulse">
                            <div className="flex flex-col gap-2">
                                <div className="h-3 w-24 rounded-full bg-[#E8E5E0] dark:bg-[#383838]" />
                                <div className="h-7 w-10 rounded-full bg-[#E8E5E0] dark:bg-[#383838]" />
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333]" />
                        </div>
                    </div>

                    {/* 4. Recent Activity Skeleton */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-1">
                            <div className="w-4 h-4 rounded-full bg-[#E8E5E0] dark:bg-[#2C2C2C] animate-pulse" />
                            <div className="h-3 w-28 rounded-full bg-[#E8E5E0] dark:bg-[#2C2C2C] animate-pulse" />
                        </div>
                        <div className="flex gap-3 overflow-hidden pb-1 px-1">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="min-w-[240px] h-[72px] bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-2xl px-4 py-3.5 flex items-center gap-3 animate-pulse shrink-0">
                                    <div className="w-10 h-10 rounded-xl bg-[#E8E5E0] dark:bg-[#383838] flex-shrink-0" />
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="h-3.5 rounded-full bg-[#E8E5E0] dark:bg-[#383838] w-3/4" />
                                        <div className="h-2.5 rounded-full bg-[#F0EDE8] dark:bg-[#2C2C2C] w-1/3" />
                                    </div>
                                    <div className="h-5 w-12 rounded-full bg-[#F0EDE8] dark:bg-[#2C2C2C] flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 5. To-Do + Tasks Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* To-Do Card */}
                        <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 flex flex-col gap-3">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-[#E8E5E0] dark:bg-[#383838] animate-pulse" />
                                    <div className="h-4 w-20 rounded-full bg-[#E8E5E0] dark:bg-[#383838] animate-pulse" />
                                </div>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3].map(j => (
                                        <div key={j} className="h-6 w-12 rounded-full bg-[#F0EDE8] dark:bg-[#2C2C2C] animate-pulse" />
                                    ))}
                                </div>
                            </div>
                            {/* Todo rows */}
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#E8E5E0] dark:border-[#3C3C3C] bg-white/80 backdrop-blur-md dark:bg-[#252525] animate-pulse">
                                    <div className="w-4 h-4 rounded-full bg-[#E8E5E0] dark:bg-[#383838] flex-shrink-0" />
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <div className={`h-3 rounded-full bg-[#E8E5E0] dark:bg-[#383838] ${i % 2 === 0 ? "w-2/3" : "w-3/4"}`} />
                                        <div className="h-2 rounded-full bg-[#F0EDE8] dark:bg-[#2C2C2C] w-1/4" />
                                    </div>
                                    <div className="w-5 h-5 rounded bg-[#F0EDE8] dark:bg-[#2C2C2C] flex-shrink-0" />
                                </div>
                            ))}
                        </div>

                        {/* Tasks Card */}
                        <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 flex flex-col gap-3">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-[#E8E5E0] dark:bg-[#383838] animate-pulse" />
                                    <div className="h-4 w-28 rounded-full bg-[#E8E5E0] dark:bg-[#383838] animate-pulse" />
                                </div>
                                <div className="h-6 w-16 rounded-full bg-[#F0EDE8] dark:bg-[#2C2C2C] animate-pulse" />
                            </div>
                            {/* Task rows */}
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E5E0] dark:border-[#545454] animate-pulse">
                                    <div className="w-5 h-5 rounded-full bg-[#E8E5E0] dark:bg-[#383838] flex-shrink-0" />
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <div className={`h-3 rounded-full bg-[#E8E5E0] dark:bg-[#383838] ${i % 2 === 0 ? "w-1/2" : "w-2/3"}`} />
                                        <div className="h-2 rounded-full bg-[#F0EDE8] dark:bg-[#2C2C2C] w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
