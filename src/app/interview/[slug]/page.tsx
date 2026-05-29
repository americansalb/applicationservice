import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { InterviewQuestion } from "@/lib/interviews";
import InterviewClient from "./InterviewClient";

export const dynamic = "force-dynamic";

// Invitation-only: the slug is the access token, so keep these out of search.
export const metadata: Metadata = {
  title: "Interview",
  robots: { index: false, follow: false },
};

export default async function InterviewPage({
  params,
}: {
  params: { slug: string };
}) {
  let template;
  try {
    template = await prisma.interviewTemplate.findUnique({
      where: { slug: params.slug },
      include: { job: { select: { title: true } } },
    });
  } catch (e) {
    console.error("Failed to load interview page:", e);
    throw e;
  }

  if (!template || !template.isActive) notFound();

  const questions = (template.questions as unknown as InterviewQuestion[]) || [];

  return (
    <InterviewClient
      slug={template.slug}
      title={template.title}
      round={template.round}
      roleTitle={template.roleTitle || template.job?.title || null}
      intro={template.intro}
      videoRequired={template.videoRequired}
      questions={questions}
    />
  );
}
