import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 領収証の PDF（app/api/receipts）はサーバーで日本語の字（public/fonts/ipaexg.ttf）を読むので、関数にこの字のファイルを入れる
  outputFileTracingIncludes: {
    "/api/receipts": ["./public/fonts/ipaexg.ttf"],
  },
};

export default nextConfig;
