import { useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useStore } from '../store';
import { TASK_TAGS, type Task, type TaskStatus } from '../types';
import { nextId } from '../lib/calc';
import { formatDate, todayISO } from '../lib/format';
import { Field, Modal } from '../components/UI';
import { IconArrowR, IconPlus, IconTrash } from '../components/Icons';

const COLS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To do', color: 'var(--s2)' },
  { id: 'doing', label: 'Doing', color: '#d79a12' },
  { id: 'done', label: 'Done', color: 'var(--s3)' },
];
const NEXT: Record<TaskStatus, TaskStatus | null> = { todo: 'doing', doing: 'done', done: null };
const TAG_TONE: Record<string, string> = { Marketing: 'sky', Content: 'sky', 'R&D': 'honey', Restock: 'latte', Ops: 'mint', Finance: 'mint' };

export function Tasks() {
  const { data, update } = useStore();
  const [editing, setEditing] = useState<Task | TaskStatus | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );
  const move = (id: string, status: TaskStatus) =>
    update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (t) t.status = status;
      return d;
    });
  const onEnd = (e: DragEndEvent) => e.over && move(String(e.active.id), e.over.id as TaskStatus);

  return (
    <div className="stack">
      <div className="small muted">Your business to-do board: content, restock, R&D experiments, anything.</div>
      <DndContext sensors={sensors} onDragEnd={onEnd}>
        <div className="board">
          {COLS.map((c) => {
            const list = data.tasks.filter((t) => t.status === c.id).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
            return (
              <Col key={c.id} id={c.id} label={c.label} color={c.color} count={list.length} onAdd={() => setEditing(c.id)}>
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} onOpen={() => setEditing(t)} onNext={() => NEXT[t.status] && move(t.id, NEXT[t.status]!)} />
                ))}
              </Col>
            );
          })}
        </div>
      </DndContext>
      {editing && <TaskForm task={typeof editing === 'string' ? undefined : editing} status={typeof editing === 'string' ? editing : editing.status} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Col({ id, label, color, count, onAdd, children }: { id: TaskStatus; label: string; color: string; count: number; onAdd: () => void; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className={`column${isOver ? ' over' : ''}`}>
      <div className="column-head">
        <span className="col-dot" style={{ background: color }} />
        <h3>{label}</h3>
        <span className="count">{count}</span>
        <button className="btn sm ghost icon" onClick={onAdd} aria-label={`Add to ${label}`}>
          <IconPlus />
        </button>
      </div>
      {children}
    </section>
  );
}

function TaskCard({ task: t, onOpen, onNext }: { task: Task; onOpen: () => void; onNext: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: t.id });
  const overdue = t.due && t.due < todayISO() && t.status !== 'done';
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined, zIndex: isDragging ? 10 : undefined, position: 'relative' }}
    >
      <article className={`kcard${isDragging ? ' overlay-card' : ''}`} onClick={onOpen}>
        <div className="k-top">
          {t.tag && <span className={`chip ${TAG_TONE[t.tag] ?? 'latte'}`}>{t.tag}</span>}
          {t.due && (
            <span className={`chip ${overdue ? 'rose' : 'outline'}`} style={{ marginLeft: 'auto' }}>
              {formatDate(t.due)}
            </span>
          )}
        </div>
        <div className="bold" style={{ textDecoration: t.status === 'done' ? 'line-through' : undefined }}>{t.title}</div>
        {t.notes && <div className="small ink2" style={{ whiteSpace: 'pre-wrap' }}>{t.notes}</div>}
        {NEXT[t.status] && (
          <div className="k-foot">
            <span className="spacer" />
            <button className="btn sm icon" onPointerDown={stop} onClick={(e) => { stop(e); onNext(); }} aria-label="Move to next column">
              <IconArrowR />
            </button>
          </div>
        )}
      </article>
    </div>
  );
}

function TaskForm({ task, status, onClose }: { task?: Task; status: TaskStatus; onClose: () => void }) {
  const { data, update } = useStore();
  const [t, setT] = useState<Task>(task ?? { id: '', title: '', notes: '', tag: '', due: '', status, createdAt: new Date().toISOString() });
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setT((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!t.title.trim()) return;
    update((d) => {
      const i = d.tasks.findIndex((x) => x.id === t.id);
      if (i >= 0) d.tasks[i] = t;
      else d.tasks.push({ ...t, id: nextId('T', d.tasks.map((x) => x.id)) });
      return d;
    });
    onClose();
  };
  const remove = () => {
    if (!task) return;
    update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== task.id) }));
    onClose();
  };
  return (
    <Modal
      title={task ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          {task && (
            <button className="btn ghost danger" onClick={remove}>
              <IconTrash /> Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!t.title.trim()}>Save</button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Task" className="full">
          <input className="input" value={t.title} onChange={(e) => set('title', e.target.value)} autoFocus placeholder="Post menu story for Friday" />
        </Field>
        <Field label="Tag">
          <select className="input" value={t.tag} onChange={(e) => set('tag', e.target.value)}>
            <option value="">—</option>
            {TASK_TAGS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Due">
          <input className="input" type="date" value={t.due} onChange={(e) => set('due', e.target.value)} />
        </Field>
        <Field label="Column">
          <select className="input" value={t.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
            {COLS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Notes" className="full">
          <textarea className="input" value={t.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
      {data.tasks.length === 0 && <div className="tiny muted section-gap">First task — nice!</div>}
    </Modal>
  );
}
