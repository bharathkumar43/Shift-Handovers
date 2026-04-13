import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const contentClients = [
  "Syndis",
  "Washington Post",
  "Nom Nom",
  "Travelier (BookAway)",
  "Renovus Capital",
  "Tunnel to Towers",
  "Ole Smoky",
  "Ceribell",
  "ELC Beauty (Estee)",
  "KnoxCounty",
  "Michigan Economic",
  "Chryselis",
  "Tellepsen",
  "B&B Electric",
  "Armstrong",
  "Convex",
  "Corc Systems",
  "Vatica Content",
  "Duet Resource",
  "Cumulous Global",
  "Peak Mining",
  "PDF Solutions",
  "CEG",
  "Vendasta",
  "Future Range",
  "Epiq",
  "Duncan Group",
  "Cadence",
];

const emailClients = [
  "Syndis",
  "Nom Nom",
  "Travelier (BookAway)",
  "Tech Wizards",
  "Duncan Group",
  "Peak Mining",
  "Cumulus Global",
  "PDF",
  "KnoxCounty",
  "Vatica Email",
  "Rocco Forte",
  "I Support The Girls",
];

const messagingClients = [
  "Tracelink-1",
  "Tracelink-2",
  "Nooks",
  "Marketcast",
  "NP Nutra",
  "Mercado Libre-1",
  "Mercado Libre-2",
  "Mercado Libre-3",
  "Mercado Libre-4",
  "Mercado Libre-5",
  "Rocco Forte & Family",
  "Manhattan Associates-1",
  "Manhattan Associates-2",
  "Apteco",
  "NFL",
  "VRSI",
  "PeakMining (FTI Consulting)",
  "PDF Messaging",
  "SLR Consulting",
];

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@cloudfuze.com" },
    update: {},
    create: {
      email: "admin@cloudfuze.com",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  // Duty Manager
  await prisma.user.upsert({
    where: { email: "bharath.tummaganti@cloudfuze.com" },
    update: { role: "ADMIN" },
    create: {
      email: "bharath.tummaganti@cloudfuze.com",
      name: "Bharath Tummaganti",
      password: "",
      role: "ADMIN",
    },
  });

  const contentProject = await prisma.project.upsert({
    where: { name: "Content" },
    update: {},
    create: {
      name: "Content",
      shift1Timing: "5:00 AM - 2:00 PM",
      shift2Timing: "1:00 PM - 10:00 PM",
      shift3Timing: "9:00 PM - 6:00 AM",
    },
  });

  const emailProject = await prisma.project.upsert({
    where: { name: "Email" },
    update: {},
    create: {
      name: "Email",
      shift1Timing: "6:00 AM - 2:00 PM",
      shift2Timing: "2:00 PM - 10:00 PM",
      shift3Timing: "10:00 PM - 6:00 AM",
    },
  });

  const messagingProject = await prisma.project.upsert({
    where: { name: "Messaging" },
    update: {},
    create: {
      name: "Messaging",
      shift1Timing: "6:00 AM - 2:00 PM",
      shift2Timing: "2:00 PM - 10:00 PM",
      shift3Timing: "10:00 PM - 6:00 AM",
    },
  });

  for (let i = 0; i < contentClients.length; i++) {
    await prisma.client.upsert({
      where: {
        name_projectId: { name: contentClients[i], projectId: contentProject.id },
      },
      update: { sortOrder: i },
      create: {
        name: contentClients[i],
        projectId: contentProject.id,
        sortOrder: i,
      },
    });
  }

  for (let i = 0; i < emailClients.length; i++) {
    await prisma.client.upsert({
      where: {
        name_projectId: { name: emailClients[i], projectId: emailProject.id },
      },
      update: { sortOrder: i },
      create: {
        name: emailClients[i],
        projectId: emailProject.id,
        sortOrder: i,
      },
    });
  }

  for (let i = 0; i < messagingClients.length; i++) {
    await prisma.client.upsert({
      where: {
        name_projectId: { name: messagingClients[i], projectId: messagingProject.id },
      },
      update: { sortOrder: i },
      create: {
        name: messagingClients[i],
        projectId: messagingProject.id,
        sortOrder: i,
      },
    });
  }

  console.log("Seed completed successfully!");
  console.log("Default admin: admin@cloudfuze.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
