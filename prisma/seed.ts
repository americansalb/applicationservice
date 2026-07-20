import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Remove the legacy default admin account.
  await prisma.adminUser.deleteMany({ where: { email: "admin@aalb.org" } });

  // Admin credentials come from the environment (see README). If ADMIN_PASSWORD
  // is unset, existing admin users are left untouched so a redeploy can't lock
  // anyone out — but no credentials are ever hardcoded here.
  const adminEmail = process.env.ADMIN_EMAIL || "contact@aalb.org";
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { password: hashedPassword },
      create: {
        email: adminEmail,
        password: hashedPassword,
        name: "AALB Admin",
      },
    });
  } else {
    const existing = await prisma.adminUser.findUnique({
      where: { email: adminEmail },
    });
    if (!existing) {
      console.warn(
        `No admin user found for ${adminEmail} and ADMIN_PASSWORD is not set — ` +
          "set ADMIN_EMAIL / ADMIN_PASSWORD to create the admin login on boot."
      );
    }
  }

  // Hardcoded platform DEVELOPER (kevin@aalb.org), claimable once via
  // /portal/claim. Created only if absent so a re-seed never clobbers a
  // password he has already set.
  try {
    const bootstrapEmail = "kevin@aalb.org";
    const existingDev = await prisma.appUser.findUnique({
      where: { email: bootstrapEmail },
    });
    if (!existingDev) {
      const randomPw = await bcrypt.hash(randomUUID() + randomUUID(), 12);
      await prisma.appUser.create({
        data: {
          email: bootstrapEmail,
          password: randomPw,
          name: "Kevin Thakkar",
          role: "DEVELOPER",
          mustChangePassword: true,
        },
      });
      console.log(
        `Bootstrap developer created: ${bootstrapEmail} (claim at /portal/claim)`
      );
    } else if (
      /^(1|true|yes)$/i.test(process.env.DEV_BOOTSTRAP_RESET || "") &&
      !existingDev.mustChangePassword
    ) {
      // Recovery hatch: re-arm the one-time claim so the developer can set a
      // new password at /portal/claim again. The claim itself stays gated by
      // the setup password (DEV_BOOTSTRAP_PASSWORD). Only fires when the
      // account is currently claimed, so leaving the flag on across redeploys
      // won't keep regenerating an already-armed account.
      //
      // IMPORTANT: unset DEV_BOOTSTRAP_RESET after re-claiming, or the next
      // deploy will reset the password you just set.
      const randomPw = await bcrypt.hash(randomUUID() + randomUUID(), 12);
      await prisma.appUser.update({
        where: { id: existingDev.id },
        data: { password: randomPw, mustChangePassword: true },
      });
      console.log(
        `DEV_BOOTSTRAP_RESET: re-armed ${bootstrapEmail} — set a new password ` +
          "at /portal/claim, then remove the DEV_BOOTSTRAP_RESET env var."
      );
    }
  } catch (e) {
    console.warn(
      "Skipped bootstrap developer seed:",
      e instanceof Error ? e.message : e
    );
  }

  // Create sample jobs
  const jobs = [
    {
      title: "Senior Policy Analyst",
      department: "Policy & Advocacy",
      location: "Washington, D.C.",
      type: "Full-time",
      salary: "$95,000 - $125,000",
      description:
        "We are seeking a Senior Policy Analyst to join our Policy & Advocacy team. In this role, you will research, analyze, and develop policy positions on language access regulations and industry standards.\n\nYou will work closely with our government affairs team, member organizations, and industry stakeholders to shape the future of language accessibility policy in the United States.",
      requirements:
        "Bachelor's degree in Public Policy, Economics, or related field\nMaster's degree preferred\n5+ years of experience in policy analysis or government affairs\nStrong understanding of financial services regulation\nExcellent written and verbal communication skills\nAbility to analyze complex legislation and regulatory proposals\nExperience working with congressional staff or regulatory agencies",
      benefits:
        "Comprehensive health, dental, and vision insurance\n401(k) with 6% employer match\nFlexible hybrid work schedule\n20 days PTO + federal holidays\nProfessional development budget\nMetro transit subsidy",
    },
    {
      title: "Marketing & Communications Manager",
      department: "Marketing",
      location: "Washington, D.C. (Hybrid)",
      type: "Full-time",
      salary: "$80,000 - $105,000",
      description:
        "AALB is looking for a creative and strategic Marketing & Communications Manager to lead our brand presence and member communications. You will develop and execute marketing campaigns, manage our digital presence, and create compelling content that advances our mission.\n\nThis role is ideal for someone who is passionate about storytelling and has experience in the financial services or association space.",
      requirements:
        "Bachelor's degree in Marketing, Communications, or related field\n4+ years of marketing experience, preferably in associations or financial services\nExperience with email marketing platforms and CMS systems\nStrong writing and editing skills\nFamiliarity with social media management and analytics\nExperience managing external vendors and agencies",
      benefits:
        "Comprehensive health, dental, and vision insurance\n401(k) with 6% employer match\nFlexible hybrid work schedule (3 days in office)\n20 days PTO + federal holidays\nProfessional development budget",
    },
    {
      title: "Full-Stack Software Engineer",
      department: "Technology",
      location: "Remote (US)",
      type: "Full-time",
      salary: "$110,000 - $145,000",
      description:
        "Join our technology team to build and maintain the digital platforms that power AALB's member services, educational programs, and industry data analytics tools.\n\nYou will work on a modern tech stack and have the opportunity to make a direct impact on how communities access language resources and connect with each other.",
      requirements:
        "Bachelor's degree in Computer Science or equivalent experience\n3+ years of full-stack development experience\nProficiency in React, TypeScript, and Node.js\nExperience with relational databases (PostgreSQL preferred)\nFamiliarity with cloud platforms (AWS or Azure)\nExperience with REST APIs and modern development practices\nStrong problem-solving skills and attention to detail",
      benefits:
        "Comprehensive health, dental, and vision insurance\n401(k) with 6% employer match\nFully remote with optional D.C. office access\n25 days PTO + federal holidays\n$2,000 annual learning stipend\nHome office equipment allowance",
    },
    {
      title: "Member Services Coordinator",
      department: "Member Services",
      location: "Washington, D.C.",
      type: "Full-time",
      salary: "$55,000 - $68,000",
      description:
        "We are looking for a detail-oriented Member Services Coordinator to serve as the primary point of contact for our member organizations. You will manage member inquiries, coordinate events, and ensure an excellent member experience.\n\nThis is a great opportunity for someone early in their career who wants to grow within a mission-driven organization.",
      requirements:
        "Bachelor's degree or equivalent experience\n1-3 years of customer service or member relations experience\nExcellent organizational and multitasking skills\nStrong interpersonal and communication skills\nProficiency in Microsoft Office and CRM systems\nAbility to work occasional evenings for member events",
      benefits:
        "Comprehensive health, dental, and vision insurance\n401(k) with 4% employer match\n15 days PTO + federal holidays\nProfessional development opportunities\nMetro transit subsidy",
    },
    {
      title: "Data Analyst - Industry Research",
      department: "Research & Data",
      location: "Washington, D.C. (Hybrid)",
      type: "Full-time",
      salary: "$75,000 - $95,000",
      description:
        "AALB's Research & Data team is seeking a Data Analyst to support our industry benchmarking and market research initiatives. You will analyze language access trends, produce reports for our members, and contribute to AALB's reputation as a leading source of industry intelligence.",
      requirements:
        "Bachelor's degree in Statistics, Economics, Data Science, or related field\n2+ years of data analysis experience\nProficiency in SQL, Python or R\nExperience with data visualization tools (Tableau, Power BI)\nStrong analytical and critical thinking skills\nExcellent report writing abilities\nExperience in language services or nonprofit sector a plus",
      benefits:
        "Comprehensive health, dental, and vision insurance\n401(k) with 6% employer match\nFlexible hybrid work schedule\n20 days PTO + federal holidays\nConference attendance opportunities",
    },
    {
      title: "Events & Conference Intern",
      department: "Events",
      location: "Washington, D.C.",
      type: "Part-time",
      salary: "$20/hour",
      description:
        "AALB is seeking an enthusiastic Events & Conference Intern to support the planning and execution of our annual conference and regional events. This is a paid internship ideal for students or recent graduates interested in event management and the association industry.",
      requirements:
        "Currently enrolled in or recently graduated from a Bachelor's program\nStrong organizational skills and attention to detail\nAbility to work in a fast-paced environment\nExcellent communication skills\nProficiency in Google Workspace or Microsoft Office\nAvailability to work some evenings and weekends during events",
      benefits:
        "Paid internship ($20/hour)\nFlexible schedule around classes\nNetworking opportunities with industry leaders\nPotential for full-time offer upon completion",
    },
    {
      title: "Skills Lab Leader",
      department: "Programs",
      location: "Mexico City / Remote",
      type: "Full-time",
      salary: "Competitive",
      description:
        "Lead AALB's Skills Lab — hands-on training programs that help language professionals build interpretation, translation, and cross-cultural competency skills. You'll design curriculum, facilitate live sessions, mentor participants, and measure learning outcomes.\n\nThis is an invitation-only round 2. If you have been invited, complete the self-paced video interview and (if applicable) book your in-person session in Mexico City using the links provided in your invitation email.",
      requirements:
        "Demonstrated experience designing and running training or skills-development sessions\nStrong facilitation and mentoring skills\nAbility to assess learner competency, not just completion\nExcellent written and verbal communication\nFluent in Spanish and English\nExperience in language services, education, or related fields",
      benefits:
        "Competitive compensation\nProfessional development budget\nFlexible work arrangement\nOpportunity to shape AALB's flagship training program",
    },
  ];

  for (const job of jobs) {
    const existing = await prisma.job.findFirst({ where: { title: job.title } });
    if (!existing) {
      await prisma.job.create({ data: job });
    }
  }

  // ---------------------------------------------------------------------------
  // Sample hiring pipeline: Skills Lab Leader, three rounds.
  //   Round 1  Screening        self-paced, quick, optional video intro
  //   Round 2  Competency        self-paced, a recorded answer to each question
  //   Round 3  Live skills session  in-person in Mexico City (booked from invite)
  //
  // Seeded idempotently (upsert by slug) so a redeploy refreshes the content
  // without duplicating rounds. The pipeline helpers (firstRoundForJob /
  // nextRoundForJob) advance a candidate through them by ascending `round`.
  // ---------------------------------------------------------------------------
  const skillsLabJob = await prisma.job.findFirst({
    where: { title: "Skills Lab Leader" },
  });
  if (skillsLabJob) {
    const rounds = [
      {
        slug: "skills-lab-leader-round-1",
        title: "Skills Lab Leader — Screening",
        round: 1,
        format: "self_paced",
        videoRequired: false,
        liveConfig: null as Record<string, string> | null,
        intro:
          "Welcome! This is a short screening for the Skills Lab Leader role — a few quick questions and an optional 60-second video intro. It takes about five minutes and there are no wrong answers; we just want to get to know you.",
        config: { captureMode: "per_question", maxSubmissions: 1 },
        questions: [
          {
            id: "q1",
            type: "text",
            prompt: "In a sentence or two, why do you want to lead AALB's Skills Lab?",
            required: true,
          },
          {
            id: "q2",
            type: "multiple_choice",
            prompt:
              "How many years have you designed or facilitated training / skills sessions?",
            options: ["Less than 1 year", "1–3 years", "3–5 years", "5+ years"],
            required: true,
          },
          {
            id: "q3",
            type: "multiple_choice",
            prompt: "How would you describe your Spanish and English fluency?",
            options: [
              "Fluent in both",
              "Fluent in one, conversational in the other",
              "Conversational in both",
            ],
            required: true,
          },
          {
            id: "q4",
            type: "video",
            prompt:
              "Record a 60-second introduction — who you are and one thing you love teaching.",
            required: false,
            maxDurationSec: 90,
            maxTakes: 3,
            prepTimeSec: 15,
            allowReview: true,
          },
        ],
      },
      {
        slug: "skills-lab-leader-round-2",
        title: "Skills Lab Leader — Competency Interview",
        round: 2,
        format: "self_paced",
        videoRequired: true,
        liveConfig: null as Record<string, string> | null,
        intro:
          "You've advanced to the competency interview. Please record a short video answer to each of the five questions below. You can prepare briefly and re-record within the limits shown — aim for two to three minutes per answer.",
        config: { captureMode: "per_question", maxSubmissions: 1 },
        questions: [
          {
            id: "q1",
            type: "video",
            prompt:
              "Walk us through a training session you designed and ran. What were the learning outcomes and how did you measure them?",
            required: true,
            maxDurationSec: 180,
            maxTakes: 2,
            prepTimeSec: 30,
            allowReview: true,
          },
          {
            id: "q2",
            type: "video",
            prompt:
              "Describe a time you had to adapt a session in real time because participants weren't engaging. What did you do?",
            required: true,
            maxDurationSec: 180,
            maxTakes: 2,
            prepTimeSec: 30,
            allowReview: true,
          },
          {
            id: "q3",
            type: "video",
            prompt:
              "How do you measure whether a Skills Lab participant has actually built competency vs. just completed the activities?",
            required: true,
            maxDurationSec: 180,
            maxTakes: 2,
            prepTimeSec: 30,
            allowReview: true,
          },
          {
            id: "q4",
            type: "video",
            prompt:
              "Tell us about a challenging participant you worked with and how you handled it.",
            required: true,
            maxDurationSec: 180,
            maxTakes: 2,
            prepTimeSec: 30,
            allowReview: true,
          },
          {
            id: "q5",
            type: "video",
            prompt: "Why this role at AALB specifically?",
            required: true,
            maxDurationSec: 180,
            maxTakes: 2,
            prepTimeSec: 30,
            allowReview: true,
          },
        ],
      },
      {
        slug: "skills-lab-leader-round-3",
        title: "Skills Lab Leader — Live Skills Session",
        round: 3,
        format: "live",
        videoRequired: false,
        liveConfig: {
          location: "Mexico City",
          timezone: "America/Mexico_City",
          bookingSlug: "mexico-city-skills-lab",
        },
        intro:
          "Congratulations on reaching the final round — a live skills session in Mexico City. Use the link in your invitation to book a time. Below, tell us anything we should prepare for and what you'll demonstrate.",
        config: { captureMode: "per_question", maxSubmissions: 1 },
        questions: [
          {
            id: "q1",
            type: "text",
            prompt:
              "Anything we should know before your in-person session? (accessibility needs, travel constraints, timing)",
            required: false,
          },
          {
            id: "q2",
            type: "text",
            prompt:
              "Briefly, what will you focus on in your live 20-minute skills demonstration?",
            required: true,
          },
        ],
      },
    ];

    for (const r of rounds) {
      const data = {
        title: r.title,
        round: r.round,
        format: r.format,
        roleTitle: "Skills Lab Leader",
        intro: r.intro,
        videoRequired: r.videoRequired,
        questions: r.questions,
        config: r.config,
        liveConfig: r.liveConfig ?? undefined,
        isActive: true,
        jobId: skillsLabJob.id,
      };
      await prisma.interviewTemplate.upsert({
        where: { slug: r.slug },
        update: data,
        create: { slug: r.slug, ...data },
      });
    }
    console.log(
      `Seeded Skills Lab Leader pipeline: ${rounds.length} rounds (${rounds
        .map((r) => r.slug)
        .join(", ")})`
    );
  }

  console.log("Database seeded successfully!");
  console.log(`Admin login: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
