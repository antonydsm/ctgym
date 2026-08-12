import { ActionIcon, Group, NumberInput, Paper, Stack, Text, TextInput } from '@mantine/core'

export interface DraftExercise {
  key: string
  exercise_id: string
  name: string
  sets: number | null
  reps: string | null
  notes: string | null
}

interface RoutineExerciseRowProps {
  draft: DraftExercise
  index: number
  total: number
  onChange: (key: string, patch: Partial<DraftExercise>) => void
  onRemove: (key: string) => void
  onMoveUp: (key: string) => void
  onMoveDown: (key: string) => void
}

function RoutineExerciseRow({
  draft,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown
}: RoutineExerciseRowProps) {
  return (
    <Paper withBorder p="sm">
      <Group align="flex-start" wrap="nowrap">
        <Stack gap={2} align="center" pt={4}>
          <ActionIcon
            variant="subtle"
            size="sm"
            disabled={index === 0}
            onClick={() => onMoveUp(draft.key)}
            aria-label="Subir"
          >
            ↑
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="sm"
            disabled={index === total - 1}
            onClick={() => onMoveDown(draft.key)}
            aria-label="Bajar"
          >
            ↓
          </ActionIcon>
        </Stack>

        <div style={{ flex: 1 }}>
          <Text fw={500} size="sm" mb={4}>
            {index + 1}. {draft.name}
          </Text>
          <Group grow align="flex-start">
            <NumberInput
              label="Series"
              min={1}
              max={20}
              value={draft.sets ?? undefined}
              onChange={(value) => onChange(draft.key, { sets: typeof value === 'number' ? value : null })}
            />
            <TextInput
              label="Repeticiones"
              placeholder="8-12"
              value={draft.reps ?? ''}
              onChange={(event) => onChange(draft.key, { reps: event.currentTarget.value })}
            />
            <TextInput
              label="Notas"
              placeholder="Opcional"
              value={draft.notes ?? ''}
              onChange={(event) => onChange(draft.key, { notes: event.currentTarget.value })}
            />
          </Group>
        </div>

        <ActionIcon
          variant="subtle"
          color="red"
          onClick={() => onRemove(draft.key)}
          aria-label="Quitar ejercicio"
        >
          ✕
        </ActionIcon>
      </Group>
    </Paper>
  )
}

export default RoutineExerciseRow
