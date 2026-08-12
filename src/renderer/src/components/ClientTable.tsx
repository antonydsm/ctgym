import { ActionIcon, Group, Table, Text } from '@mantine/core'
import type { Client } from '@shared/types'
import { formatPhone } from '@renderer/lib/phone'

interface ClientTableProps {
  clients: Client[]
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
  if (clients.length === 0) {
    return <Text c="dimmed">Todavía no hay clientes cargados.</Text>
  }

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Nombre</Table.Th>
          <Table.Th>WhatsApp</Table.Th>
          <Table.Th>Notas</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {clients.map((client) => (
          <Table.Tr key={client.id}>
            <Table.Td>{client.full_name}</Table.Td>
            <Table.Td>{formatPhone(client.phone)}</Table.Td>
            <Table.Td>
              <Text c="dimmed" size="sm" lineClamp={1}>
                {client.notes || '—'}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs" justify="flex-end">
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
        ))}
      </Table.Tbody>
    </Table>
  )
}

export default ClientTable
