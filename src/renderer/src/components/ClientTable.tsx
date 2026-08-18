import { ActionIcon, Badge, Group, Table, Text } from '@mantine/core'
import type { Client, ClientPayment } from '@shared/types'
import { formatPhone } from '@renderer/lib/phone'
import { PLAN_LABEL, todayDateString } from '@shared/membership'

interface ClientTableProps {
  clients: Client[]
  latestPaymentByClient: Map<string, ClientPayment>
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onRegisterPayment: (client: Client) => void
}

function formatDateOnly(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d}/${m}/${y}`
}

function PaymentStatusBadge({ payment }: { payment: ClientPayment | undefined }) {
  if (!payment) {
    return (
      <Badge color="gray" variant="light">
        Sin pagos
      </Badge>
    )
  }
  const isUpToDate = payment.due_at >= todayDateString()
  return (
    <Badge color={isUpToDate ? 'green' : 'red'} variant="light">
      {isUpToDate ? 'Al día' : 'Vencido'}
    </Badge>
  )
}

function ClientTable({
  clients,
  latestPaymentByClient,
  onEdit,
  onDelete,
  onRegisterPayment
}: ClientTableProps) {
  if (clients.length === 0) {
    return <Text c="dimmed">Todavía no hay clientes cargados.</Text>
  }

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Nombre</Table.Th>
          <Table.Th>WhatsApp</Table.Th>
          <Table.Th>Cédula</Table.Th>
          <Table.Th>Plan</Table.Th>
          <Table.Th>Vence</Table.Th>
          <Table.Th>Estado</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {clients.map((client) => {
          const payment = latestPaymentByClient.get(client.id)
          return (
            <Table.Tr key={client.id}>
              <Table.Td>{client.full_name}</Table.Td>
              <Table.Td>{formatPhone(client.phone)}</Table.Td>
              <Table.Td>{client.cedula || '—'}</Table.Td>
              <Table.Td>{payment ? PLAN_LABEL[payment.plan] : '—'}</Table.Td>
              <Table.Td>{payment ? formatDateOnly(payment.due_at) : '—'}</Table.Td>
              <Table.Td>
                <PaymentStatusBadge payment={payment} />
              </Table.Td>
              <Table.Td>
                <Group gap="xs" justify="flex-end" wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    color="ctRed"
                    onClick={() => onRegisterPayment(client)}
                    aria-label="Registrar pago"
                    title="Registrar pago"
                  >
                    $
                  </ActionIcon>
                  <ActionIcon variant="subtle" onClick={() => onEdit(client)} aria-label="Editar">
                    ✎
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => onDelete(client)}
                    aria-label="Eliminar"
                  >
                    ✕
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          )
        })}
      </Table.Tbody>
    </Table>
  )
}

export default ClientTable
