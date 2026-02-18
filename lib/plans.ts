export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    limits: {
      maxEventsPerMonth: 1, // 月1回まで
      maxAttendeesPerEvent: 20, // 20名まで
    },
  },
  pro: {
    name: "Pro",
    price: 2980,
    limits: {
      maxEventsPerMonth: Infinity, // 無制限
      maxAttendeesPerEvent: 100, // 100名まで
    },
  },
  enterprise: {
    name: "Enterprise",
    price: null, // 要問い合わせ
    limits: {
      maxEventsPerMonth: Infinity,
      maxAttendeesPerEvent: Infinity,
    },
  },
};

// ユーザーのプラン情報を取得するヘルパー関数
export const getPlanLimits = (planId: string) => {
  return PLANS[planId as keyof typeof PLANS]?.limits || PLANS.free.limits;
};