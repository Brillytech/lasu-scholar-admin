import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  ListChecks,
  RefreshCw,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { getAnalyticsData } from "../services/analytics";

export default function Analytics() {
  const [data, setData] = useState<any>({
    profiles: [],
    courses: [],
    topics: [],
    questions: [],
    materials: [],
    practiceAttempts: [],
    examAttempts: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const result = await getAnalyticsData();
      setData(result);
    } catch (error: any) {
      alert(error.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const practiceAverage =
      data.practiceAttempts.length > 0
        ? Math.round(
            data.practiceAttempts.reduce(
              (sum: number, item: any) => sum + (item.score_percent || 0),
              0
            ) / data.practiceAttempts.length
          )
        : 0;

    const examAverage =
      data.examAttempts.length > 0
        ? Math.round(
            data.examAttempts.reduce(
              (sum: number, item: any) => sum + (item.score_percent || 0),
              0
            ) / data.examAttempts.length
          )
        : 0;

    const bestPractice =
      data.practiceAttempts.length > 0
        ? Math.max(
            ...data.practiceAttempts.map(
              (item: any) => item.score_percent || 0
            )
          )
        : 0;

    const bestExam =
      data.examAttempts.length > 0
        ? Math.max(
            ...data.examAttempts.map((item: any) => item.score_percent || 0)
          )
        : 0;

    return {
      students: data.profiles.length,
      courses: data.courses.length,
      topics: data.topics.length,
      questions: data.questions.length,
      materials: data.materials.length,
      practiceAttempts: data.practiceAttempts.length,
      examAttempts: data.examAttempts.length,
      practiceAverage,
      examAverage,
      bestPractice,
      bestExam,
    };
  }, [data]);

  const courseQuestionStats = useMemo(() => {
    return data.courses
      .map((course: any) => {
        const questionCount = data.questions.filter(
          (q: any) => q.course_id === course.id
        ).length;

        const topicCount = data.topics.filter(
          (t: any) => t.course_id === course.id
        ).length;

        const materialCount = data.materials.filter(
          (m: any) => m.course_id === course.id
        ).length;

        return {
          ...course,
          questionCount,
          topicCount,
          materialCount,
        };
      })
      .sort((a: any, b: any) => b.questionCount - a.questionCount)
      .slice(0, 10);
  }, [data]);

  const topPracticeCourses = useMemo(() => {
    const grouped: Record<string, any> = {};

    data.practiceAttempts.forEach((attempt: any) => {
      const key = attempt.course_id || "unknown";

      if (!grouped[key]) {
        grouped[key] = {
          course: attempt.courses,
          attempts: 0,
          totalScore: 0,
        };
      }

      grouped[key].attempts += 1;
      grouped[key].totalScore += attempt.score_percent || 0;
    });

    return Object.values(grouped)
      .map((item: any) => ({
        ...item,
        average: item.attempts ? Math.round(item.totalScore / item.attempts) : 0,
      }))
      .sort((a: any, b: any) => b.attempts - a.attempts)
      .slice(0, 8);
  }, [data]);

  const topExamCourses = useMemo(() => {
    const grouped: Record<string, any> = {};

    data.examAttempts.forEach((attempt: any) => {
      const key = attempt.course_id || "unknown";

      if (!grouped[key]) {
        grouped[key] = {
          course: attempt.courses,
          attempts: 0,
          totalScore: 0,
        };
      }

      grouped[key].attempts += 1;
      grouped[key].totalScore += attempt.score_percent || 0;
    });

    return Object.values(grouped)
      .map((item: any) => ({
        ...item,
        average: item.attempts ? Math.round(item.totalScore / item.attempts) : 0,
      }))
      .sort((a: any, b: any) => b.attempts - a.attempts)
      .slice(0, 8);
  }, [data]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            System Intelligence
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Track content growth, student activity, practice performance and exam outcomes.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh Analytics
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Students"
          value={stats.students}
          icon={Users}
          color="bg-blue-500/10 text-blue-500"
          loading={loading}
        />
        <SummaryCard
          label="Courses"
          value={stats.courses}
          icon={BookOpen}
          color="bg-orange/10 text-orange"
          loading={loading}
        />
        <SummaryCard
          label="Questions"
          value={stats.questions}
          icon={ListChecks}
          color="bg-green-500/10 text-green-500"
          loading={loading}
        />
        <SummaryCard
          label="Materials"
          value={stats.materials}
          icon={FileText}
          color="bg-purple-500/10 text-purple-500"
          loading={loading}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Practice Attempts"
          value={stats.practiceAttempts}
          icon={Activity}
          color="bg-yellow-500/10 text-yellow-500"
          loading={loading}
        />
        <SummaryCard
          label="Exam Attempts"
          value={stats.examAttempts}
          icon={GraduationCap}
          color="bg-red-500/10 text-red-500"
          loading={loading}
        />
        <SummaryCard
          label="Practice Avg"
          value={`${stats.practiceAverage}%`}
          icon={Target}
          color="bg-indigo-500/10 text-indigo-500"
          loading={loading}
        />
        <SummaryCard
          label="Exam Avg"
          value={`${stats.examAverage}%`}
          icon={Trophy}
          color="bg-pink-500/10 text-pink-500"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Course Content Health" subtitle="Top courses by question volume">
          <div className="space-y-3">
            {loading ? (
              <LoadingList />
            ) : courseQuestionStats.length === 0 ? (
              <Empty text="No course content yet." />
            ) : (
              courseQuestionStats.map((course: any) => (
                <div
                  key={course.id}
                  className="rounded-3xl border border-orange/10 bg-soft p-4 dark:border-white/10 dark:bg-slate-950/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-navy dark:text-white">
                        {course.code}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                        {course.title}
                      </p>
                    </div>

                    <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-black text-orange">
                      {course.questionCount} Questions
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-bold text-slate-600">
                    <Info label="Topics" value={course.topicCount} />
                    <Info label="Materials" value={course.materialCount} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Practice Activity" subtitle="Courses students practice most">
          <div className="space-y-3">
            {loading ? (
              <LoadingList />
            ) : topPracticeCourses.length === 0 ? (
              <Empty text="No practice data yet." />
            ) : (
              topPracticeCourses.map((item: any, index: number) => (
                <RankItem
                  key={index}
                  rank={index + 1}
                  title={item.course?.code || "Unknown Course"}
                  subtitle={`${item.attempts} attempts`}
                  value={`${item.average}% avg`}
                />
              ))
            )}
          </div>
        </Panel>

        <Panel title="Exam Activity" subtitle="Courses with exam attempts">
          <div className="space-y-3">
            {loading ? (
              <LoadingList />
            ) : topExamCourses.length === 0 ? (
              <Empty text="No exam data yet." />
            ) : (
              topExamCourses.map((item: any, index: number) => (
                <RankItem
                  key={index}
                  rank={index + 1}
                  title={item.course?.code || "Unknown Course"}
                  subtitle={`${item.attempts} attempts`}
                  value={`${item.average}% avg`}
                />
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-navy p-6 text-white shadow-xl dark:bg-white/10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
          Admin Insight
        </p>
        <h3 className="mt-3 text-2xl font-black">
          LASU Scholar content system is now measurable.
        </h3>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/70">
          As students use Study, Practice and Exam Mode, this page will reveal which courses are active,
          where students are struggling, and where new materials or question banks are needed.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InsightPill label="Best Practice" value={`${stats.bestPractice}%`} />
          <InsightPill label="Best Exam" value={`${stats.bestExam}%`} />
          <InsightPill label="Topics" value={String(stats.topics)} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, loading }: any) {
  return (
    <div className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10">
      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl ${color}`}>
        <Icon size={21} />
      </div>

      {loading ? (
        <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-100 dark:bg-white/10" />
      ) : (
        <p className="text-3xl font-black text-navy dark:text-white">{value}</p>
      )}

      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
        {label}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <h3 className="text-xl font-black text-navy dark:text-white">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
        {subtitle}
      </p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 dark:bg-white/10">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-black text-navy dark:text-white">{value}</p>
    </div>
  );
}

function RankItem({
  rank,
  title,
  subtitle,
  value,
}: {
  rank: number;
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl bg-soft p-4 dark:bg-slate-950/50">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-r from-orange to-amber-500 text-sm font-black text-white shadow-lg shadow-orange-500/20">
          {rank}
        </div>

        <div className="min-w-0">
          <p className="truncate font-black text-navy dark:text-white">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
            {subtitle}
          </p>
        </div>
      </div>

      <span className="shrink-0 rounded-full bg-orange/10 px-3 py-1 text-xs font-black text-orange">
        {value}
      </span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-soft p-8 text-center dark:bg-slate-950/50">
      <BarChart3 className="mx-auto text-orange" size={28} />
      <p className="mt-3 text-sm font-black text-navy dark:text-white">{text}</p>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-20 animate-pulse rounded-3xl bg-soft dark:bg-white/10"
        />
      ))}
    </div>
  );
}

function InsightPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-orange">{value}</p>
    </div>
  );
}
