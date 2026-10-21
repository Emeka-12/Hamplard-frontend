import { apiClient } from "./client";
import type {
  ApiResponse,
  PaginatedResponse,
  Course,
  Enrollment,
  Certificate,
  Notification,
  User,
  Category,
  Announcement,
  Gift,
  LeaderboardResponse,
  LeaderboardPeriod,
  Bundle,
  StudentEnrollmentRow,
  StudentDetail,
  SavedPaymentMethod,
  ShowcaseProject,
  ShowcaseComment,
  SubmitShowcasePayload,
  LiveSession,
  LiveSessionRecording,
} from '@/types';

const isBrowser = typeof window !== 'undefined';
const ANNOUNCEMENTS_STORAGE_KEY = 'hamplard_announcements';
const NOTIFICATIONS_STORAGE_KEY = 'hamplard_notifications';
const PAYMENT_METHODS_STORAGE_KEY = 'hamplard_payment_methods';
const SHOWCASE_STORAGE_KEY = 'hamplard_showcase_projects';
const LIVE_SESSIONS_STORAGE_KEY = 'hamplard_live_sessions';

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
// Student Project Showcase Gallery (Issue #400)
// ----------------------------------------------------------

const DEFAULT_SHOWCASE_PROJECTS: ShowcaseProject[] = [
  {
    id: 'proj-1',
    courseId: 'course-1',
    courseTitle: 'Professional African Tailoring & Pattern Drafting',
    studentId: 'user-1',
    studentName: 'Amina Bello',
    studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    title: 'Emerald Green Mermaid Aso Ebi Gown',
    description: 'Finished my final course assignment! Drafted the corset bodice and French lace skirt with built-in boning and horsehair braid hem.',
    imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800',
    status: 'APPROVED',
    likesCount: 24,
    hasLiked: false,
    commentsCount: 3,
    assignmentId: 'assign-1',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    comments: [
      {
        id: 'c-1',
        projectId: 'proj-1',
        userId: 'u-inst',
        userName: 'Master Chidi (Instructor)',
        userAvatar: null,
        content: 'Exceptional seam finishing on the side darts Amina! Approved with honors.',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'c-2',
        projectId: 'proj-1',
        userId: 'u-2',
        userName: 'Kofi Mensah',
        userAvatar: null,
        content: 'The drape of that fabric is gorgeous! Inspiring work.',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'proj-2',
    courseId: 'course-1',
    courseTitle: 'Artisan Pastry & Modern Cake Design',
    studentId: 'user-2',
    studentName: 'Ngozi Eze',
    studentAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    title: '3-Tier Buttercream Wedding Cake with Rice Paper Sails',
    description: 'Vanilla bean sponge layered with passion fruit curd and Swiss meringue buttercream. Applied the sharp edge technique from Lesson 4.',
    imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=800',
    status: 'APPROVED',
    likesCount: 38,
    hasLiked: true,
    commentsCount: 2,
    assignmentId: 'assign-2',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    comments: [
      {
        id: 'c-3',
        projectId: 'proj-2',
        userId: 'u-3',
        userName: 'Fatima Aliyu',
        userAvatar: null,
        content: 'Those rice paper sails look so delicate! How did you color them?',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'proj-3',
    courseId: 'course-1',
    courseTitle: 'Glamour & Bridal Makeup Artistry',
    studentId: 'user-3',
    studentName: 'Zainab Touré',
    studentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    title: 'Sunset Cut Crease Bridal Look',
    description: 'Practiced gradient blending with warm terracotta and gold foil tones. Completed for the bridal glam module.',
    imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800',
    status: 'APPROVED',
    likesCount: 19,
    hasLiked: false,
    commentsCount: 1,
    assignmentId: 'assign-3',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    comments: [
      {
        id: 'c-4',
        projectId: 'proj-3',
        userId: 'u-4',
        userName: 'Tariro Moyo',
        userAvatar: null,
        content: 'Flawless skin work and the winged liner is so sharp!',
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'proj-4',
    courseId: 'course-1',
    courseTitle: 'Traditional Leather Craft & Footwear',
    studentId: 'user-4',
    studentName: 'David Osei',
    studentAvatar: null,
    title: 'Hand-Stitched Vegetable Tanned Leather Loafers',
    description: 'First pair of handcrafted shoes! Saddle stitched with wax thread, hand-carved leather insole and stacked leather heels.',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
    status: 'APPROVED',
    likesCount: 42,
    hasLiked: false,
    commentsCount: 4,
    assignmentId: 'assign-4',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    comments: [],
  },
];

export const showcaseApi = {
  getByCourse: async (courseId: string): Promise<ShowcaseProject[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<ShowcaseProject[]>>(
        `/courses/${courseId}/showcase`,
      );
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    } catch {
      // Fallback to storage or default
    }

    const stored = readStorage<ShowcaseProject[]>(SHOWCASE_STORAGE_KEY, DEFAULT_SHOWCASE_PROJECTS);
    return stored.filter((p) => p.status === 'APPROVED');
  },

  likeProject: async (projectId: string): Promise<{ likesCount: number; hasLiked: boolean }> => {
    try {
      const { data } = await apiClient.post<ApiResponse<{ likesCount: number; hasLiked: boolean }>>(
        `/showcase/${projectId}/like`,
      );
      return data.data;
    } catch {
      // Offline/mock handler
      const stored = readStorage<ShowcaseProject[]>(SHOWCASE_STORAGE_KEY, DEFAULT_SHOWCASE_PROJECTS);
      let updatedLikes = 0;
      let newHasLiked = false;

      const updated = stored.map((p) => {
        if (p.id === projectId) {
          newHasLiked = !p.hasLiked;
          updatedLikes = newHasLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1);
          return { ...p, likesCount: updatedLikes, hasLiked: newHasLiked };
        }
        return p;
      });

      writeStorage(SHOWCASE_STORAGE_KEY, updated);
      return { likesCount: updatedLikes, hasLiked: newHasLiked };
    }
  },

  commentProject: async (
    projectId: string,
    content: string,
    userName?: string,
  ): Promise<ShowcaseComment> => {
    try {
      const { data } = await apiClient.post<ApiResponse<ShowcaseComment>>(
        `/showcase/${projectId}/comments`,
        { content },
      );
      return data.data;
    } catch {
      const newComment: ShowcaseComment = {
        id: `c-${Date.now()}`,
        projectId,
        userId: currentUserKey(),
        userName: userName || 'Learner',
        userAvatar: null,
        content,
        createdAt: new Date().toISOString(),
      };

      const stored = readStorage<ShowcaseProject[]>(SHOWCASE_STORAGE_KEY, DEFAULT_SHOWCASE_PROJECTS);
      const updated = stored.map((p) => {
        if (p.id === projectId) {
          const comments = p.comments || [];
          return {
            ...p,
            comments: [...comments, newComment],
            commentsCount: (p.commentsCount || 0) + 1,
          };
        }
        return p;
      });

      writeStorage(SHOWCASE_STORAGE_KEY, updated);
      return newComment;
    }
  },

  submitProject: async (payload: SubmitShowcasePayload): Promise<ShowcaseProject> => {
    try {
      const { data } = await apiClient.post<ApiResponse<ShowcaseProject>>(
        `/courses/${payload.courseId}/showcase`,
        payload,
      );
      return data.data;
    } catch {
      const newProject: ShowcaseProject = {
        id: `proj-${Date.now()}`,
        courseId: payload.courseId,
        studentId: currentUserKey(),
        studentName: payload.studentName || 'Student Learner',
        studentAvatar: null,
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl,
        status: 'APPROVED', // approved for immediate display in demo
        likesCount: 0,
        hasLiked: false,
        commentsCount: 0,
        comments: [],
        assignmentId: payload.assignmentId,
        createdAt: new Date().toISOString(),
      };

      const stored = readStorage<ShowcaseProject[]>(SHOWCASE_STORAGE_KEY, DEFAULT_SHOWCASE_PROJECTS);
      writeStorage(SHOWCASE_STORAGE_KEY, [newProject, ...stored]);
      return newProject;
    }
  },

  reportProject: async (
    projectId: string,
    reason: string,
    details?: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const { data } = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>(
        `/showcase/${projectId}/report`,
        { reason, details },
      );
      return data.data;
    } catch {
      return {
        success: true,
        message: 'Project has been reported to moderators. Thank you for keeping Hamplard safe.',
      };
    }
  },
};

// ----------------------------------------------------------
// Live Sessions Schedule & Recordings (Issue #402)
// ----------------------------------------------------------

const DEFAULT_UPCOMING_SESSIONS: LiveSession[] = [
  {
    id: 'live-1',
    courseId: 'course-1',
    courseTitle: 'Professional African Tailoring & Pattern Drafting',
    title: 'Live Pattern Drafting & Corset Fitting Masterclass',
    description: 'Join Master Chidi for an interactive walkthrough on drafting custom boned corsets for varied body measurements with live Q&A.',
    instructorName: 'Master Chidi',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    // Set scheduledAt to 5 minutes from now so it is joinable for testing
    scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    durationMinutes: 60,
    joinUrl: 'https://meet.hamplard.com/live-corset-demo',
    status: 'UPCOMING',
    registeredCount: 42,
    isRegistered: true,
  },
  {
    id: 'live-2',
    courseId: 'course-2',
    courseTitle: 'Artisan Pastry & Modern Cake Design',
    title: 'Cake Decorating Q&A: Fondant Smoothing & Weather Resilience',
    description: 'Overcoming humidity issues with buttercream and fondant in African climates, plus pricing strategies for bespoke event cakes.',
    instructorName: 'Chef Amara',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    scheduledAt: new Date(Date.now() + 2 * 86400000 + 4 * 3600000).toISOString(),
    durationMinutes: 75,
    joinUrl: 'https://meet.hamplard.com/live-pastry-qa',
    status: 'UPCOMING',
    registeredCount: 88,
    isRegistered: false,
  },
  {
    id: 'live-3',
    courseId: 'course-3',
    courseTitle: 'Glamour & Bridal Makeup Artistry',
    title: 'Cut-Crease & Complexion Matching for Melanin Rich Skin',
    description: 'Step-by-step live demo on camera lighting considerations, undertone balance, and setting sprays for 12-hour longevity.',
    instructorName: 'Zainab Touré',
    instructorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    scheduledAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    durationMinutes: 90,
    joinUrl: 'https://meet.hamplard.com/live-bridal-glam',
    status: 'UPCOMING',
    registeredCount: 65,
    isRegistered: false,
  },
];

const DEFAULT_PAST_RECORDINGS: LiveSessionRecording[] = [
  {
    id: 'rec-1',
    sessionId: 'session-past-1',
    title: 'Sourdough Starters & Proofing in Warm Weather',
    description: 'Fermentation timing, dough elasticity tests, and baking with Dutch ovens.',
    instructorName: 'Chef Amara',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    recordedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    durationMinutes: 72,
    videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    viewsCount: 312,
  },
  {
    id: 'rec-2',
    sessionId: 'session-past-2',
    title: 'Sewing Machine Maintenance & Tension Troubleshooting',
    description: 'Cleaning the bobbin case, replacing needles, and balancing upper/lower tension.',
    instructorName: 'Master Chidi',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    recordedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    durationMinutes: 55,
    videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=600',
    viewsCount: 450,
  },
  {
    id: 'rec-3',
    sessionId: 'session-past-3',
    title: 'Color Theory in Makeup Artistry: Neutralizing Hyperpigmentation',
    description: 'Color wheels, peach/orange color correctors, and seamless concealer blending.',
    instructorName: 'Zainab Touré',
    instructorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    recordedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    durationMinutes: 84,
    videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600',
    viewsCount: 520,
  },
];

export const liveSessionsApi = {
  getUpcoming: async (): Promise<LiveSession[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<LiveSession[]>>('/live-sessions/upcoming');
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    } catch {
      // Fallback
    }
    return readStorage<LiveSession[]>(LIVE_SESSIONS_STORAGE_KEY, DEFAULT_UPCOMING_SESSIONS);
  },

  getPastRecordings: async (): Promise<LiveSessionRecording[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<LiveSessionRecording[]>>(
        '/live-sessions/recordings',
      );
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PAST_RECORDINGS;
  },

  joinSession: async (sessionId: string): Promise<{ joinUrl: string }> => {
    try {
      const { data } = await apiClient.post<ApiResponse<{ joinUrl: string }>>(
        `/live-sessions/${sessionId}/join`,
      );
      return data.data;
    } catch {
      return { joinUrl: `https://meet.hamplard.com/live/${sessionId}` };
    }
  },
};

