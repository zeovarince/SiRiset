import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sembunyikan badge "N" mode dev agar tidak menutupi Quick Demo Bar saat demonstrasi UAS.
  devIndicators: false,
  experimental: {
    serverActions: {
      // Unggah proposal PDF maks 5 MB (NFR-06) + overhead multipart.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
