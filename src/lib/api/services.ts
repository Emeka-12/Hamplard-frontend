import { apiClient } from "./client";
import type {
  ApiResponse, PaginatedResponse, Course, Enrollment,
  Certificate, Notification, User, Category, Announcement,
  Bundle, StudentEnrollmentRow, StudentDetail, SavedPaymentMethod,
  Gift, LeaderboardResponse, LeaderboardPeriod, Achievement,
  DirectMessage, Conversation, MessageAttachment,
} from '@/types';

const isBrowser = typeof window !== "undefined";
const ANNOUNCEMENTS_STORAGE_KEY = "hamplard_announcements";
const NOTIFICATIONS_STORAGE_KEY = "hamplard_notifications";
const PAYMENT_METHODS_STORAGE_KEY = "hamplard_payment_methods";

const readStorage = <T>(key: string, fallback: T): T => {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (isBrowser) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const currentUserKey = () => {
  if (!isBrowser) return "anonymous";
  return localStorage.getItem("hamplard_address") ?? "anonymous";
};

const emitNotificationsUpdated = () => {
  if (isBrowser) {
    window.dispatchEvent(new Event("hamplard:notifications-updated"));
  }
};

// ----------------------------------------------------------
// Auth
// ----------------------------------------------------------
export const authApi = {
  getNonce: async (address: string) => {
    const { data } = await apiClient.get<ApiResponse<{ nonce: string }>>(
      `/auth/nonce?address=${address}`,
    );
    return data.data.nonce;
  },
  login: async (payload: {
    stellarAddress: string;
    signedNonce: string;
    signature: string;
    role?: "STUDENT" | "INSTRUCTOR";
  }) => {
    const { data } = await apiClient.post<
      ApiResponse<{ accessToken: string; user: User }>
    >("/auth/login", payload);
    return data.data;
  },
  loginWithEmail: async (payload: { email: string; password: string }) => {
    const { data } = await apiClient.post<
      ApiResponse<{ accessToken: string; user: User }>
    >("/auth/email/login", payload);
    return data.data;
  },
};

// ----------------------------------------------------------
// Courses
// ----------------------------------------------------------
export const coursesApi = {
  list: async (params?: {
    category?: string;
    level?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Course>> => {
    const { data } = await apiClient.get<
      ApiResponse<PaginatedResponse<Course>>
    >("/courses", { params });
    return data.data;
  },

  get: async (id: string): Promise<Course> => {
    const { data } = await apiClient.get<ApiResponse<Course>>(`/courses/${id}`);
    return data.data;
  },

  getCategories: async (): Promise<Category[]> => {
    const { data } = await apiClient.get<ApiResponse<Category[]>>(
      "/courses/categories",
    );
    return data.data;
  },

  create: async (payload: {
    courseId: string;
    title: string;
    description?: string;
    category: string;
    level?: string;
    language?: string;
    thumbnailUrl?: string;
    price: number;
    platformFeePercent?: number;
  }): Promise<Course> => {
    const { data } = await apiClient.post<ApiResponse<Course>>(
      "/courses",
      payload,
    );
    return data.data;
  },

  update: async (id: string, payload: Partial<Course>): Promise<Course> => {
    const { data } = await apiClient.patch<ApiResponse<Course>>(
      `/courses/${id}`,
      payload,
    );
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/courses/${id}`);
  },

  submitForReview: async (id: string, txHash?: string): Promise<Course> => {
    const { data } = await apiClient.post<ApiResponse<Course>>(
      `/courses/${id}/submit`,
      { txHash },
    );
    return data.data;
  },

  approve: async (id: string): Promise<Course> => {
    const { data } = await apiClient.post<ApiResponse<Course>>(
      `/courses/${id}/approve`,
    );
    return data.data;
  },

  getPending: async (): Promise<PaginatedResponse<Course>> => {
    const { data } = await apiClient.get<
      ApiResponse<PaginatedResponse<Course>>
    >("/courses/admin/pending");
    return data.data;
  },
};

// ----------------------------------------------------------
// Enrollments
// ----------------------------------------------------------
export const enrollmentsApi = {
  create: async (payload: {
    courseId: string;
    txHash: string;
    amountPaid: number;
  }): Promise<Enrollment> => {
    const { data } = await apiClient.post<ApiResponse<Enrollment>>(
      "/enrollments",
      payload,
    );
    return data.data;
  },

  getMy: async (
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Enrollment>> => {
    const { data } = await apiClient.get<
      ApiResponse<PaginatedResponse<Enrollment>>
    >("/enrollments/my", { params: { page, limit } });
    return data.data;
  },

  get: async (courseId: string): Promise<Enrollment> => {
    const { data } = await apiClient.get<ApiResponse<Enrollment>>(
      `/enrollments/${courseId}`,
    );
    return data.data;
  },

  isEnrolled: async (courseId: string): Promise<boolean> => {
    try {
      const { data } = await apiClient.get<ApiResponse<boolean>>(
        `/enrollments/${courseId}/check`,
      );
      return data.data;
    } catch {
      return false;
    }
  },
};

// ----------------------------------------------------------
// Lessons
// ----------------------------------------------------------
export const lessonsApi = {
  markComplete: async (
    lessonId: string,
    enrollmentId: string,
    watchedSecs?: number,
  ) => {
    const { data } = await apiClient.post(`/lessons/${lessonId}/complete`, {
      enrollmentId,
      watchedSecs,
    });
    return data.data;
  },

  updateProgress: async (
    lessonId: string,
    enrollmentId: string,
    watchedSecs: number,
  ) => {
    await apiClient.patch(`/lessons/${lessonId}/progress`, {
      enrollmentId,
      watchedSecs,
    });
  },

  createModule: async (
    courseId: string,
    title: string,
    position: number,
    unlockRule?: string,
    prerequisiteModuleId?: string | null,
    releaseDate?: string | null,
  ) => {
    const { data } = await apiClient.post("/lessons/modules", {
      courseId,
      title,
      position,
      unlockRule,
      prerequisiteModuleId,
      releaseDate,
    });
    return data.data;
  },

  createLesson: async (payload: {
    moduleId: string;
    title: string;
    type?: string;
    videoUrl?: string;
    videoDuration?: number;
    content?: string;
    resourceUrl?: string;
    position: number;
    isFree?: boolean;
    steps?: any[];
  }) => {
    const { data } = await apiClient.post("/lessons", payload);
    return data.data;
  },

  getStepProgress: async (lessonId: string): Promise<string[]> => {
    const { data } = await apiClient.get<ApiResponse<string[]>>(
      `/lessons/${lessonId}/steps/progress`,
    );
    return data.data;
  },

  saveStepProgress: async (
    lessonId: string,
    completedStepIds: string[],
  ): Promise<void> => {
    await apiClient.post(`/lessons/${lessonId}/steps/progress`, {
      completedStepIds,
    });
  },
};

export const stepChecklistApi = {
  getStepProgress: async (lessonId: string): Promise<string[]> => {
    const { data } = await apiClient.get<ApiResponse<string[]>>(
      `/lessons/${lessonId}/steps/progress`,
    );
    return data.data;
  },
  saveStepProgress: async (
    lessonId: string,
    completedStepIds: string[],
  ): Promise<void> => {
    await apiClient.post(`/lessons/${lessonId}/steps/progress`, {
      completedStepIds,
    });
  },
};

// ----------------------------------------------------------
// Assignments
// ----------------------------------------------------------
export const assignmentsApi = {
  getByLesson: async (lessonId: string) => {
    const { data } = await apiClient.get(`/assignments/lesson/${lessonId}`);
    return data.data;
  },

  submit: async (
    assignmentId: string,
    submissionUrl: string,
    notes?: string,
  ) => {
    const { data } = await apiClient.post(
      `/assignments/${assignmentId}/submit`,
      {
        submissionUrl,
        notes,
      },
    );
    return data.data;
  },

  review: async (submissionId: string, approved: boolean, feedback: string) => {
    const { data } = await apiClient.post(
      `/assignments/submissions/${submissionId}/review`,
      { approved, feedback },
    );
    return data.data;
  },

  getPending: async () => {
    const { data } = await apiClient.get("/assignments/instructor/pending");
    return data.data;
  },
};

// ----------------------------------------------------------
// Certificates
// ----------------------------------------------------------
export const certificatesApi = {
  getMy: async (): Promise<Certificate[]> => {
    const { data } = await apiClient.get<ApiResponse<Certificate[]>>(
      "/certificates/my/all",
    );
    return data.data;
  },

  verify: async (id: string) => {
    const { data } = await apiClient.get(`/certificates/verify/${id}`);
    return data.data;
  },

  get: async (id: string): Promise<Certificate> => {
    const { data } = await apiClient.get<ApiResponse<Certificate>>(
      `/certificates/${id}`,
    );
    return data.data;
  },
};

// ----------------------------------------------------------
// Announcements
// ----------------------------------------------------------
export const announcementsApi = {
  list: async (params?: {
    courseId?: string;
  }): Promise<PaginatedResponse<Announcement>> => {
    try {
      const { data } = await apiClient.get<
        ApiResponse<PaginatedResponse<Announcement>>
      >("/announcements", { params });
      return data.data;
    } catch {
      const stored = readStorage<Announcement[]>(ANNOUNCEMENTS_STORAGE_KEY, []);
      const filtered = params?.courseId
        ? stored.filter((item) => item.courseId === params.courseId)
        : stored;
      return {
        data: filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
        meta: { total: filtered.length, page: 1, limit: 20, totalPages: 1 },
      };
    }
  },

  create: async (payload: {
    courseId: string;
    courseTitle: string;
    subject: string;
    message: string;
    deliveryCount?: number;
    status?: "draft" | "scheduled" | "published";
    scheduledFor?: string | null;
  }): Promise<Announcement> => {
    try {
      const { data } = await apiClient.post<ApiResponse<Announcement>>(
        "/announcements",
        payload,
      );
      return data.data;
    } catch {
      const announcement: Announcement = {
        id: `announcement-${Date.now()}`,
        courseId: payload.courseId,
        courseTitle: payload.courseTitle,
        subject: payload.subject,
        message: payload.message,
        deliveryCount: payload.deliveryCount ?? 1,
        status: payload.status ?? "published",
        scheduledFor: payload.scheduledFor ?? null,
        createdAt: new Date().toISOString(),
      };

      const stored = readStorage<Announcement[]>(ANNOUNCEMENTS_STORAGE_KEY, []);
      const next = [announcement, ...stored];
      writeStorage(ANNOUNCEMENTS_STORAGE_KEY, next);

      const notification: Notification = {
        id: `notification-${Date.now()}`,
        type: "COURSE_ANNOUNCEMENT",
        title: payload.subject,
        message: payload.message,
        data: { announcementId: announcement.id, courseId: payload.courseId },
        read: false,
        createdAt: announcement.createdAt,
      };
      if (announcement.status === "published") {
        const existingNotifications = readStorage<Notification[]>(
          NOTIFICATIONS_STORAGE_KEY,
          [],
        );
        const nextNotifications = [
          { ...notification, userKey: currentUserKey() },
          ...existingNotifications.filter(
            (item) => item.id !== notification.id,
          ),
        ];
        writeStorage(NOTIFICATIONS_STORAGE_KEY, nextNotifications);
        emitNotificationsUpdated();
      }
      return announcement;
    }
  },

  update: async (
    id: string,
    payload: Partial<
      Pick<
        Announcement,
        | "courseId"
        | "courseTitle"
        | "subject"
        | "message"
        | "deliveryCount"
        | "status"
        | "scheduledFor"
      >
    >,
  ): Promise<Announcement> => {
    try {
      const { data } = await apiClient.patch<ApiResponse<Announcement>>(
        `/announcements/${id}`,
        payload,
      );
      return data.data;
    } catch {
      const stored = readStorage<Announcement[]>(ANNOUNCEMENTS_STORAGE_KEY, []);
      const current = stored.find((item) => item.id === id);
      if (!current) throw new Error("Announcement not found");
      const updated = { ...current, ...payload };
      writeStorage(
        ANNOUNCEMENTS_STORAGE_KEY,
        stored.map((item) => (item.id === id ? updated : item)),
      );
      return updated;
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/announcements/${id}`);
    } catch {
      const stored = readStorage<Announcement[]>(ANNOUNCEMENTS_STORAGE_KEY, []);
      writeStorage(
        ANNOUNCEMENTS_STORAGE_KEY,
        stored.filter((item) => item.id !== id),
      );
    }
  },
};

// ----------------------------------------------------------
// Notifications
// ----------------------------------------------------------
export const notificationsApi = {
  list: async (params?: { unreadOnly?: boolean }) => {
    try {
      const { data } = await apiClient.get<
        ApiResponse<PaginatedResponse<Notification>>
      >("/notifications", { params });
      return data.data;
    } catch {
      const stored = readStorage<Array<Notification & { userKey?: string }>>(
        NOTIFICATIONS_STORAGE_KEY,
        [],
      );
      const forCurrentUser = stored.filter(
        (item) => item.userKey === currentUserKey(),
      );
      const filtered = params?.unreadOnly
        ? forCurrentUser.filter((item) => !item.read)
        : forCurrentUser;
      return {
        data: filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
        meta: { total: filtered.length, page: 1, limit: 20, totalPages: 1 },
      };
    }
  },
  markRead: async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      const stored = readStorage<Array<Notification & { userKey?: string }>>(
        NOTIFICATIONS_STORAGE_KEY,
        [],
      );
      const updated = stored.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      );
      writeStorage(NOTIFICATIONS_STORAGE_KEY, updated);
      emitNotificationsUpdated();
    }
  },
  markAllRead: async () => {
    try {
      await apiClient.patch("/notifications/read-all");
    } catch {
      const stored = readStorage<Array<Notification & { userKey?: string }>>(
        NOTIFICATIONS_STORAGE_KEY,
        [],
      );
      const updated = stored.map((item) => ({ ...item, read: true }));
      writeStorage(NOTIFICATIONS_STORAGE_KEY, updated);
      emitNotificationsUpdated();
    }
  },
};

// ----------------------------------------------------------
// Users
// ----------------------------------------------------------
export const usersApi = {
  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>("/users/me");
    return data.data;
  },
  updateMe: async (payload: {
    name?: string;
    email?: string;
    bio?: string;
  }) => {
    const { data } = await apiClient.patch<ApiResponse<User>>(
      "/users/me",
      payload,
    );
    return data.data;
  },
  deleteAccount: async (password: string): Promise<void> => {
    await apiClient.delete('/users/me', { data: { password } });
  },
  getInstructorStats: async () => {
    const { data } = await apiClient.get("/users/me/instructor-stats");
    return data.data;
  },
  requestDataExport: async (): Promise<{ message: string; downloadUrl?: string }> => {
    try {
      const { data } = await apiClient.post<ApiResponse<{ message: string; downloadUrl?: string }>>(
        '/users/me/export-data',
      );
      return data.data;
    } catch {
      // Fallback response when endpoint is mock / offline
      return {
        message: "Your data export is being prepared, you'll receive an email when ready",
      };
    }
  },
};

// ----------------------------------------------------------
// Uploads
// ----------------------------------------------------------
export const uploadsApi = {
  upload: async (
    file: File,
    type: "thumbnail" | "video" | "resource" | "assignment",
  ) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post(`/uploads/${type}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data as { url: string; filename: string; size: number };
  },

  uploadAvatar: async (
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("hamplard_token")
        : null;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"}/uploads/avatar`,
      );
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            resolve({ url: parsed?.data?.url ?? parsed?.url ?? "" });
          } catch {
            reject(new Error("Invalid response from server"));
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () =>
        reject(new Error("Network error — please try again."));
      xhr.send(form);
    });
  },
};

// ----------------------------------------------------------
// Bundles
// ----------------------------------------------------------
export const bundlesApi = {
  getBySlug: async (slug: string) => {
    const { data } = await apiClient.get<ApiResponse<Bundle>>(
      `/bundles/${slug}`,
    );
    return data.data;
  },

  list: async (): Promise<Bundle[]> => {
    const { data } = await apiClient.get<ApiResponse<Bundle[]>>("/bundles");
    return data.data;
  },
};

// ----------------------------------------------------------
// Instructor Student Analytics
// ----------------------------------------------------------
export const instructorAnalyticsApi = {
  getStudents: async (params?: {
    courseId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<StudentEnrollmentRow>> => {
    const { data } = await apiClient.get<
      ApiResponse<PaginatedResponse<StudentEnrollmentRow>>
    >("/users/me/instructor-students", { params });
    return data.data;
  },

  getStudentDetail: async (studentId: string): Promise<StudentDetail> => {
    const { data } = await apiClient.get<ApiResponse<StudentDetail>>(
      `/users/me/instructor-students/${studentId}`,
    );
    return data.data;
  },
};

// ----------------------------------------------------------
// Promo Codes
// ----------------------------------------------------------
export const promoCodesApi = {
  create: async (payload: {
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    expiryDate: string;
    maxUses: number;
  }) => {
    const { data } = await apiClient.post("/promo-codes", payload);
    return data.data;
  },

  getMy: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<any>>>(
      "/promo-codes/my",
      { params },
    );
    return data.data;
  },

  toggleActive: async (promoCodeId: string, isActive: boolean) => {
    const { data } = await apiClient.patch(`/promo-codes/${promoCodeId}`, {
      isActive,
    });
    return data.data;
  },

  validate: async (code: string, courseId: string) => {
    const { data } = await apiClient.post(`/promo-codes/validate`, {
      code,
      courseId,
    });
    return data.data;
  },
};

// ----------------------------------------------------------
// Saved payment methods
// ----------------------------------------------------------
// Falls back to per-user localStorage until the payments service exposes
// these endpoints. Only Stripe's non-sensitive card summary is stored.
const paymentMethodsStorageKey = () => `${PAYMENT_METHODS_STORAGE_KEY}:${currentUserKey()}`;
const readSavedPaymentMethods = () => readStorage<SavedPaymentMethod[]>(paymentMethodsStorageKey(), []);
const writeSavedPaymentMethods = (methods: SavedPaymentMethod[]) => {
  // Exactly one default whenever any card is saved.
  const withDefault = methods.length > 0 && !methods.some((m) => m.isDefault)
    ? methods.map((m, index) => ({ ...m, isDefault: index === 0 }))
    : methods;
  writeStorage(paymentMethodsStorageKey(), withDefault);
  return withDefault;
};

export const paymentMethodsApi = {
  list: async (): Promise<SavedPaymentMethod[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<SavedPaymentMethod[]>>('/payment-methods');
      return data.data;
    } catch {
      return readSavedPaymentMethods();
    }
  },

  add: async (payload: Omit<SavedPaymentMethod, 'isDefault' | 'createdAt'>): Promise<SavedPaymentMethod> => {
    try {
      const { data } = await apiClient.post<ApiResponse<SavedPaymentMethod>>('/payment-methods', {
        paymentMethodId: payload.id,
      });
      return data.data;
    } catch {
      const stored = readSavedPaymentMethods();
      const method: SavedPaymentMethod = {
        ...payload,
        isDefault: stored.length === 0,
        createdAt: new Date().toISOString(),
      };
      writeSavedPaymentMethods([...stored.filter((m) => m.id !== method.id), method]);
      return method;
    }
  },

  remove: async (paymentMethodId: string): Promise<void> => {
    try {
      await apiClient.delete(`/payment-methods/${paymentMethodId}`);
    } catch {
      writeSavedPaymentMethods(readSavedPaymentMethods().filter((m) => m.id !== paymentMethodId));
    }
  },

  setDefault: async (paymentMethodId: string): Promise<void> => {
    try {
      await apiClient.patch(`/payment-methods/${paymentMethodId}/default`);
    } catch {
      writeSavedPaymentMethods(
        readSavedPaymentMethods().map((m) => ({ ...m, isDefault: m.id === paymentMethodId })),
      );
    }
  },
};

// ----------------------------------------------------------
// Contact
// ----------------------------------------------------------
export const contactApi = {
  submitContactForm: async (payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<{ id: string; createdAt: string }>>(
      '/contact',
      payload,
    );
    return data.data;
  },
};

// ----------------------------------------------------------
// Two-Factor Authentication
// ----------------------------------------------------------
export const twoFactorApi = {
  setupInitiate: async (): Promise<{ qrCode: string; secret: string }> => {
    const { data } = await apiClient.post<ApiResponse<{ qrCode: string; secret: string }>>(
      '/2fa/setup',
    );
    return data.data;
  },

  setupVerify: async (code: string): Promise<{ backupCodes: string[] }> => {
    const { data } = await apiClient.post<ApiResponse<{ backupCodes: string[] }>>(
      '/2fa/verify',
      { code },
    );
    return data.data;
  },

  disable: async (code: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post<ApiResponse<{ success: boolean }>>(
      '/2fa/disable',
      { code },
    );
    return data.data;
  },

  getStatus: async (): Promise<{ enabled: boolean }> => {
    const { data } = await apiClient.get<ApiResponse<{ enabled: boolean }>>(
      '/2fa/status',
    );
    return data.data;
  },
};



// ----------------------------------------------------------
// Gifts
// ----------------------------------------------------------
export const giftsApi = {
  create: async (payload: {
    courseId: string;
    recipientEmail: string;
    message?: string;
    deliveryDate?: string;
  }): Promise<Gift> => {
    const { data } = await apiClient.post<ApiResponse<Gift>>("/gifts", payload);
    return data.data;
  },

  getByToken: async (token: string): Promise<Gift> => {
    const { data } = await apiClient.get<ApiResponse<Gift>>(`/gifts/claim/${token}`);
    return data.data;
  },

  claim: async (token: string): Promise<Gift> => {
    const { data } = await apiClient.post<ApiResponse<Gift>>(`/gifts/claim/${token}`);
    return data.data;
  },
};

// ----------------------------------------------------------
// Leaderboard
// ----------------------------------------------------------
export const leaderboardApi = {
  get: async (period: LeaderboardPeriod = "week"): Promise<LeaderboardResponse> => {
    const { data } = await apiClient.get<ApiResponse<LeaderboardResponse>>("/leaderboard", {
      params: { period },
    });
    return data.data;
  },
};

// ----------------------------------------------------------
// Tags
// ----------------------------------------------------------
export const tagsApi = {
  search: async (query: string): Promise<string[]> => {
    const { data } = await apiClient.get<ApiResponse<string[]>>("/tags", {
      params: { q: query },
    });
    return data.data;
  },
};

// ----------------------------------------------------------
// Instructor Applications
// ----------------------------------------------------------
export const instructorApplicationApi = {
  apply: async (payload: {
    name: string;
    email: string;
    expertiseArea: string;
    portfolioUrl: string;
    bio: string;
  }): Promise<{ message: string }> => {
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
      '/instructor-applications',
      payload,
    );
    return data.data;
  },
};

// ----------------------------------------------------------
// Achievements & Badges
// ----------------------------------------------------------
const ACHIEVEMENTS_STORAGE_KEY = "hamplard_achievements";

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-lesson",
    title: "First Step",
    description: "Completed your first lesson on Hamplard.",
    criteria: "Complete any 1 lesson in any enrolled course.",
    icon: "BookOpen",
    category: "learning",
    earned: true,
    earnedAt: "2026-10-18T10:00:00.000Z",
    progress: 100,
    rarity: "common",
  },
  {
    id: "streak-7",
    title: "7-Day Streak",
    description: "Learned consistently for 7 consecutive days.",
    criteria: "Maintain an uninterrupted learning streak of 7 days.",
    icon: "Flame",
    category: "streak",
    earned: true,
    earnedAt: "2026-10-20T12:00:00.000Z",
    progress: 100,
    rarity: "rare",
  },
  {
    id: "first-assignment",
    title: "Project Pioneer",
    description: "Submitted an assignment and received instructor approval.",
    criteria: "Submit a project assignment and have it approved by the course instructor.",
    icon: "ClipboardCheck",
    category: "learning",
    earned: false,
    earnedAt: null,
    progress: 50,
    rarity: "rare",
  },
  {
    id: "first-certificate",
    title: "Certified Creator",
    description: "Completed a full course curriculum and minted a Stellar certificate.",
    criteria: "Finish all course modules and receive a cryptographically verified certificate.",
    icon: "Award",
    category: "certificates",
    earned: false,
    earnedAt: null,
    progress: 80,
    rarity: "epic",
  },
  {
    id: "speed-learner",
    title: "Quick Study",
    description: "Completed 3 lessons in a single 24-hour window.",
    criteria: "Complete at least 3 distinct lessons within one day.",
    icon: "Zap",
    category: "learning",
    earned: true,
    earnedAt: "2026-10-19T14:30:00.000Z",
    progress: 100,
    rarity: "common",
  },
  {
    id: "quiz-master",
    title: "Ace Student",
    description: "Achieved a 100% score on a module quiz.",
    criteria: "Answer every question correctly in any graded course quiz.",
    icon: "GraduationCap",
    category: "learning",
    earned: false,
    earnedAt: null,
    progress: 60,
    rarity: "rare",
  },
  {
    id: "night-owl",
    title: "Midnight Scholar",
    description: "Finished a lesson during evening hours (10 PM – 4 AM).",
    criteria: "Complete a lesson between 10:00 PM and 4:00 AM local time.",
    icon: "Moon",
    category: "streak",
    earned: false,
    earnedAt: null,
    progress: 0,
    rarity: "common",
  },
  {
    id: "master-polymath",
    title: "Vocational Master",
    description: "Enrolled in 3 different vocational skill tracks.",
    criteria: "Enroll and participate in courses across 3 different craft categories.",
    icon: "Trophy",
    category: "community",
    earned: false,
    earnedAt: null,
    progress: 66,
    rarity: "legendary",
  },
];

export const achievementsApi = {
  getAll: async (): Promise<Achievement[]> => {
    return readStorage<Achievement[]>(ACHIEVEMENTS_STORAGE_KEY, DEFAULT_ACHIEVEMENTS);
  },
  getSummary: async (): Promise<{ earned: Achievement[]; locked: Achievement[]; total: number }> => {
    const all = await achievementsApi.getAll();
    const earned = all.filter((a) => a.earned);
    const locked = all.filter((a) => !a.earned);
    return { earned, locked, total: all.length };
  },
  award: async (id: string): Promise<Achievement | null> => {
    const all = await achievementsApi.getAll();
    const index = all.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const updated = {
      ...all[index],
      earned: true,
      earnedAt: new Date().toISOString(),
      progress: 100,
    };
    all[index] = updated;
    writeStorage(ACHIEVEMENTS_STORAGE_KEY, all);
    if (isBrowser) {
      window.dispatchEvent(new CustomEvent('hamplard:achievement-earned', { detail: updated }));
    }
    return updated;
  },
};

// ----------------------------------------------------------
// Student Messages
// ----------------------------------------------------------
const CONVERSATIONS_STORAGE_KEY = "hamplard_conversations";
const MESSAGES_STORAGE_PREFIX = "hamplard_thread_";

export const DEFAULT_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    participantId: "inst-1",
    participantName: "Amina Adeleke",
    participantAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    participantRole: "INSTRUCTOR",
    courseId: "1",
    courseTitle: "Modern Tailoring & Garment Construction",
    lastMessage: {
      id: "msg-1-3",
      conversationId: "conv-1",
      senderId: "inst-1",
      senderName: "Amina Adeleke",
      senderRole: "INSTRUCTOR",
      content: "Your French seam photo looks wonderful! Make sure to press after stitching.",
      createdAt: "2026-10-21T18:30:00.000Z",
      read: false,
    },
    unreadCount: 1,
    updatedAt: "2026-10-21T18:30:00.000Z",
  },
  {
    id: "conv-2",
    participantId: "inst-2",
    participantName: "Chidi Okafor",
    participantAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    participantRole: "INSTRUCTOR",
    courseId: "2",
    courseTitle: "Professional Bridal Makeup Artistry",
    lastMessage: {
      id: "msg-2-2",
      conversationId: "conv-2",
      senderId: "inst-2",
      senderName: "Chidi Okafor",
      senderRole: "INSTRUCTOR",
      content: "Let me know when you try the warm undertone foundation blend exercise.",
      createdAt: "2026-10-21T15:00:00.000Z",
      read: true,
    },
    unreadCount: 0,
    updatedAt: "2026-10-21T15:00:00.000Z",
  },
  {
    id: "conv-3",
    participantId: "inst-3",
    participantName: "Zainab Bello",
    participantAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
    participantRole: "INSTRUCTOR",
    courseId: "3",
    courseTitle: "Artisanal Baking & Pastry Arts",
    lastMessage: {
      id: "msg-3-1",
      conversationId: "conv-3",
      senderId: "inst-3",
      senderName: "Zainab Bello",
      senderRole: "INSTRUCTOR",
      content: "Welcome to the sourdough masterclass! Feel free to share your starter fermentation questions here.",
      createdAt: "2026-10-20T09:00:00.000Z",
      read: true,
    },
    unreadCount: 0,
    updatedAt: "2026-10-20T09:00:00.000Z",
  },
];

export const messagesApi = {
  getConversations: async (): Promise<Conversation[]> => {
    return readStorage<Conversation[]>(CONVERSATIONS_STORAGE_KEY, DEFAULT_CONVERSATIONS);
  },
  getMessages: async (conversationId: string): Promise<DirectMessage[]> => {
    const defaultMessages: Record<string, DirectMessage[]> = {
      "conv-1": [
        {
          id: "msg-1-1",
          conversationId: "conv-1",
          senderId: "student-1",
          senderName: "You",
          senderRole: "STUDENT",
          content: "Hello instructor Amina! I have completed step 3 on French seams. Here is my seam sample.",
          createdAt: "2026-10-21T17:30:00.000Z",
          read: true,
        },
        {
          id: "msg-1-2",
          conversationId: "conv-1",
          senderId: "inst-1",
          senderName: "Amina Adeleke",
          senderRole: "INSTRUCTOR",
          content: "Hi! Great work getting to module 2 so quickly. Looking at the seam now.",
          createdAt: "2026-10-21T18:00:00.000Z",
          read: true,
        },
        {
          id: "msg-1-3",
          conversationId: "conv-1",
          senderId: "inst-1",
          senderName: "Amina Adeleke",
          senderRole: "INSTRUCTOR",
          content: "Your French seam photo looks wonderful! Make sure to press after stitching.",
          createdAt: "2026-10-21T18:30:00.000Z",
          read: false,
        },
      ],
      "conv-2": [
        {
          id: "msg-2-1",
          conversationId: "conv-2",
          senderId: "student-1",
          senderName: "You",
          senderRole: "STUDENT",
          content: "Hi Chidi! What lighting setup do you recommend for contouring practice?",
          createdAt: "2026-10-21T13:00:00.000Z",
          read: true,
        },
        {
          id: "msg-2-2",
          conversationId: "conv-2",
          senderId: "inst-2",
          senderName: "Chidi Okafor",
          senderRole: "INSTRUCTOR",
          content: "Let me know when you try the warm undertone foundation blend exercise.",
          createdAt: "2026-10-21T15:00:00.000Z",
          read: true,
        },
      ],
      "conv-3": [
        {
          id: "msg-3-1",
          conversationId: "conv-3",
          senderId: "inst-3",
          senderName: "Zainab Bello",
          senderRole: "INSTRUCTOR",
          content: "Welcome to the sourdough masterclass! Feel free to share your starter fermentation questions here.",
          createdAt: "2026-10-20T09:00:00.000Z",
          read: true,
        },
      ],
    };

    return readStorage<DirectMessage[]>(
      `${MESSAGES_STORAGE_PREFIX}${conversationId}`,
      defaultMessages[conversationId] ?? []
    );
  },
  sendMessage: async (
    conversationId: string,
    content: string,
    attachments: MessageAttachment[] = []
  ): Promise<DirectMessage> => {
    const current = await messagesApi.getMessages(conversationId);
    const newMessage: DirectMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: "student-me",
      senderName: "You",
      senderRole: "STUDENT",
      content,
      attachments,
      createdAt: new Date().toISOString(),
      read: true,
    };
    const updated = [...current, newMessage];
    writeStorage(`${MESSAGES_STORAGE_PREFIX}${conversationId}`, updated);

    // Update conversation last message
    const conversations = await messagesApi.getConversations();
    const convIndex = conversations.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1) {
      conversations[convIndex] = {
        ...conversations[convIndex],
        lastMessage: newMessage,
        updatedAt: newMessage.createdAt,
      };
      writeStorage(CONVERSATIONS_STORAGE_KEY, conversations);
    }

    if (isBrowser) {
      window.dispatchEvent(new CustomEvent('hamplard:messages-updated'));
    }

    return newMessage;
  },
  markAsRead: async (conversationId: string): Promise<void> => {
    const conversations = await messagesApi.getConversations();
    const convIndex = conversations.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1 && conversations[convIndex].unreadCount > 0) {
      conversations[convIndex] = {
        ...conversations[convIndex],
        unreadCount: 0,
      };
      writeStorage(CONVERSATIONS_STORAGE_KEY, conversations);
    }

    // Mark thread messages read
    const thread = await messagesApi.getMessages(conversationId);
    let changed = false;
    const updatedThread = thread.map((m) => {
      if (!m.read) {
        changed = true;
        return { ...m, read: true };
      }
      return m;
    });
    if (changed) {
      writeStorage(`${MESSAGES_STORAGE_PREFIX}${conversationId}`, updatedThread);
    }

    if (isBrowser) {
      window.dispatchEvent(new CustomEvent('hamplard:messages-updated'));
    }
  },
  getUnreadCount: async (): Promise<number> => {
    const conversations = await messagesApi.getConversations();
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  },
};

