import { useState } from 'react'
import {
  Button,
  Checkbox,
  Group,
  Image,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { getErrorMessage } from '@renderer/lib/errors'
import type { ExerciseInput } from '@shared/types'
import { MUSCLE_GROUPS } from '@renderer/lib/muscleGroups'
import { api } from '@renderer/lib/api'

interface ExerciseFormProps {
  initialValues?: ExerciseInput
  submitLabel: string
  onSubmit: (values: ExerciseInput) => void
  onCancel: () => void
  submitting?: boolean
}

function ExerciseForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  submitting
}: ExerciseFormProps) {
  const [uploading, setUploading] = useState(false)

  const form = useForm<ExerciseInput>({
    initialValues: initialValues ?? {
      name: '',
      muscle_groups: [],
      default_sets: 3,
      default_reps: '',
      video_url: '',
      image_url: ''
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Ingresá un nombre'),
      muscle_groups: (value) => (value.length > 0 ? null : 'Marcá al menos un grupo muscular')
    }
  })

  async function handlePickImage() {
    setUploading(true)
    try {
      const url = await api.exercises.uploadImage()
      if (url) {
        form.setFieldValue('image_url', url)
      }
    } catch (error) {
      notifications.show({ message: getErrorMessage(error), color: 'red' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit((values) => onSubmit(values))}>
      <Stack>
        <TextInput
          label="Nombre del ejercicio"
          placeholder="Press de banca"
          {...form.getInputProps('name')}
        />
        <Checkbox.Group
          label="Grupos musculares"
          description="Marcá todos los que trabaja este ejercicio"
          {...form.getInputProps('muscle_groups')}
        >
          <SimpleGrid cols={3} mt="xs">
            {MUSCLE_GROUPS.map((group) => (
              <Checkbox key={group} value={group} label={group} />
            ))}
          </SimpleGrid>
        </Checkbox.Group>
        <Group grow align="flex-start">
          <NumberInput
            label="Series por defecto"
            placeholder="3"
            min={1}
            max={20}
            {...form.getInputProps('default_sets')}
          />
          <TextInput
            label="Repeticiones por defecto"
            placeholder="8-12"
            {...form.getInputProps('default_reps')}
          />
        </Group>
        <TextInput
          label="Video (opcional)"
          placeholder="https://..."
          {...form.getInputProps('video_url')}
        />

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Foto (opcional)
          </Text>
          <Group align="center" gap="sm">
            {form.values.image_url ? (
              <Image src={form.values.image_url} alt="" w={80} h={80} radius="sm" fit="cover" />
            ) : (
              <Text size="sm" c="dimmed">
                Sin foto
              </Text>
            )}
            <Button variant="default" onClick={handlePickImage} loading={uploading}>
              {form.values.image_url ? 'Cambiar imagen' : 'Subir imagen'}
            </Button>
            {form.values.image_url && (
              <Button variant="subtle" color="red" onClick={() => form.setFieldValue('image_url', '')}>
                Quitar
              </Button>
            )}
          </Group>
        </Stack>

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

export default ExerciseForm
