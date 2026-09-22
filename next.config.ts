import type { NextConfig } from "next";

const razorpayOrigins =
  '(self "https://checkout.razorpay.com" "https://api.razorpay.com" "https://cdn.razorpay.com")';

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: [
              `accelerometer=${razorpayOrigins}`,
              `gyroscope=${razorpayOrigins}`,
              `magnetometer=${razorpayOrigins}`,
              `payment=${razorpayOrigins}`,
            ].join(", "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
