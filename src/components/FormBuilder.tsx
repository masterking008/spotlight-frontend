import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Plus, Trash2, Type, Hash, Mail, Phone, AlignLeft,
  ChevronDown, List, Calendar, Image, Video, CheckSquare, X, Settings2,
} from 'lucide-react'
import type { FormField, FormSchema } from '../lib/api'

// ─── Field type definitions ───────────────────────────────────────────────────

const FIELD_TYPES = [
  { type: 'text', label: 'Text', icon: Type, description: 'Short text answer' },
  { type: 'textarea', label: 'Long text', icon: AlignLeft, description: 'Multi-line text' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Numeric value' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Email address' },
  { type: 'tel', label: 'Phone', icon: Phone, description: 'Phone number' },
  { type: 'select', label: 'Dropdown', icon: ChevronDown, description: 'Single choice' },
  { type: 'multiselect', label: 'Multi-select', icon: List, description: 'Multiple choices' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { type: 'file', label: 'Photo upload', icon: Image, description: 'Image files', mediaType: 'photo' },
  { type: 'file', label: 'Video upload', icon: Video, description: 'Video self-tape', mediaType: 'video' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'True/false question' },
] as const

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, FormField[]> = {
  drama: [
    { id: crypto.randomUUID(), type: 'text', label: 'Character inspiration', placeholder: 'Which actor inspires you most?', required: false },
    { id: crypto.randomUUID(), type: 'number', label: 'Years of acting experience', required: true, validation: { min: 0, max: 50 } },
    { id: crypto.randomUUID(), type: 'select', label: 'Training background', required: false, options: ['No formal training', 'Acting school', 'Workshop', 'Theatre'] },
    { id: crypto.randomUUID(), type: 'file', label: 'Profile photos', required: true, mediaType: 'photo', maxFiles: 3, maxSizeMB: 5 },
    { id: crypto.randomUUID(), type: 'file', label: 'Self-tape video', required: true, mediaType: 'video', maxSizeMB: 200 },
  ],
  reality: [
    { id: crypto.randomUUID(), type: 'textarea', label: 'Tell us about yourself in 100 words', required: true },
    { id: crypto.randomUUID(), type: 'select', label: 'Have you been on TV before?', required: true, options: ['No', 'Yes – local channel', 'Yes – national channel', 'Yes – OTT'] },
    { id: crypto.randomUUID(), type: 'multiselect', label: 'Skills', required: false, options: ['Dancing', 'Singing', 'Comedy', 'Sports', 'Cooking', 'Travel'] },
    { id: crypto.randomUUID(), type: 'file', label: 'Recent photos', required: true, mediaType: 'photo', maxFiles: 5, maxSizeMB: 5 },
    { id: crypto.randomUUID(), type: 'file', label: 'Introduction video', required: true, mediaType: 'video', maxSizeMB: 200 },
  ],
  dance: [
    { id: crypto.randomUUID(), type: 'multiselect', label: 'Dance styles', required: true, options: ['Bollywood', 'Classical', 'Hip-hop', 'Contemporary', 'Folk', 'Freestyle'] },
    { id: crypto.randomUUID(), type: 'number', label: 'Years of dance training', required: true, validation: { min: 0, max: 40 } },
    { id: crypto.randomUUID(), type: 'text', label: 'Biggest performance / show', required: false },
    { id: crypto.randomUUID(), type: 'file', label: 'Performance photos', required: true, mediaType: 'photo', maxFiles: 4, maxSizeMB: 5 },
    { id: crypto.randomUUID(), type: 'file', label: 'Dance video (30–90 seconds)', required: true, mediaType: 'video', maxSizeMB: 200 },
  ],
}

// ─── Sortable field card ───────────────────────────────────────────────────────

function SortableFieldCard({
  field,
  onUpdate,
  onRemove,
}: {
  field: FormField
  onUpdate: (id: string, updates: Partial<FormField>) => void
  onRemove: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const hasOptions = field.type === 'select' || field.type === 'multiselect'
  const optionsStr = field.options?.join(', ') || ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none p-1"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Label (editable inline) */}
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate(field.id, { label: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-0 outline-none focus:bg-gray-50 rounded px-1 py-0.5"
          placeholder="Field label"
        />

        {/* Type badge */}
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium capitalize shrink-0">
          {field.mediaType || field.type}
        </span>

        {/* Required toggle */}
        <button
          type="button"
          onClick={() => onUpdate(field.id, { required: !field.required })}
          className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors shrink-0 ${
            field.required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
        >
          {field.required ? 'Required' : 'Optional'}
        </button>

        {/* Expand settings */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          className="text-gray-300 hover:text-red-500 transition-colors p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded settings */}
      {expanded && (
        <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder text</label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
              placeholder="e.g. Enter your answer here..."
              className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {hasOptions && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Options <span className="font-normal text-gray-400">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={optionsStr}
                onChange={(e) =>
                  onUpdate(field.id, {
                    options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                  })
                }
                placeholder="Option 1, Option 2, Option 3"
                className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          )}

          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min</label>
                <input
                  type="number"
                  value={field.validation?.min ?? ''}
                  onChange={(e) => onUpdate(field.id, { validation: { ...field.validation, min: Number(e.target.value) } })}
                  className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max</label>
                <input
                  type="number"
                  value={field.validation?.max ?? ''}
                  onChange={(e) => onUpdate(field.id, { validation: { ...field.validation, max: Number(e.target.value) } })}
                  className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
          )}

          {field.type === 'file' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Max size (MB)
              </label>
              <input
                type="number"
                value={field.maxSizeMB || (field.mediaType === 'video' ? 200 : 5)}
                onChange={(e) => onUpdate(field.id, { maxSizeMB: Number(e.target.value) })}
                className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── FormBuilder ──────────────────────────────────────────────────────────────

interface FormBuilderProps {
  value: FormSchema | null
  onChange: (schema: FormSchema) => void
}

export function FormBuilder({ value, onChange }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(value?.fields || [])
  const [requireConsent, setRequireConsent] = useState(value?.settings?.requireConsent !== false)
  const [showPalette, setShowPalette] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const emit = useCallback((newFields: FormField[], consent: boolean) => {
    onChange({
      version: 1,
      fields: newFields,
      settings: { requireConsent: consent, consentText: 'I consent to Rusk Media using my submission for casting purposes.' },
    })
  }, [onChange])

  const addField = (type: string, mediaType?: string) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type: type as FormField['type'],
      label: `New ${mediaType || type} field`,
      required: false,
      ...(mediaType ? { mediaType: mediaType as 'photo' | 'video' } : {}),
      ...(type === 'select' || type === 'multiselect' ? { options: ['Option 1', 'Option 2'] } : {}),
      ...(type === 'file' && mediaType === 'video' ? { maxSizeMB: 200 } : {}),
      ...(type === 'file' && mediaType === 'photo' ? { maxSizeMB: 5, maxFiles: 5 } : {}),
    }
    const updated = [...fields, newField]
    setFields(updated)
    emit(updated, requireConsent)
    setShowPalette(false)
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    const updated = fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    setFields(updated)
    emit(updated, requireConsent)
  }

  const removeField = (id: string) => {
    const updated = fields.filter((f) => f.id !== id)
    setFields(updated)
    emit(updated, requireConsent)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id)
      const newIndex = fields.findIndex((f) => f.id === over.id)
      const updated = arrayMove(fields, oldIndex, newIndex)
      setFields(updated)
      emit(updated, requireConsent)
    }
  }

  const applyTemplate = (key: string) => {
    const templateFields = TEMPLATES[key].map(f => ({ ...f, id: crypto.randomUUID() }))
    setFields(templateFields)
    emit(templateFields, requireConsent)
  }

  const toggleConsent = (val: boolean) => {
    setRequireConsent(val)
    emit(fields, val)
  }

  return (
    <div className="space-y-4">
      {/* Template shortcuts */}
      {fields.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Start from a template
          </p>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(TEMPLATES).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors capitalize"
              >
                {key} template
              </button>
            ))}
            <span className="text-xs text-gray-400 flex items-center">or add fields below →</span>
          </div>
        </div>
      )}

      {/* Field list */}
      {fields.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map((field) => (
                <SortableFieldCard
                  key={field.id}
                  field={field}
                  onUpdate={updateField}
                  onRemove={removeField}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add field */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPalette(!showPalette)}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add field
        </button>

        {showPalette && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-semibold text-gray-500">Choose field type</span>
              <button type="button" onClick={() => setShowPalette(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {FIELD_TYPES.map((ft) => {
                const { type, label, icon: Icon, description } = ft
                const mediaType = 'mediaType' in ft ? (ft as { mediaType: string }).mediaType : undefined
                return (
                <button
                  key={`${type}-${mediaType}`}
                  type="button"
                  onClick={() => addField(type, mediaType)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-blue-50 text-left transition-colors group"
                >
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700 group-hover:text-blue-700">{label}</p>
                    <p className="text-[10px] text-gray-400">{description}</p>
                  </div>
                </button>
              )})}
            </div>
          </div>
        )}
      </div>

      {/* Consent toggle */}
      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-700">Require consent checkbox</p>
          <p className="text-xs text-gray-400">Talent must agree before submitting</p>
        </div>
        <button
          type="button"
          onClick={() => toggleConsent(!requireConsent)}
          className={`relative w-10 h-5 rounded-full transition-colors ${requireConsent ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${requireConsent ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {fields.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {fields.length} custom field{fields.length !== 1 ? 's' : ''} · Drag to reorder
        </p>
      )}
    </div>
  )
}
