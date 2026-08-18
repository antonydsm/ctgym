import { Button, Group, Select, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import type { ClientInput } from '@shared/types'
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, getCountry, joinPhone, splitPhone } from '@renderer/lib/phone'

interface ClientFormProps {
  initialValues?: ClientInput
  submitLabel: string
  onSubmit: (values: ClientInput) => void
  onCancel: () => void
  submitting?: boolean
}

interface FormValues {
  first_name: string
  last_name: string
  cedula: string
  countryCode: string
  localPhone: string
  notes: string
}

function toFormValues(input?: ClientInput): FormValues {
  if (!input) {
    return {
      first_name: '',
      last_name: '',
      cedula: '',
      countryCode: DEFAULT_COUNTRY_CODE,
      localPhone: '',
      notes: ''
    }
  }
  const { countryCode, localPhone } = splitPhone(input.phone)
  return {
    first_name: input.first_name,
    last_name: input.last_name ?? '',
    cedula: input.cedula ?? '',
    countryCode,
    localPhone,
    notes: input.notes ?? ''
  }
}

function ClientForm({ initialValues, submitLabel, onSubmit, onCancel, submitting }: ClientFormProps) {
  const form = useForm<FormValues>({
    initialValues: toFormValues(initialValues),
    validate: {
      first_name: (value) => (value.trim().length > 0 ? null : 'Ingresá un nombre'),
      localPhone: (value, values) => {
        const country = getCountry(values.countryCode)
        return new RegExp(`^\\d{${country.digits}}$`).test(value.trim())
          ? null
          : `Ingresá ${country.digits} dígitos para ${country.label.split(' ')[0]} (sin 0 ni 15), ej: ${country.example}`
      }
    }
  })

  const selectedCountry = getCountry(form.values.countryCode)

  function handleSubmit(values: FormValues) {
    onSubmit({
      first_name: values.first_name,
      last_name: values.last_name || null,
      cedula: values.cedula || null,
      phone: joinPhone(values.countryCode, values.localPhone),
      notes: values.notes
    })
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Group grow align="flex-start">
          <TextInput label="Nombre" placeholder="Juan" {...form.getInputProps('first_name')} />
          <TextInput label="Apellido" placeholder="Pérez" {...form.getInputProps('last_name')} />
        </Group>
        <TextInput
          label="Cédula"
          placeholder="Opcional"
          {...form.getInputProps('cedula')}
        />
        <Group align="flex-end" gap="sm" wrap="nowrap">
          <Select
            label="País"
            data={COUNTRY_CODES.map((c) => ({ value: c.value, label: c.label }))}
            allowDeselect={false}
            w={150}
            {...form.getInputProps('countryCode')}
          />
          <TextInput
            label="WhatsApp"
            placeholder={selectedCountry.example}
            style={{ flex: 1 }}
            {...form.getInputProps('localPhone')}
          />
        </Group>
        <Text size="xs" c="dimmed" mt={-8}>
          Número sin el 0 ni el 15 ({selectedCountry.digits} dígitos)
        </Text>
        <Textarea label="Notas" placeholder="Opcional" {...form.getInputProps('notes')} />
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

export default ClientForm
