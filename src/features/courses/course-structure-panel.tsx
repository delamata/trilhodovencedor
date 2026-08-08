'use client';

import { Plus, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addModuleAction, updateLessonTemplateAction, type ModuleGroup } from './actions';

export function CourseStructurePanel({
  courseId,
  modules,
}: {
  courseId: string;
  modules: ModuleGroup[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [lesson1Title, setLesson1Title] = useState('');
  const [lesson2Title, setLesson2Title] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<{ id: string; title: string; description: string } | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function handleAddModule() {
    if (!lesson1Title.trim() || !lesson2Title.trim()) {
      toast.error('Informe os títulos das duas aulas do módulo.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await addModuleAction(courseId, lesson1Title.trim(), lesson2Title.trim(), description.trim());
      if (result.success) {
        toast.success(result.message);
        setAddOpen(false);
        setLesson1Title('');
        setLesson2Title('');
        setDescription('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSave() {
    if (!editing) return;
    setEditSubmitting(true);
    try {
      const result = await updateLessonTemplateAction(editing.id, editing.title.trim(), editing.description.trim());
      if (result.success) {
        toast.success(result.message);
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Estrutura acadêmica</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo módulo
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo módulo</DialogTitle>
              <DialogDescription>
                Todo módulo tem exatamente 2 aulas, criadas juntas. Os códigos (ex.: MA01-01,
                MA01-02) são gerados automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="lesson1">Aula 1 — título</Label>
                <Input id="lesson1" value={lesson1Title} onChange={(e) => setLesson1Title(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lesson2">Aula 2 — título</Label>
                <Input id="lesson2" value={lesson2Title} onChange={(e) => setLesson2Title(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="module-description">Descrição do módulo (opcional)</Label>
                <Textarea id="module-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddModule} disabled={submitting}>
                {submitting ? 'Criando…' : 'Criar módulo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {modules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum módulo cadastrado ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {modules.map((mod) => (
            <div key={mod.moduleNumber} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-2 text-sm font-semibold text-muted-foreground">Módulo {mod.moduleNumber}</p>
              <div className="space-y-2">
                {mod.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {lesson.lesson_code}
                      </Badge>
                      <span className="text-sm text-foreground">{lesson.title}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditing({ id: lesson.id, title: lesson.title, description: lesson.description ?? '' })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar aula</DialogTitle>
            <DialogDescription>Só o título e a descrição podem ser alterados.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={handleEditSave} disabled={editSubmitting}>
              {editSubmitting ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
