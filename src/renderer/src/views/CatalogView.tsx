import { useMemo, useState } from 'react'
import { Button, Group, Loader, Modal, MultiSelect, Stack, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@renderer/lib/api'
import { getErrorMessage } from '@renderer/lib/errors'
import { MUSCLE_GROUPS } from '@renderer/lib/muscleGroups'
import ExerciseForm from '@renderer/components/ExerciseForm'
import ExerciseTable from '@renderer/components/ExerciseTable'
import type { Exercise, ExerciseInput } from '@shared/types'

function CatalogView() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string[]>([])

  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api.exercises.list()
  })

  const filteredExercises = useMemo(() => {
    if (!exercisesQuery.data) return exercisesQuery.data
    const normalizedSearch = search.trim().toLowerCase()
    return exercisesQuery.data.filter((exercise) => {
      const matchesSearch =
        !normalizedSearch || exercise.name.toLowerCase().includes(normalizedSearch)
      const matchesMuscle =
        muscleFilter.length === 0 ||
        muscleFilter.some((group) => exercise.muscle_groups.includes(group))
      return matchesSearch && matchesMuscle
    })
  }, [exercisesQuery.data, search, muscleFilter])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['exercises'] })

  const createMutation = useMutation({
    mutationFn: (input: ExerciseInput) => api.exercises.create(input),
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
      notifications.show({ message: 'Ejercicio creado', color: 'ctRed' })
    },
    onError: (error: Error) => notifications.show({ message: error.message, color: 'red' })
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExerciseInput }) =>
      api.exercises.update(id, input),
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
      setEditingExercise(null)
      notifications.show({ message: 'Ejercicio actualizado', color: 'ctRed' })
    },
    onError: (error: Error) => notifications.show({ message: error.message, color: 'red' })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.exercises.delete(id),
    onSuccess: () => {
      invalidate()
      notifications.show({ message: 'Ejercicio eliminado', color: 'ctRed' })
    },
    onError: (error: Error) => notifications.show({ message: error.message, color: 'red' })
  })

  function openCreateModal() {
    setEditingExercise(null)
    setModalOpen(true)
  }

  function openEditModal(exercise: Exercise) {
    setEditingExercise(exercise)
    setModalOpen(true)
  }

  function confirmDelete(exercise: Exercise) {
    modals.openConfirmModal({
      title: 'Eliminar ejercicio',
      children: <Text size="sm">¿Seguro que querés eliminar {exercise.name}?</Text>,
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteMutation.mutate(exercise.id)
    })
  }

  function handleSubmit(values: ExerciseInput) {
    if (editingExercise) {
      updateMutation.mutate({ id: editingExercise.id, input: values })
    } else {
      createMutation.mutate(values)
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Catálogo de ejercicios</Title>
        <Button onClick={openCreateModal}>Nuevo ejercicio</Button>
      </Group>

      {exercisesQuery.data && (
        <Group>
          <TextInput
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            w={240}
          />
          <MultiSelect
            placeholder="Filtrar por músculo"
            data={MUSCLE_GROUPS as unknown as string[]}
            value={muscleFilter}
            onChange={setMuscleFilter}
            clearable
            w={280}
          />
        </Group>
      )}

      {exercisesQuery.isLoading && <Loader />}
      {exercisesQuery.isError && (
        <Text c="red">Error al cargar ejercicios: {getErrorMessage(exercisesQuery.error)}</Text>
      )}
      {filteredExercises && (
        <>
          {filteredExercises.length === 0 && (
            <Text c="dimmed" size="sm">
              Ningún ejercicio coincide con la búsqueda.
            </Text>
          )}
          <ExerciseTable exercises={filteredExercises} onEdit={openEditModal} onDelete={confirmDelete} />
        </>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      >
        <ExerciseForm
          initialValues={editingExercise ?? undefined}
          submitLabel={editingExercise ? 'Guardar cambios' : 'Crear ejercicio'}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </Stack>
  )
}

export default CatalogView
