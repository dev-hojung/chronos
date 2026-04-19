"use client";

import { useState } from "react";

const features = [
  {
    title: "Context Stack",
    description:
      "쏟아낸 Inbox 메모를 AI가 문맥별로 묶고, 각 묶음의 '다음 할일 1개'를 제안합니다. 되돌리기는 24시간 내 언제든.",
  },
  {
    title: "Living Routines",
    description:
      "루틴의 완료율과 소요시간을 매주 분석해 AI가 자동으로 시간대와 분량을 조정합니다. 마음에 들지 않으면 14일 내 되돌리기.",
  },
  {
    title: "Goal-Gravity",
    description:
      "장기 목표가 오늘 할일에 중력을 행사합니다. 매일 아침 6시, 기여도 높은 항목이 저절로 위로 올라옵니다.",
  },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: POST /waitlist to api
    if (email.trim()) setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-indigo-50 to-white text-zinc-900">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-10 px-6 pb-24 pt-28 text-center">
        <div className="inline-flex items-center rounded-full border border-indigo-200 bg-white/70 px-4 py-1 text-xs font-medium text-indigo-700 shadow-sm">
          Chronos · 모바일 퍼스트 베타 준비 중
        </div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          스스로 일하는 스케줄러,
          <br />
          <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
            Chronos
          </span>
        </h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-600">
          AI가 먼저 정리하고 조정한 뒤, 배너 한 줄로 보고합니다.
          <br />
          마음에 들지 않으면 언제든 되돌릴 수 있습니다.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <h3 className="mb-3 text-lg font-semibold text-indigo-700">
              {f.title}
            </h3>
            <p className="text-sm leading-6 text-zinc-600">{f.description}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-xl px-6 pb-32">
        <div className="rounded-2xl border border-indigo-200 bg-white p-8 shadow-md">
          <h2 className="mb-2 text-xl font-semibold">베타 웨이트리스트</h2>
          <p className="mb-6 text-sm text-zinc-600">
            출시 소식과 초기 사용자 프로모션을 이메일로 받아보세요.
          </p>
          {submitted ? (
            <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800">
              등록되었습니다. 출시 소식 가장 먼저 알려드릴게요.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                받아보기
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} Chronos · 모바일 퍼스트 MVP
      </footer>
    </main>
  );
}
