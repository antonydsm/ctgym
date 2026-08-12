import { useMemo, useState } from 'react'
import { Badge, Group, Image, Modal, ScrollArea, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { api } from '@renderer/lib/api'
import type { Exercise } from '@shared/types'

interface ExercisePickerModalProps {
  opened: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
}

function ExercisePickerModal({ opened, onClose, onSelect }: ExercisePickerModalProps) {
  const [search, setSearch] = useState('')

  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api.exercises.list(),
    enabled: opened
  })

  const filtered = useMemo(() => {
    const all = exercisesQuery.data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return all
    return all.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(term) ||
        exercise.muscle_groups.some((g) => g.toLowerCase().includes(term))
    )
  }, [exercisesQuery.data, search])

  return (
    <Modal opened={opened} onClose={onClose} title="Agregar ejercicio" size="lg">
      <Stack>
        <TextInput
          placeholder="Buscar por nombre o grupo muscular..."
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        <ScrollArea.Autosize mah={420}>
          <Stack gap="xs">
            {filtered.length === 0 && (
              <Text c="dimmed" size="sm">
                No se encontraron ejercicios.
              </Text>
            )}
            {filtered.map((exercise) => (
              <UnstyledButton
                key={exercise.id}
                onClick={() => onSelect(exercise)}
                p="xs"
                style={{ borderRadius: 6 }}
              >
                <Group wrap="nowrap">
                  {exercise.image_url ? (
                    <Image src={exercise.image_url} alt="" w={40} h={40} radius="sm" fit="cover" />
                  ) : (
                    <div style={{ width: 40, height: 40 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {exercise.name}
                    </Text>
                    <Group gap={4} mt={2}>
                      {exercise.muscle_groups.map((group) => (
                        <Badge key={group} size="xs" variant="light" color="ctRed">
                          {group}
                        </Badge>
                      ))}
                    </Group>
                  </div>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  )
}

export default ExercisePickerModal
