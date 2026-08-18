import { Anchor, Badge, Button, Group, Image, Table, Text } from '@mantine/core'
import type { Exercise } from '@shared/types'

interface ExerciseTableProps {
  exercises: Exercise[]
  onEdit: (exercise: Exercise) => void
  onDelete: (exercise: Exercise) => void
}

function ExerciseTable({ exercises, onEdit, onDelete }: ExerciseTableProps) {
  if (exercises.length === 0) {
    return <Text c="dimmed">Todavía no hay ejercicios cargados.</Text>
  }

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th />
          <Table.Th>Ejercicio</Table.Th>
          <Table.Th>Grupos musculares</Table.Th>
          <Table.Th>Series x reps</Table.Th>
          <Table.Th>Video</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {exercises.map((exercise) => (
          <Table.Tr key={exercise.id}>
            <Table.Td>
              {exercise.image_url ? (
                <Image src={exercise.image_url} alt="" w={36} h={36} radius="sm" fit="cover" />
              ) : (
                <Group w={36} h={36} justify="center" align="center" bg="dark.5" style={{ borderRadius: 4 }}>
                  <Text size="xs" c="dimmed">
                    —
                  </Text>
                </Group>
              )}
            </Table.Td>
            <Table.Td>{exercise.name}</Table.Td>
            <Table.Td>
              <Group gap={4}>
                {exercise.muscle_groups.map((group) => (
                  <Badge key={group} variant="light" color="ctRed">
                    {group}
                  </Badge>
                ))}
              </Group>
            </Table.Td>
            <Table.Td>
              {exercise.default_sets ?? '—'} x {exercise.default_reps || '—'}
            </Table.Td>
            <Table.Td>
              {exercise.video_url ? (
                <Anchor href={exercise.video_url} target="_blank" size="sm">
                  Ver
                </Anchor>
              ) : (
                <Text c="dimmed" size="sm">
                  —
                </Text>
              )}
            </Table.Td>
            <Table.Td>
              <Group gap="xs" justify="flex-end">
                <Button size="xs" variant="light" color="blue" leftSection="✎" onClick={() => onEdit(exercise)}>
                  Editar
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection="✕"
                  onClick={() => onDelete(exercise)}
                >
                  Eliminar
                </Button>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}

export default ExerciseTable
