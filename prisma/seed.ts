import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("Retard$macker1008", 10);
  await prisma.adminUser.upsert({
    where: { email: "contact@aalb.org" },
    update: { password: hashedPassword },
    create: {
      email: "contact@aalb.org",
      password: hashedPassword,
      name: "AALB Admin",
    },
  });

  // Create sample jobs
  const jobs = [
    {
      title: "Senior Policy Analyst",
      department: "Policy & Advocacy",
      location: "Washington, D.C.",
      type: "Full-time",
      salary: "$95,000 - $125,000",
      description:
        "We are seeking a Senior Policy Analyst to join our Policy & Advocacy team. In this role, you will research, analyze, and develop policy positions on lending regulations and industry standards.\n\nYou will work closely with our government affairs team, member organizations, and industry stakeholders to shape the future of lending policy in the United States.",
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
        "Join our technology team to build and maintain the digital platforms that power AALB's member services, educational programs, and industry data analytics tools.\n\nYou will work on a modern tech stack and have the opportunity to make a direct impact on how lending professionals access resources and connect with each other.",
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
        "AALB's Research & Data team is seeking a Data Analyst to support our industry benchmarking and market research initiatives. You will analyze lending industry trends, produce reports for our members, and contribute to AALB's reputation as a leading source of industry intelligence.",
      requirements:
        "Bachelor's degree in Statistics, Economics, Data Science, or related field\n2+ years of data analysis experience\nProficiency in SQL, Python or R\nExperience with data visualization tools (Tableau, Power BI)\nStrong analytical and critical thinking skills\nExcellent report writing abilities\nExperience in financial services or lending industry a plus",
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
  ];

  for (const job of jobs) {
    await prisma.job.create({ data: job });
  }

  console.log("Database seeded successfully!");
  console.log("Admin login: contact@aalb.org");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
