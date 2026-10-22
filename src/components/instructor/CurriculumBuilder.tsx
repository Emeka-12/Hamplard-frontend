'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Video,
  FileText,
  HelpCircle,
  ClipboardList,
} from 'lucide-react';
import { lessonsApi } from '@/lib/api/services';
import { useToastContext } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/utils';
import type { CourseModule, Lesson } from '@/types';

// ── types ─────────────────────────────────────────────────────────────────

type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';

const LESSON_TYPE_META: Record<LessonType, { label: string; Icon: React.ElementType }> = {
  VIDEO: { label: 'Video', Icon: Video },
  TEXT: { label: 'Text', Icon: FileText },
  QUIZ: { label: 'Quiz', Icon: HelpCircle },
  ASSIGNMENT: { label: 'Assignment', Icon: ClipboardList },
};

export interface CurriculumBuilderProps {
  courseId: string;
  modules: CourseModule[];
}

// ── tiny inline-rename input ──────────────────────────────────────────────

function InlineRename({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.select();
  }, []);

  return (
    <form
      className="flex items-center gap-1 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave(value.trim());
      }}
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Rename"
      />
      <button type="submit" aria-label="Confirm rename" className="p-1 text-green-600 hover:text-green-700">
        <Check className="w-4 h-4" aria-hidden />
      </button>
      <button type="button" onClick={onCancel} aria-label="Cancel rename" className="p-1 text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" aria-hidden />
      </button>
    </form>
  );
}

// ── lesson row ────────────────────────────────────────────────────────────

function LessonRow({
  lesson,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
  dragProps,
}: {
  lesson: Lesson;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLLIElement>;
}) {
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const meta = LESSON_TYPE_META[lesson.type as LessonType] ?? LESSON_TYPE_META.VIDEO;
  const { Icon } = meta;

  return (
    <li
      {...dragProps}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 group',
        dragProps.className,
      )}
    >
      <span
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
        aria-hidden
      >
        <GripVertical className="w-4 h-4" />
      </span>

      <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden />

      {renaming ? (
        <InlineRename
          initial={lesson.title}
          onSave={(t) => { onRename(t); setRenaming(false); }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">{lesson.title}</span>
      )}

      <span className="hidden sm:inline text-xs text-gray-400 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
        {meta.label}
      </span>

      {/* keyboard move */}
      <div className="flex flex-col opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          disabled={isFirst}
          onClick={onMoveUp}
          aria-label="Move lesson up"
          className="disabled:opacity-30 text-gray-400 hover:text-gray-600"
        >
          <ChevronUp className="w-3 h-3" aria-hidden />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={onMoveDown}
          aria-label="Move lesson down"
          className="disabled:opacity-30 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className="w-3 h-3" aria-hidden />
        </button>
      </div>

      {!renaming && !confirming && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => setRenaming(true)}
            aria-label={`Rename lesson ${lesson.title}`}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete lesson ${lesson.title}`}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      )}

      {confirming && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-red-600 dark:text-red-400">Delete?</span>
          <button
            type="button"
            onClick={() => { onDelete(); setConfirming(false); }}
            className="font-medium text-red-600 hover:text-red-700"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            No
          </button>
        </div>
      )}
    </li>
  );
}

// ── module card ───────────────────────────────────────────────────────────

function ModuleCard({
  module,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRenameModule,
  onDeleteModule,
  onAddLesson,
  onMoveLessonUp,
  onMoveLessonDown,
  onRenameLesson,
  onDeleteLesson,
}: {
  module: CourseModule;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRenameModule: (title: string) => void;
  onDeleteModule: () => void;
  onAddLesson: (type: LessonType) => void;
  onMoveLessonUp: (index: number) => void;
  onMoveLessonDown: (index: number) => void;
  onRenameLesson: (index: number, title: string) => void;
  onDeleteLesson: (index: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const [renamingModule, setRenamingModule] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showLessonMenu, setShowLessonMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // drag-over state for lessons
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragSrcIndex = useRef<number | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowLessonMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      {/* module header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <span className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0" aria-hidden>
          <GripVertical className="w-4 h-4" />
        </span>

        {renamingModule ? (
          <InlineRename
            initial={module.title}
            onSave={(t) => { onRenameModule(t); setRenamingModule(false); }}
            onCancel={() => setRenamingModule(false)}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex-1 flex items-center gap-2 text-left text-sm font-semibold text-gray-800 dark:text-gray-100"
              aria-expanded={open}
            >
              {open ? <ChevronDown className="w-4 h-4 flex-shrink-0" aria-hidden /> : <ChevronUp className="w-4 h-4 flex-shrink-0" aria-hidden />}
              {module.title}
              <span className="ml-1 text-xs font-normal text-gray-400">
                {module.lessons.length} lesson{module.lessons.length !== 1 ? 's' : ''}
              </span>
            </button>

            {/* module keyboard reorder */}
            <div className="flex flex-col">
              <button
                type="button"
                disabled={isFirst}
                onClick={onMoveUp}
                aria-label="Move module up"
                className="disabled:opacity-30 text-gray-400 hover:text-gray-600"
              >
                <ChevronUp className="w-3 h-3" aria-hidden />
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={onMoveDown}
                aria-label="Move module down"
                className="disabled:opacity-30 text-gray-400 hover:text-gray-600"
              >
                <ChevronDown className="w-3 h-3" aria-hidden />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRenamingModule(true)}
              aria-label={`Rename module ${module.title}`}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden />
            </button>

            {confirmingDelete ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-600">Delete module?</span>
                <button type="button" onClick={onDeleteModule} className="font-medium text-red-600 hover:text-red-700">Yes</button>
                <button type="button" onClick={() => setConfirmingDelete(false)} className="text-gray-500">No</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete module ${module.title}`}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
              </button>
            )}
          </>
        )}
      </div>

      {/* lessons */}
      {open && (
        <div className="px-4 py-3 space-y-2">
          <ul className="space-y-1.5">
            {module.lessons.map((lesson, index) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                isFirst={index === 0}
                isLast={index === module.lessons.length - 1}
                onMoveUp={() => onMoveLessonUp(index)}
                onMoveDown={() => onMoveLessonDown(index)}
                onRename={(t) => onRenameLesson(index, t)}
                onDelete={() => onDeleteLesson(index)}
                dragProps={{
                  draggable: true,
                  onDragStart: () => { dragSrcIndex.current = index; },
                  onDragOver: (e: React.DragEvent) => {
                    e.preventDefault();
                    setDragOverIndex(index);
                  },
                  onDragLeave: () => setDragOverIndex(null),
                  onDrop: () => {
                    if (dragSrcIndex.current !== null && dragSrcIndex.current !== index) {
                      const from = dragSrcIndex.current;
                      // swap via move-up/down sequence handled by parent
                      const diff = index - from;
                      for (let i = 0; i < Math.abs(diff); i++) {
                        if (diff > 0) onMoveLessonDown(from + i);
                        else onMoveLessonUp(from - i);
                      }
                    }
                    dragSrcIndex.current = null;
                    setDragOverIndex(null);
                  },
                  onDragEnd: () => { dragSrcIndex.current = null; setDragOverIndex(null); },
                  className: cn(dragOverIndex === index && 'ring-2 ring-primary ring-offset-1'),
                }}
              />
            ))}
          </ul>

          {/* add lesson */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowLessonMenu((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
              aria-haspopup="menu"
              aria-expanded={showLessonMenu}
            >
              <Plus className="w-4 h-4" aria-hidden />
              Add lesson
            </button>
            {showLessonMenu && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 z-10 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1"
              >
                {(Object.keys(LESSON_TYPE_META) as LessonType[]).map((type) => {
                  const { label, Icon } = LESSON_TYPE_META[type];
                  return (
                    <button
                      key={type}
                      role="menuitem"
                      type="button"
                      onClick={() => { onAddLesson(type); setShowLessonMenu(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Icon className="w-4 h-4 text-gray-400" aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CurriculumBuilder ─────────────────────────────────────────────────────

export function CurriculumBuilder({ courseId, modules: initialModules }: CurriculumBuilderProps) {
  const toast = useToastContext();
  const [modules, setModules] = useState<CourseModule[]>(() =>
    [...initialModules].sort((a, b) => a.position - b.position),
  );
  const [saving, setSaving] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // drag-over state for modules
  const [moduleDragOver, setModuleDragOver] = useState<number | null>(null);
  const moduleDragSrc = useRef<number | null>(null);

  const scheduleAutosave = useCallback(
    (updated: CourseModule[]) => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await Promise.all(
            updated.map((mod, i) =>
              coursesApi.update(courseId, { modules: updated } as any).catch(() => {}),
            ),
          );
        } finally {
          setSaving(false);
        }
      }, 1500);
    },
    [courseId],
  );

  const swapModules = (i: number, j: number) => {
    setModules((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      scheduleAutosave(next);
      return next;
    });
  };

  const swapLessons = (moduleIndex: number, i: number, j: number) => {
    setModules((prev) => {
      const next = prev.map((m, mi) => {
        if (mi !== moduleIndex) return m;
        const lessons = [...m.lessons];
        [lessons[i], lessons[j]] = [lessons[j], lessons[i]];
        return { ...m, lessons };
      });
      scheduleAutosave(next);
      return next;
    });
  };

  const handleAddModule = async () => {
    const title = `Module ${modules.length + 1}`;
    try {
      const created = await lessonsApi.createModule(courseId, title, modules.length);
      setModules((prev) => [...prev, created]);
    } catch {
      toast.error({ title: 'Failed to add module' });
    }
  };

  const handleDeleteModule = (moduleIndex: number) => {
    setModules((prev) => {
      const next = prev.filter((_, i) => i !== moduleIndex);
      scheduleAutosave(next);
      return next;
    });
  };

  const handleRenameModule = (moduleIndex: number, title: string) => {
    setModules((prev) => {
      const next = prev.map((m, i) => (i === moduleIndex ? { ...m, title } : m));
      scheduleAutosave(next);
      return next;
    });
  };

  const handleAddLesson = async (moduleIndex: number, type: LessonType) => {
    const mod = modules[moduleIndex];
    const title = `New ${LESSON_TYPE_META[type].label} Lesson`;
    try {
      const created = await lessonsApi.createLesson({
        moduleId: mod.id,
        title,
        type,
        position: mod.lessons.length,
      });
      setModules((prev) =>
        prev.map((m, i) =>
          i === moduleIndex ? { ...m, lessons: [...m.lessons, created] } : m,
        ),
      );
    } catch {
      toast.error({ title: 'Failed to add lesson' });
    }
  };

  const handleRenameLesson = (moduleIndex: number, lessonIndex: number, title: string) => {
    setModules((prev) => {
      const next = prev.map((m, mi) => {
        if (mi !== moduleIndex) return m;
        const lessons = m.lessons.map((l, li) => (li === lessonIndex ? { ...l, title } : l));
        return { ...m, lessons };
      });
      scheduleAutosave(next);
      return next;
    });
  };

  const handleDeleteLesson = (moduleIndex: number, lessonIndex: number) => {
    setModules((prev) => {
      const next = prev.map((m, mi) => {
        if (mi !== moduleIndex) return m;
        return { ...m, lessons: m.lessons.filter((_, li) => li !== lessonIndex) };
      });
      scheduleAutosave(next);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Curriculum</h2>
        {saving && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
      </div>

      <div className="space-y-3">
        {modules.map((mod, mi) => (
          <div
            key={mod.id}
            draggable
            onDragStart={() => { moduleDragSrc.current = mi; }}
            onDragOver={(e) => { e.preventDefault(); setModuleDragOver(mi); }}
            onDragLeave={() => setModuleDragOver(null)}
            onDrop={() => {
              if (moduleDragSrc.current !== null && moduleDragSrc.current !== mi) {
                swapModules(moduleDragSrc.current, mi);
              }
              moduleDragSrc.current = null;
              setModuleDragOver(null);
            }}
            onDragEnd={() => { moduleDragSrc.current = null; setModuleDragOver(null); }}
            className={cn(moduleDragOver === mi && 'ring-2 ring-primary ring-offset-2 rounded-xl')}
          >
            <ModuleCard
              module={mod}
              isFirst={mi === 0}
              isLast={mi === modules.length - 1}
              onMoveUp={() => swapModules(mi, mi - 1)}
              onMoveDown={() => swapModules(mi, mi + 1)}
              onRenameModule={(t) => handleRenameModule(mi, t)}
              onDeleteModule={() => handleDeleteModule(mi)}
              onAddLesson={(type) => handleAddLesson(mi, type)}
              onMoveLessonUp={(li) => swapLessons(mi, li, li - 1)}
              onMoveLessonDown={(li) => swapLessons(mi, li, li + 1)}
              onRenameLesson={(li, t) => handleRenameLesson(mi, li, t)}
              onDeleteLesson={(li) => handleDeleteLesson(mi, li)}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddModule}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-500 hover:border-primary hover:text-primary w-full justify-center transition-colors"
      >
        <Plus className="w-4 h-4" aria-hidden />
        Add module
      </button>
    </div>
  );
}
