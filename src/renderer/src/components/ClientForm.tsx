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
  full_name: string
  countryCode: string
  localPhone: string
  notes: string
}

function toFormValues(input?: ClientInput): FormValues {
  if (!input) {
    return { full_name: '', countryCode: DEFAULT_COUNTRY_CODE, localPhone: '', notes: '' }
  }
  const { countryCode, localPhone } = splitPhone(input.phone)
  return { full_name: input.full_name, countryCode, localPhone, notes: input.notes ?? '' }
}

function ClientForm({ initialValues, submitLabel, onSubmit, onCancel, submitting }: ClientFormProps) {
  const form = useForm<FormValues>({
    initialValues: toFormValues(initialValues),
    validate: {
      full_name: (value) => (value.trim().length > 0 ? null : 'Ingresá un nombre'),
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
      full_name: values.full_name,
      phone: joinPhone(values.countryCode, values.localPhone),
      notes: values.notes
    })
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput label="Nombre completo" placeholder="Juan Pérez" {...form.getInputProps('full_name')} />
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
