/**
 * Seeder data awal SiRiset — sivitas akademika Teknik Informatika UTM.
 * Sumber: markdown/database-schema.md Bagian 5 (Mock Data Seeding Plan).
 *
 * Jalankan: npx tsx prisma/seed.ts   (atau: npm run db:seed)
 * Idempoten: akun di-upsert berdasarkan NIM/NIP; data lowongan & pendaftaran demo dibuat ulang.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient, RoleCode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./storage/uploads");

/** Buat PDF satu halaman sederhana (valid) berisi beberapa baris teks — untuk berkas demo. */
function buildDemoPdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 60 ${770 - i * 22} Td (${esc(l)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(text, "latin1")} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

async function writeDemoPdf(key: string, lines: string[]) {
  const target = path.join(UPLOAD_ROOT, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buildDemoPdf(lines));
  return key;
}

const DEFAULT_PASSWORD = "password123";

type SeedUser = {
  nimNip: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  roles: RoleCode[];
};

/** Dosen Wali (perwalian akademik) seluruh mahasiswa seed: Dr. Rika Yunitarini. */
const ACADEMIC_ADVISOR_NIP = "198306072006042001";

const USERS: SeedUser[] = [
  {
    nimNip: "197204152000031001",
    fullName: "Dr. Mula'ab, S.Si., M.Kom.",
    email: "mulaab@trunojoyo.ac.id",
    roles: [RoleCode.DOSEN_PENELITI],
  },
  {
    nimNip: "198306072006042001",
    fullName: "Dr. Rika Yunitarini, ST., MT.",
    email: "rika.yunitarini@trunojoyo.ac.id",
    roles: [RoleCode.DOSEN_WALI, RoleCode.DOSEN_PENELITI],
  },
  {
    nimNip: "198902122019032014",
    fullName: "Fifin Ayu Mufarroha, S.Kom., M.Kom.",
    email: "fifin.mufarroha@trunojoyo.ac.id",
    roles: [RoleCode.KOORDINATOR_MBKM],
  },
  {
    nimNip: "197905202005012002",
    fullName: "Bain Khusnul Khotimah, S.T., M.Kom.",
    email: "bain.khotimah@trunojoyo.ac.id",
    roles: [RoleCode.KAPRODI],
  },
  {
    nimNip: "196803121994031002",
    fullName: "Dr. Budi Santoso, MT.",
    email: "budi.santoso.lppm@trunojoyo.ac.id",
    roles: [RoleCode.LPPM_REVIEWER],
  },
  {
    nimNip: "220411100088",
    fullName: "Ilyas",
    email: "220411100088@student.trunojoyo.ac.id",
    roles: [RoleCode.MAHASISWA],
  },
  {
    nimNip: "240411100020",
    fullName: "Reno Syaelendra",
    email: "240411100020@student.trunojoyo.ac.id",
    roles: [RoleCode.MAHASISWA],
  },
  {
    nimNip: "240411100019",
    fullName: "Rifda Nahariyah",
    email: "240411100019@student.trunojoyo.ac.id",
    roles: [RoleCode.MAHASISWA],
  },
  // Akun skenario uji verifikasi SIAKAD gagal (IPK 2.75) — lihat src/lib/siakad-mock.ts
  {
    nimNip: "230411100999",
    fullName: "Mahasiswa Uji Coba (IPK Rendah)",
    email: "230411100999@student.trunojoyo.ac.id",
    roles: [RoleCode.MAHASISWA],
  },
];

/** Tambah n hari kerja (Senin–Jumat) ke tanggal awal — dipakai untuk SLA 7 hari kerja. */
function addWorkingDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const byNimNip = new Map<string, string>();

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { nimNip: u.nimNip },
      update: {
        fullName: u.fullName,
        email: u.email,
        passwordHash,
        phoneNumber: u.phoneNumber ?? null,
        isActive: true,
      },
      create: {
        nimNip: u.nimNip,
        fullName: u.fullName,
        email: u.email,
        passwordHash,
        phoneNumber: u.phoneNumber ?? null,
      },
    });

    // Sinkronkan peran: hapus yang tidak lagi ada, tambah yang belum ada.
    await prisma.userRole.deleteMany({
      where: { userId: user.id, roleCode: { notIn: u.roles } },
    });
    for (const roleCode of u.roles) {
      await prisma.userRole.upsert({
        where: { userId_roleCode: { userId: user.id, roleCode } },
        update: {},
        create: { userId: user.id, roleCode },
      });
    }

    byNimNip.set(u.nimNip, user.id);
    console.log(`  ✔ ${u.fullName.padEnd(38)} ${u.nimNip.padEnd(20)} [${u.roles.join(", ")}]`);
  }
  // Tetapkan Dosen Wali bagi seluruh mahasiswa (penentu approver DOSEN_WALI pada E-Approval)
  const advisorId = byNimNip.get(ACADEMIC_ADVISOR_NIP);
  const studentNims = USERS.filter((u) => u.roles.includes(RoleCode.MAHASISWA)).map((u) => u.nimNip);
  await prisma.user.updateMany({ where: { nimNip: { in: studentNims } }, data: { academicAdvisorId: advisorId } });
  console.log(`  ✔ Dosen Wali ${studentNims.length} mahasiswa → Dr. Rika Yunitarini, ST., MT.`);

  return byNimNip;
}

async function seedResearchData(ids: Map<string, string>) {
  const id = (nimNip: string) => {
    const v = ids.get(nimNip);
    if (!v) throw new Error(`User ${nimNip} belum ter-seed`);
    return v;
  };

  const mulaab = id("197204152000031001");
  const rika = id("198306072006042001");
  const bain = id("197905202005012002");
  const ilyas = id("220411100088");

  // Bersihkan data demo lama (cascade menghapus approvals, logbook, dll.)
  await prisma.application.deleteMany({
    where: { vacancy: { grantContractNumber: { in: ["042/UN46.4.1/PT/2026", "088/UN46.4.1/PT/2026"] } } },
  });
  await prisma.researchVacancy.deleteMany({
    where: { grantContractNumber: { in: ["042/UN46.4.1/PT/2026", "088/UN46.4.1/PT/2026"] } },
  });

  const now = new Date();
  // Periode pendaftaran: awal bulan ini (00:00 WIB) s/d tanggal 28 bulan depan (23:59 WIB)
  const pad = (n: number) => String(n).padStart(2, "0");
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 28);
  const startDate = new Date(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01T00:00:00.000+07:00`);
  const endDate = new Date(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-28T23:59:59.999+07:00`);

  const vacancyVit = await prisma.researchVacancy.create({
    data: {
      lecturerId: mulaab,
      grantContractNumber: "042/UN46.4.1/PT/2026",
      grantScheme: "Penelitian Mandiri LPPM UTM",
      title:
        "Pengembangan Model Klasifikasi Citra Medis Berbasis Arsitektur Vision Transformer untuk Deteksi Dini Tumor Otak",
      description:
        "Riset pengembangan model Vision Transformer (ViT) untuk klasifikasi citra MRI otak guna mendukung deteksi dini tumor.\n\nTugas mahasiswa:\n1. Kurasi & augmentasi dataset MRI\n2. Pelatihan dan fine-tuning model ViT\n3. Evaluasi metrik (akurasi, F1, AUC)\n4. Penulisan artikel ilmiah",
      quota: 4,
      requiredSkills: "Python, PyTorch, Deep Learning, Image Processing",
      applicationStartDate: startDate,
      applicationEndDate: endDate,
      status: "PUBLISHED",
    },
  });

  await prisma.researchVacancy.create({
    data: {
      lecturerId: rika,
      grantContractNumber: "088/UN46.4.1/PT/2026",
      grantScheme: "Penelitian Terapan Fakultas Teknik",
      title:
        "Rancang Bangun Framework Otomasi Rekayasa Proses Bisnis Berbasis BPMN 2.0 dan Integrasi Layanan Kampus Cerdas",
      description:
        "Riset terapan perancangan framework otomasi proses bisnis kampus berbasis notasi BPMN 2.0, termasuk pemodelan As-Is/To-Be, implementasi workflow engine, dan integrasi REST API layanan kampus.",
      quota: 3,
      requiredSkills: "Next.js, Analisis Proses Bisnis, REST API",
      applicationStartDate: startDate,
      applicationEndDate: endDate,
      status: "PUBLISHED",
    },
  });

  // Ilyas — peserta riset aktif pada riset Dr. Mula'ab (sudah lolos E-Approval 3 pihak & validasi prodi).
  // Mendaftar ± 118 hari lalu → 16 minggu pelaksanaan telah lewat: jendela Monev (Fase 6) terbuka dan
  // penilaian akhir (Fase 7, BR-04 durasi minimal 16 minggu) dapat didemokan. Reno mewakili tahap awal.
  const HOUR = 60 * 60 * 1000;
  const appliedAt = new Date(now.getTime() - 118 * 24 * HOUR);
  const decidedAt = new Date(appliedAt.getTime() + 2 * 24 * HOUR);
  const validatedAt = new Date(decidedAt.getTime() + 24 * HOUR);
  const ilyasApp = await prisma.application.create({
    data: {
      vacancyId: vacancyVit.id,
      studentId: ilyas,
      gpaAtApplication: "3.78",
      mandatoryCoursesPassed: true,
      proposalTitle: "Fine-Tuning Vision Transformer pada Dataset MRI Tumor Otak dengan Augmentasi Data",
      proposalFileUrl: await writeDemoPdf("proposals/00000000-0000-4000-8000-000000000088.pdf", [
        "Proposal Ringkas MBKM Riset (Demo)",
        "Mahasiswa : Ilyas (NIM 220411100088)",
        "Judul     : Fine-Tuning Vision Transformer pada Dataset MRI Tumor Otak",
        "Dosen     : Dr. Mula'ab, S.Si., M.Kom.",
        "Berkas ini dibuat otomatis oleh prisma/seed.ts untuk keperluan demo.",
      ]),
      conversionScheme: "MB04",
      includesKpConversion: false,
      status: "IN_PROGRESS",
      slaDeadline: addWorkingDays(appliedAt, 7),
      selectionNotes: "Lolos seleksi portofolio Python dan pemahaman deep learning.",
      selectionDecidedAt: decidedAt,
      coordinatorValidatedAt: validatedAt,
      createdAt: appliedAt,
      // E-approval paralel selesai dalam 8,5 jam (3 / 5 / 8,5 jam setelah diterima dosen)
      approvals: {
        create: [
          { approverId: rika, approverRole: "DOSEN_WALI", status: "APPROVED", decidedAt: new Date(decidedAt.getTime() + 3 * HOUR) },
          { approverId: mulaab, approverRole: "DOSEN_PENELITI", status: "APPROVED", decidedAt: new Date(decidedAt.getTime() + 5 * HOUR) },
          { approverId: bain, approverRole: "KAPRODI", status: "APPROVED", decidedAt: new Date(decidedAt.getTime() + 8.5 * HOUR) },
        ],
      },
    },
  });

  // Ilyas sudah tercatat di SIMPELMAS sejak awal riset (1-click sync 3 menit setelah validasi koordinator).
  // Payload & sidik jari mengikuti format src/lib/coordinator.ts agar status "Tersinkron" terbaca benar.
  const { participantFingerprint } = await import("../src/lib/simpelmas-fingerprint");
  const { academicPeriod, toDateInputValue } = await import("../src/lib/format");
  const mulaabUser = await prisma.user.findUniqueOrThrow({ where: { id: mulaab }, select: { fullName: true, nimNip: true } });
  const syncedAt = new Date(validatedAt.getTime() + 3 * 60 * 1000);
  const participant = {
    nim: "220411100088",
    studentName: "Ilyas",
    programStudy: "S1 Teknik Informatika",
    leadLecturerNip: mulaabUser.nimNip,
    leadLecturerName: mulaabUser.fullName,
    researchTitle: vacancyVit.title,
    grantContractNumber: vacancyVit.grantContractNumber,
    grantScheme: vacancyVit.grantScheme,
    startDate: toDateInputValue(validatedAt),
    academicPeriod: academicPeriod(validatedAt).code,
    facultyCode: "FT",
  };
  const batchReferenceId = `SYNC-SIMPELMAS-${toDateInputValue(syncedAt)}-001`;
  await prisma.simpelmasSyncLog.create({
    data: {
      applicationId: ilyasApp.id,
      triggeredBy: id("198902122019032014"),
      batchReferenceId,
      syncStatus: "SUCCESS",
      simpelmasExternalId: "SMP-2026-A35782",
      payloadSent: JSON.stringify({ batchReferenceId, fingerprint: participantFingerprint(participant), participant }),
      responseReceived: JSON.stringify({ nim: participant.nim, status: "ACCEPTED", simpelmasId: "SMP-2026-A35782", registeredAt: syncedAt.toISOString() }),
      syncedAt,
    },
  });

  console.log("  ✔ 2 lowongan riset hibah LPPM (PUBLISHED)");
  console.log("  ✔ 1 pendaftaran aktif: Ilyas → riset Vision Transformer (IN_PROGRESS, tersinkron SIMPELMAS)");
}

/** Contoh isi logbook (sesuai wireframe Layar 4) untuk minggu-minggu yang sudah lewat. */
const DEMO_LOGBOOKS = [
  {
    hours: 16,
    activity: "Studi literatur arsitektur Vision Transformer (ViT-B/16) dan survei dataset MRI tumor otak publik.",
    challenge: "Banyak varian ViT; perlu memilih baseline yang realistis untuk GPU Colab.",
    solution: "Membandingkan jumlah parameter & kebutuhan memori; memilih ViT-B/16 pretrained ImageNet-21k.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/1a2b3c4",
    feedback: "Ringkasan literatur sudah baik. Tambahkan tabel perbandingan akurasi dari 3 paper terbaru.",
  },
  {
    hours: 18,
    activity: "Eksplorasi dataset Brain MRI: analisis distribusi kelas, resolusi citra, dan kualitas anotasi.",
    challenge: "Distribusi kelas tidak seimbang (glioma mendominasi).",
    solution: "Mencatat rasio kelas sebagai dasar strategi augmentasi minggu depan.",
    repo: "https://colab.research.google.com/drive/demo-eksplorasi-dataset",
    feedback: "Lanjutkan dengan rencana augmentasi; dokumentasikan seed random agar eksperimen reprodusibel.",
  },
  {
    hours: 20,
    activity: "Preprocessing & augmentasi data: normalisasi 224×224, rotasi, flipping, split train/val/test 70/15/15.",
    challenge: "Ketidakseimbangan kelas tumor jinak vs ganas masih memengaruhi validasi awal.",
    solution: "Menerapkan oversampling dan focal loss pada fungsi loss pelatihan.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/8a7b6c5",
    feedback: "Langkah preprocessing tepat. Minggu depan eksplorasi patch extraction 16×16.",
  },
  {
    hours: 22,
    activity: "Training model baseline ViT-B/16 selama 50 epoch; mencatat kurva loss dan akurasi validasi.",
    challenge: "Terjadi overfitting setelah epoch ke-40 pada data validasi.",
    solution: "Menambahkan dropout 0.2 dan cosine annealing learning rate scheduler.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/3c2e1f4",
    feedback: "Kurva loss sudah jelas. Coba regularisasi weight decay 0.01 untuk menekan overfitting.",
  },
  {
    hours: 18,
    activity: "Hyperparameter tuning: learning rate, batch size, weight decay 0.01; overfitting berkurang signifikan.",
    challenge: "Waktu training per eksperimen lama (± 3 jam di Colab).",
    solution: "Menerapkan early stopping dan menyimpan checkpoint terbaik.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/5d4e3f2",
    feedback: "Bagus. Dokumentasikan seluruh konfigurasi eksperimen dalam tabel.",
  },
  {
    hours: 20,
    activity: "Implementasi visualisasi Attention Map (attention rollout) untuk interpretasi prediksi model.",
    challenge: "Peta atensi lapisan awal kurang informatif.",
    solution: "Menggunakan agregasi attention rollout dari seluruh lapisan.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/7f6a5b4",
    feedback: "Visualisasi sangat membantu analisis. Tambahkan contoh kasus salah klasifikasi.",
  },
  {
    hours: 19,
    activity: "Evaluasi model pada data uji: akurasi 91.4%, F1 macro 0.90, confusion matrix per kelas tumor.",
    challenge: "Kelas meningioma paling sering tertukar dengan pituitary.",
    solution: "Menganalisis contoh salah klasifikasi dan menyiapkan augmentasi khusus.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/9b8c7d6",
    feedback: "Hasil kuat untuk bahan laporan kemajuan. Bandingkan dengan baseline CNN (ResNet-50).",
  },
  {
    hours: 21,
    activity: "Penyusunan draf Laporan Kemajuan & eksperimen pembanding baseline ResNet-50 (akurasi 87.2%).",
    challenge: "Menyesuaikan format laporan dengan templat baku LPPM UTM.",
    solution: "Menyusun ulang bab hasil sementara sesuai sistematika templat.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/a1b2c3d",
    feedback: "Draf laporan rapi. Pastikan tabel perbandingan model mencantumkan jumlah parameter.",
  },
  {
    hours: 18,
    activity: "Tindak lanjut rekomendasi Monev: analisis Attention Map pada kasus salah klasifikasi meningioma.",
    challenge: "Pola atensi sulit dibandingkan antar-kasus.",
    solution: "Membuat grid visualisasi berpasangan (benar vs salah) per kelas.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/b2c3d4e",
    feedback: "Temuan menarik, masukkan ke bagian diskusi artikel.",
  },
  {
    hours: 20,
    activity: "Augmentasi khusus kelas meningioma (elastic transform) dan fine-tuning ulang ViT-B/16.",
    challenge: "Augmentasi berlebihan menurunkan akurasi kelas glioma.",
    solution: "Menerapkan augmentasi bersyarat hanya pada kelas minoritas.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/c3d4e5f",
    feedback: "Strategi tepat. Laporkan akurasi per kelas sebelum dan sesudah.",
  },
  {
    hours: 19,
    activity: "Eksperimen ablation: ukuran patch 16 vs 32, jumlah head atensi, dan pretrained vs from-scratch.",
    challenge: "Kebutuhan komputasi eksperimen ablation tinggi.",
    solution: "Menjalankan eksperimen bertahap dengan subset data validasi.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/d4e5f6a",
    feedback: "Tabel ablation sudah informatif.",
  },
  {
    hours: 22,
    activity: "Menulis draf artikel jurnal: pendahuluan, tinjauan pustaka, dan metodologi.",
    challenge: "Menyesuaikan gaya selingkung jurnal target Sinta 2.",
    solution: "Mengikuti template jurnal dan contoh artikel terbitan terbaru.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/e5f6a7b",
    feedback: "Struktur artikel baik. Perkuat state-of-the-art di tinjauan pustaka.",
  },
  {
    hours: 20,
    activity: "Menulis bagian hasil & pembahasan artikel; menyusun gambar confusion matrix dan Attention Map.",
    challenge: "Batas jumlah halaman jurnal.",
    solution: "Memindahkan detail eksperimen ablation ke lampiran.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/f6a7b8c",
    feedback: "Pembahasan sudah tajam. Siapkan cover letter untuk submission.",
  },
  {
    hours: 16,
    activity: "Submission artikel ke jurnal Sinta 2 dan menyiapkan repositori kode publik beserta README.",
    challenge: "Membersihkan kode eksperimen agar reprodusibel.",
    solution: "Refactor notebook menjadi modul Python + requirements.txt.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/0a1b2c3",
    feedback: "Selamat atas submission. Lanjutkan persiapan laporan akhir.",
  },
  {
    hours: 18,
    activity: "Menyusun laporan akhir riset dan slide presentasi seminar hasil.",
    challenge: "Merangkum 16 minggu riset dalam presentasi 15 menit.",
    solution: "Fokus pada kontribusi utama: akurasi, interpretabilitas, dan ablation.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/1b2c3d4",
    feedback: "Laporan akhir lengkap.",
  },
  {
    hours: 12,
    activity: "Presentasi seminar hasil riset di hadapan tim peneliti dan finalisasi revisi laporan akhir.",
    challenge: "Pertanyaan penguji terkait generalisasi ke data rumah sakit lokal.",
    solution: "Menambahkan bagian keterbatasan & rencana validasi eksternal pada laporan.",
    repo: "https://github.com/ilyas-utm/vit-brain-tumor/commit/2c3d4e5",
    feedback: null,
  },
];

/**
 * Logbook demo Ilyas: seluruh minggu yang sudah lewat diisi; minggu ke-2 ditandai terlambat,
 * minggu terakhir yang terisi masih menunggu ulasan dosen (agar alur mentoring dapat didemokan).
 */
async function seedDemoLogbooks() {
  const { allWeeks, currentWeek } = await import("../src/lib/logbook-schedule");
  const app = await prisma.application.findFirst({
    where: { student: { nimNip: "220411100088" }, status: "IN_PROGRESS" },
    select: { id: true, coordinatorValidatedAt: true, vacancy: { select: { lecturerId: true } } },
  });
  if (!app?.coordinatorValidatedAt) {
    console.log("  • Lewati logbook demo: riset aktif Ilyas tidak ditemukan.");
    return;
  }
  await prisma.logbook.deleteMany({ where: { applicationId: app.id } });

  const weeks = allWeeks(app.coordinatorValidatedAt);
  const passed = Math.min(currentWeek(app.coordinatorValidatedAt) - 1, DEMO_LOGBOOKS.length);
  for (let i = 0; i < passed; i++) {
    const w = weeks[i];
    const demo = DEMO_LOGBOOKS[i];
    const late = w.week === 2;
    const pending = i === passed - 1;
    const submittedAt = late
      ? new Date(w.lateCutoff.getTime() + 2 * 86_400_000) // Selasa minggu berikutnya
      : new Date(w.deadline.getTime() - 4 * 3_600_000); // Jumat ± 20:00 WIB
    await prisma.logbook.create({
      data: {
        applicationId: app.id,
        weekNumber: w.week,
        activityDate: new Date(`${w.monday}T00:00:00+07:00`),
        durationHours: demo.hours,
        activityDescription: demo.activity,
        challengesFaced: demo.challenge,
        solutionsImplemented: demo.solution,
        repositoryLink: demo.repo,
        status: pending ? "SUBMITTED" : "VALIDATED",
        isLate: late,
        submittedAt,
        reviews:
          pending || !demo.feedback
            ? undefined
            : {
                create: {
                  reviewerId: app.vacancy.lecturerId,
                  reviewStatus: "APPROVED",
                  feedbackNotes: demo.feedback,
                  reviewedAt: new Date(submittedAt.getTime() + 86_400_000),
                },
              },
      },
    });
  }
  console.log(`  ✔ ${passed} logbook demo Ilyas (1 terlambat, 1 menunggu ulasan dosen)`);
}

/** Berkas contoh siap-unggah untuk demonstrasi UAS (lihat DEMO-GUIDE.md). */
async function writeDemoAssets() {
  const dir = path.resolve(process.cwd(), "demo-assets");
  await mkdir(dir, { recursive: true });
  const files: Record<string, string[]> = {
    "Proposal_Reno_Syaelendra_ViT.pdf": [
      "Proposal Ringkas MBKM Riset",
      "Mahasiswa : Reno Syaelendra (NIM 240411100020)",
      "Judul     : Penerapan Algoritma ViT pada Citra CT-Scan Tumor Otak",
      "Paket     : MB04 - 20 SKS",
      "Berkas contoh untuk demonstrasi UAS SiRiset.",
    ],
    "Laporan_Kemajuan_Ilyas.pdf": [
      "Laporan Kemajuan MBKM Riset (Templat LPPM UTM)",
      "Mahasiswa : Ilyas (NIM 220411100088)",
      "Capaian   : Akurasi ViT 91.4% vs baseline ResNet-50 87.2%",
      "Pendahuluan - Metodologi - Hasil Sementara - Rencana Tahap Berikutnya",
      "Berkas contoh untuk demonstrasi UAS SiRiset.",
    ],
    "Draf_Artikel_Ilyas_ViT.pdf": [
      "Brain Tumor Classification Using Enhanced Vision Transformer Architecture",
      "Ilyas, Dr. Mula'ab - Teknik Informatika, Universitas Trunodjoyo Madura",
      "Target: Journal of Informatics and Computer Science (JIKOM - Sinta 2)",
      "Status: Submitted",
      "Berkas contoh untuk demonstrasi UAS SiRiset.",
    ],
  };
  for (const [name, lines] of Object.entries(files)) await writeFile(path.join(dir, name), buildDemoPdf(lines));
  console.log(`  ✔ ${Object.keys(files).length} berkas contoh unggahan di ./demo-assets/`);
}

async function main() {
  // `npx tsx prisma/seed.ts --only=logbooks` → hanya menyemai ulang logbook demo tanpa menghapus data lain.
  if (process.argv.includes("--only=logbooks")) {
    console.log("🌱 Menyemai logbook demo …");
    await seedDemoLogbooks();
    return;
  }
  console.log("🌱 Menyemai akun sivitas akademika TI UTM …");
  const ids = await seedUsers();
  console.log("🌱 Menyemai data riset demo …");
  await seedResearchData(ids);
  console.log("🌱 Menyemai logbook demo …");
  await seedDemoLogbooks();
  console.log("🌱 Menyiapkan berkas demo …");
  await writeDemoAssets();
  console.log(`\nSelesai. Semua akun memakai password default: "${DEFAULT_PASSWORD}"`);
}

main()
  .catch((err) => {
    console.error("❌ Seeding gagal:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
