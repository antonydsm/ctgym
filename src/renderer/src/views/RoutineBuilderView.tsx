import { useState } from 'react'
import {
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@renderer/lib/api'
import { getErrorMessage } from '@renderer/lib/errors'
import ExercisePickerModal from '@renderer/components/ExercisePickerModal'
import RoutineExerciseRow, { type DraftExercise } from '@renderer/components/RoutineExerciseRow'
import type { Exercise, RoutineSaveInput } from '@shared/types'

function RoutineBuilderView() {
  const queryClient = useQueryClient()

  const [clientId, setClientId] = useState<string | null>(null)
  const [routineId, setRoutineId] = useState<string | null>(null)
  const [routineName, setRoutineName] = useState('')
  const [routineNotes, setRoutineNotes] = useState('')
  const [exercises, setExercises] = useState<DraftExercise[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loadingRoutine, setLoadingRoutine] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sending, setSending] = useState(false)

  const clientsQuery = useQuery({ queryKey: ['clients'], queryFn: () => api.clients.list() })

  const routinesQuery = useQuery({
    queryKey: ['routines', clientId],
    queryFn: () => api.routines.listByClient(clientId as string),
    enabled: !!clientId
  })

  const saveMutation = useMutation({
    mutationFn: (input: RoutineSaveInput) => api.routines.save(input),
    onSuccess: (id) => {
      setRoutineId(id)
      queryClient.invalidateQueries({ queryKey: ['routines', clientId] })
      notifications.show({ message: 'Rutina guardada', color: 'ctRed' })
    },
    onError: (error: Error) => notifications.show({ message: error.message, color: 'red' })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.routines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines', clientId] })
      resetEditor()
      notifications.show({ message: 'Rutina eliminada', color: 'ctRed' })
    },
    onError: (error: Error) => notifications.show({ message: error.message, color: 'red' })
  })

  function resetEditor() {
    setRoutineId(null)
    setRoutineName('')
    setRoutineNotes('')
    setExercises([])
  }

  function handleSelectClient(value: string | null) {
    setClientId(value)
    resetEditor()
  }

  async function loadRoutine(id: string) {
    setLoadingRoutine(true)
    try {
      const routine = await api.routines.get(id)
      setRoutineId(routine.id)
      setRoutineName(routine.name ?? '')
      setRoutineNotes(routine.notes ?? '')
      setExercises(
        routine.routine_exercises.map((re) => ({
          key: re.id,
          exercise_id: re.exercise_id ?? '',
          name: re.exercise?.name ?? '(ejercicio eliminado)',
          sets: re.sets,
          reps: re.reps,
          notes: re.notes
        }))
      )
    } catch (error) {
      notifications.show({ message: getErrorMessage(error), color: 'red' })
    } finally {
      setLoadingRoutine(false)
    }
  }

  function handleSelectExercise(exercise: Exercise) {
    setExercises((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        exercise_id: exercise.id,
        name: exercise.name,
        sets: exercise.default_sets,
        reps: exercise.default_reps,
        notes: ''
      }
    ])
  }

  function handleRowChange(key: string, patch: Partial<DraftExercise>) {
    setExercises((prev) => prev.map((ex) => (ex.key === key ? { ...ex, ...patch } : ex)))
  }

  function handleRemoveRow(key: string) {
    setExercises((prev) => prev.filter((ex) => ex.key !== key))
  }

  function moveRow(key: string, direction: -1 | 1) {
    setExercises((prev) => {
      const index = prev.findIndex((ex) => ex.key === key)
      const targetIndex = index + direction
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  function buildSaveInput(): RoutineSaveInput | null {
    if (!clientId) return null
    return {
      id: routineId ?? undefined,
      client_id: clientId,
      name: routineName,
      notes: routineNotes,
      exercises: exercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        sets: ex.sets,
        reps: ex.reps,
        notes: ex.notes
      }))
    }
  }

  function handleSave() {
    if (exercises.length === 0) {
      notifications.show({ message: 'Agregá al menos un ejercicio', color: 'red' })
      return
    }
    const input = buildSaveInput()
    if (input) saveMutation.mutate(input)
  }

  async function handleExportPdf() {
    if (exercises.length === 0) {
      notifications.show({ message: 'Agregá al menos un ejercicio', color: 'red' })
      return
    }
    const input = buildSaveInput()
    if (!input) return

    setExporting(true)
    try {
      const id = routineId ?? (await saveMutation.mutateAsync(input))
      await api.routines.exportPdf(id)
      notifications.show({ message: 'PDF generado y abierto', color: 'ctRed' })
    } catch (error) {
      notifications.show({ message: getErrorMessage(error), color: 'red' })
    } finally {
      setExporting(false)
    }
  }

  async function handleSendWhatsapp() {
    if (exercises.length === 0) {
      notifications.show({ message: 'Agregá al menos un ejercicio', color: 'red' })
      return
    }
    const input = buildSaveInput()
    if (!input) return

    setSending(true)
    try {
      const id = routineId ?? (await saveMutation.mutateAsync(input))
      await api.routines.sendWhatsapp(id)
      notifications.show({ message: 'Rutina enviada por WhatsApp', color: 'ctRed' })
    } catch (error) {
      notifications.show({ message: getErrorMessage(error), color: 'red' })
    } finally {
      setSending(false)
    }
  }

  function confirmDeleteRoutine() {
    if (!routineId) return
    modals.openConfirmModal({
      title: 'Eliminar rutina',
      children: <Text size="sm">¿Seguro que querés eliminar esta rutina?</Text>,
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteMutation.mutate(routineId)
    })
  }

  const selectedClient = clientsQuery.data?.find((c) => c.id === clientId)

  return (
    <Stack>
      <Title order={2}>Rutinas</Title>

      <Select
        label="Cliente"
        placeholder="Elegí un cliente"
        searchable
        data={(clientsQuery.data ?? []).map((c) => ({ value: c.id, label: c.full_name }))}
        value={clientId}
        onChange={handleSelectClient}
        maw={400}
      />

      {!clientId && (
        <Text c="dimmed">Elegí un cliente para ver o crear sus rutinas.</Text>
      )}

      {clientId && (
        <Group align="flex-start" wrap="nowrap" gap="lg">
          <Paper withBorder p="sm" w={260}>
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">
                Rutinas de {selectedClient?.full_name}
              </Text>
            </Group>
            <Button fullWidth variant="light" mb="sm" onClick={resetEditor}>
              + Nueva rutina
            </Button>
            {routinesQuery.isLoading && <Loader size="sm" />}
            <ScrollArea.Autosize mah={400}>
              <Stack gap={4}>
                {(routinesQuery.data ?? []).map((routine) => (
                  <UnstyledButton
                    key={routine.id}
                    onClick={() => loadRoutine(routine.id)}
                    p="xs"
                    style={{
                      borderRadius: 6,
                      background: routine.id === routineId ? 'var(--mantine-color-ctRed-9)' : undefined
                    }}
                  >
                    <Text size="sm">{routine.name || 'Rutina sin nombre'}</Text>
                    <Text size="xs" c="dimmed">
                      {new Date(routine.created_at).toLocaleDateString()}
                    </Text>
                  </UnstyledButton>
                ))}
                {routinesQuery.data?.length === 0 && (
                  <Text size="sm" c="dimmed">
                    Todavía no tiene rutinas.
                  </Text>
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Paper>

          <Stack style={{ flex: 1 }}>
            <Group grow align="flex-start">
              <TextInput
                label="Nombre de la rutina"
                placeholder="Ej: Rutina fuerza tren superior"
                value={routineName}
                onChange={(event) => setRoutineName(event.currentTarget.value)}
              />
              <Textarea
                label="Notas generales"
                placeholder="Opcional"
                value={routineNotes}
                onChange={(event) => setRoutineNotes(event.currentTarget.value)}
              />
            </Group>

            <Divider label="Ejercicios" />

            {loadingRoutine && <Loader size="sm" />}

            <Stack gap="sm">
              {exercises.map((draft, index) => (
                <RoutineExerciseRow
                  key={draft.key}
                  draft={draft}
                  index={index}
                  total={exercises.length}
                  onChange={handleRowChange}
                  onRemove={handleRemoveRow}
                  onMoveUp={(key) => moveRow(key, -1)}
                  onMoveDown={(key) => moveRow(key, 1)}
                />
              ))}
              {exercises.length === 0 && (
                <Text c="dimmed" size="sm">
                  Todavía no agregaste ejercicios.
                </Text>
              )}
            </Stack>

            <Group>
              <Button variant="default" onClick={() => setPickerOpen(true)}>
                + Agregar ejercicio
              </Button>
            </Group>

            <Group justify="space-between" mt="md">
              <div>
                {routineId && (
                  <Button variant="light" color="red" leftSection="✕" onClick={confirmDeleteRoutine}>
                    Eliminar rutina
                  </Button>
                )}
              </div>
              <Group>
                <Button variant="default" onClick={handleExportPdf} loading={exporting}>
                  Exportar PDF
                </Button>
                <Button color="green" onClick={handleSendWhatsapp} loading={sending}>
                  Enviar por WhatsApp
                </Button>
                <Button onClick={handleSave} loading={saveMutation.isPending}>
                  Guardar rutina
                </Button>
              </Group>
            </Group>
          </Stack>
        </Group>
      )}

      <ExercisePickerModal
        opened={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectExercise}
      />
    </Stack>
  )
}

export default RoutineBuilderView
