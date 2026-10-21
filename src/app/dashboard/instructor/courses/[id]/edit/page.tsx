'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ChevronLeft, Save, Send } from 'lucide-react';
import { coursesApi } from '@/lib/api/services';
import { useToastContext } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';
import { CurriculumBuilder } from '@/components/instructor/CurriculumBuilder';

// ── schema ────────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  level: z.string().min(1, 'Level is required'),
  language: z.string().min(1, 'Language is required'),
});

const pricingSchema = z.object({
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
});

type DetailsForm = z.infer<typeof detailsSchema>;
type PricingForm = z.infer<typeof pricingSchema>;

// ── constants ─────────────────────────────────────────────────────────────

const TABS = ['Details', 'Curriculum', 'Pricing', 'Media', 'Settings'] as const;
type Tab = (typeof TABS)[number];

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All levels'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Arabic', 'Chinese'];

// ── helpers ───────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

// ── Details tab ───────────────────────────────────────────────────────────

function DetailsTab({ course, onDirty }: { course: Course; onDirty: () => void }) {
  const toast = useToastContext();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    coursesApi.getCategories().then((cats) => setCategories(cats.map((c) => c.name))).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      title: course.title,
      description: course.description ?? '',
      category: course.category,
      level: course.level,
      language: course.language,
    },
  });

  useEffect(() => {
    if (isDirty) onDirty();
  }, [isDirty, onDirty]);

  const onSubmit = async (values: DetailsForm) => {
    setSaving(true);
    try {
      await coursesApi.update(course.id, values);
      toast.success({ title: 'Details saved', description: 'Course details updated successfully.' });
    } catch {
      toast.error({ title: 'Save failed', description: 'Could not save course details. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div>
        <Label htmlFor="title" required>Title</Label>
        <input
          id="title"
          type="text"
          {...register('title')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <FieldError message={errors.title?.message} />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={5}
          {...register('description')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="category" required>Category</Label>
          <select
            id="category"
            {...register('category')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select…</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <FieldError message={errors.category?.message} />
        </div>

        <div>
          <Label htmlFor="level" required>Level</Label>
          <select
            id="level"
            {...register('level')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select…</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <FieldError message={errors.level?.message} />
        </div>

        <div>
          <Label htmlFor="language" required>Language</Label>
          <select
            id="language"
            {...register('language')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select…</option>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <FieldError message={errors.language?.message} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="w-4 h-4" aria-hidden />
          {saving ? 'Saving…' : 'Save Details'}
        </button>
      </div>
    </form>
  );
}

// ── Pricing tab ───────────────────────────────────────────────────────────

function PricingTab({ course, onDirty }: { course: Course; onDirty: () => void }) {
  const toast = useToastContext();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<PricingForm>({
    resolver: zodResolver(pricingSchema),
    defaultValues: { price: course.price },
  });

  useEffect(() => {
    if (isDirty) onDirty();
  }, [isDirty, onDirty]);

  const onSubmit = async (values: PricingForm) => {
    setSaving(true);
    try {
      await coursesApi.update(course.id, { price: values.price });
      toast.success({ title: 'Pricing saved' });
    } catch {
      toast.error({ title: 'Save failed', description: 'Could not update pricing.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
      <div>
        <Label htmlFor="price" required>Price (USDC)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
          <input
            id="price"
            type="number"
            step="0.01"
            min="0"
            {...register('price')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <FieldError message={errors.price?.message} />
        <p className="mt-1 text-xs text-gray-500">Set to 0 to offer the course for free.</p>
      </div>

      <div>
        <Label htmlFor="platformFee">Platform fee (%)</Label>
        <input
          id="platformFee"
          type="number"
          readOnly
          value={course.platformFeePercent}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">Platform fee is set by Hamplard and cannot be changed.</p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="w-4 h-4" aria-hidden />
          {saving ? 'Saving…' : 'Save Pricing'}
        </button>
      </div>
    </form>
  );
}

// ── Media tab ─────────────────────────────────────────────────────────────

function MediaTab({ course, onDirty }: { course: Course; onDirty: () => void }) {
  const toast = useToastContext();
  const [saving, setSaving] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnailUrl ?? '');
  const [previewUrl, setPreviewUrl] = useState(course.previewVideoUrl ?? '');

  const isDirty = thumbnailUrl !== (course.thumbnailUrl ?? '') || previewUrl !== (course.previewVideoUrl ?? '');

  useEffect(() => {
    if (isDirty) onDirty();
  }, [isDirty, onDirty]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await coursesApi.update(course.id, {
        thumbnailUrl: thumbnailUrl || undefined,
        previewVideoUrl: previewUrl || undefined,
      });
      toast.success({ title: 'Media saved' });
    } catch {
      toast.error({ title: 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
        <input
          id="thumbnailUrl"
          type="url"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt="Course thumbnail preview" className="mt-3 h-32 rounded-lg object-cover" />
        )}
      </div>

      <div>
        <Label htmlFor="previewVideoUrl">Preview video URL</Label>
        <input
          id="previewVideoUrl"
          type="url"
          value={previewUrl}
          onChange={(e) => setPreviewUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="w-4 h-4" aria-hidden />
          {saving ? 'Saving…' : 'Save Media'}
        </button>
      </div>
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────

function SettingsTab({ course }: { course: Course }) {
  const toast = useToastContext();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = course.status === 'DRAFT';

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    try {
      await coursesApi.submitForReview(course.id);
      toast.success({ title: 'Submitted for review', description: 'Your course will be reviewed shortly.' });
      router.push('/dashboard/instructor/courses');
    } catch {
      toast.error({ title: 'Submission failed', description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current status</p>
        <p className="mt-1 text-sm text-gray-500 capitalize">{course.status.toLowerCase().replace('_', ' ')}</p>
      </div>

      {canSubmit && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">Ready to publish?</p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Submitting sends your course to Hamplard's review team. You can still edit it while under review.
          </p>
          <button
            onClick={handleSubmitForReview}
            disabled={submitting}
            className="mt-3 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" aria-hidden />
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CourseEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Details');
  const [hasUnsaved, setHasUnsaved] = useState(false);

  useEffect(() => {
    coursesApi
      .get(params.id)
      .then(setCourse)
      .catch(() => {
        toast.error({ title: 'Course not found', description: 'Unable to load this course.' });
        router.push('/dashboard/instructor/courses');
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const markDirty = useCallback(() => setHasUnsaved(true), []);

  const handleTabChange = (tab: Tab) => {
    if (hasUnsaved) {
      const confirmed = window.confirm('You have unsaved changes. Leave this tab anyway?');
      if (!confirmed) return;
      setHasUnsaved(false);
    }
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" aria-label="Loading…" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (hasUnsaved) {
              const confirmed = window.confirm('You have unsaved changes. Leave anyway?');
              if (!confirmed) return;
            }
            router.push('/dashboard/instructor/courses');
          }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="Back to courses"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
          Edit: {course.title}
        </h1>
        {hasUnsaved && (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" aria-hidden />
            Unsaved changes
          </span>
        )}
      </div>

      {/* tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-1" aria-label="Edit course sections">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300',
              )}
              aria-selected={activeTab === tab}
              role="tab"
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* tab panels */}
      <div role="tabpanel">
        {activeTab === 'Details' && <DetailsTab course={course} onDirty={markDirty} />}
        {activeTab === 'Curriculum' && <CurriculumBuilder courseId={course.id} modules={course.modules} />}
        {activeTab === 'Pricing' && <PricingTab course={course} onDirty={markDirty} />}
        {activeTab === 'Media' && <MediaTab course={course} onDirty={markDirty} />}
        {activeTab === 'Settings' && <SettingsTab course={course} />}
      </div>
    </div>
  );
}
