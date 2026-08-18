import { useState } from 'react'
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useQuery } from '@tanstack/react-query'
import { api } from '@renderer/lib/api'
import { getErrorMessage } from '@renderer/lib/errors'
import { MEMBERSHIP_PLANS, PLAN_LABEL, todayDateString, type MembershipPlan } from '@shared/membership'
import type { Client, ClientPayment, ClientPaymentInput } from '@shared/types'

type PaymentValues = Omit<ClientPaymentInput, 'client_id'>

interface PaymentFormProps {
  client: Client
  onSubmit: (values: PaymentValues) => void
  onUpdate: (paymentId: string, values: PaymentValues) => Promise<unknown>
  onDelete: (paymentId: string) => void
  onCancel: () => void
  submitting?: boolean
}

interface FormValues {
  plan: MembershipPlan
  amount: number | ''
  paid_at: string
}

function emptyFormValues(): FormValues {
  return { plan: 'mensual', amount: '', paid_at: todayDateString() }
}

function formatDateOnly(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d}/${m}/${y}`
}

function PaymentForm({ client, onSubmit, onUpdate, onDelete, onCancel, submitting }: PaymentFormProps) {
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)

  const historyQuery = useQuery({
    queryKey: ['payments', 'byClient', client.id],
    queryFn: () => api.payments.listByClient(client.id)
  })

  const form = useForm<FormValues>({
    initialValues: emptyFormValues(),
    validate: {
      amount: (value) => (typeof value === 'number' && value > 0 ? null : 'Ingresá un monto válido'),
      paid_at: (value) => (value ? null : 'Ingresá una fecha')
    }
  })

  function handleEdit(payment: ClientPayment) {
    setEditingPaymentId(payment.id)
    form.setValues({ plan: payment.plan, amount: payment.amount, paid_at: payment.paid_at })
  }

  function handleCancelEdit() {
    setEditingPaymentId(null)
    form.setValues(emptyFormValues())
  }

  async function handleSubmit(values: FormValues) {
    const payload: PaymentValues = {
      plan: values.plan,
      amount: values.amount as number,
      paid_at: values.paid_at
    }
    if (editingPaymentId) {
      await onUpdate(editingPaymentId, payload)
      setEditingPaymentId(null)
      form.setValues(emptyFormValues())
    } else {
      onSubmit(payload)
    }
  }

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {client.full_name}
      </Text>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="Plan"
            data={MEMBERSHIP_PLANS.map((plan) => ({ value: plan, label: PLAN_LABEL[plan] }))}
            allowDeselect={false}
            {...form.getInputProps('plan')}
          />
          <NumberInput label="Monto abonado" placeholder="0" min={0} decimalScale={2} {...form.getInputProps('amount')} />
          <TextInput
            label="Fecha de pago"
            type="date"
            {...form.getInputProps('paid_at')}
          />
          <Group justify="flex-end" mt="sm">
            {editingPaymentId && (
              <Button variant="subtle" onClick={handleCancelEdit} disabled={submitting}>
                Cancelar edición
              </Button>
            )}
            <Button variant="default" onClick={onCancel} disabled={submitting}>
              Cerrar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingPaymentId ? 'Guardar cambios y generar ticket' : 'Registrar pago y generar ticket'}
            </Button>
          </Group>
        </Stack>
      </form>

      <Divider label="Historial de pagos" labelPosition="left" mt="sm" />

      {historyQuery.isLoading && (
        <Text size="sm" c="dimmed">
          Cargando...
        </Text>
      )}
      {historyQuery.isError && (
        <Text size="sm" c="red">
          Error al cargar el historial: {getErrorMessage(historyQuery.error)}
        </Text>
      )}
      {historyQuery.data && historyQuery.data.length === 0 && (
        <Text size="sm" c="dimmed">
          Todavía no tiene pagos registrados.
        </Text>
      )}
      {historyQuery.data && historyQuery.data.length > 0 && (
        <Table striped fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Fecha</Table.Th>
              <Table.Th>Plan</Table.Th>
              <Table.Th>Monto</Table.Th>
              <Table.Th>Vence</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {historyQuery.data.map((payment) => (
              <Table.Tr key={payment.id}>
                <Table.Td>{formatDateOnly(payment.paid_at)}</Table.Td>
                <Table.Td>{PLAN_LABEL[payment.plan]}</Table.Td>
                <Table.Td>{payment.amount}</Table.Td>
                <Table.Td>{formatDateOnly(payment.due_at)}</Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => handleEdit(payment)}
                      aria-label="Editar pago"
                      title="Editar pago"
                    >
                      ✎
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      color="red"
                      onClick={() => onDelete(payment.id)}
                      aria-label="Eliminar pago"
                      title="Eliminar pago"
                    >
                      ✕
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  )
}

export default PaymentForm
