import { useState } from 'react'
import { Button, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@renderer/lib/api'
import { getErrorMessage } from '@renderer/lib/errors'
import ClientForm from '@renderer/components/ClientForm'
import ClientTable from '@renderer/components/ClientTable'
import type { Client, ClientInput } from '@shared/types'

function ClientsView() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.clients.list()
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clients'] })

  const createMutation = useMutation({
    mutationFn: (input: ClientInput) => api.clients.create(input),
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
      notifications.show({ message: 'Cliente creado', color: 'ctRed' })
    },
    onError: (error: Error) => notifications.show({ message: error.message, color: 'red' })
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientInput }) => api.clients.update(id, input),
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
      setEditingClient(null)
      notifications.show({ message: 'Cliente actualizado', color: 'ctRed' })
    },
    onError: (error: Error) => notifications.show({ message: error.message, color: 'red' })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.clients.delete(id),
    onSuccess: () => {
      invalidate()
      notifications.show({ message: 'Cliente eliminado', color: 'ctRed' })
    },
    onError: (error: Error) => notifications.show({ message: error.message, color: 'red' })
  })

  function openCreateModal() {
    setEditingClient(null)
    setModalOpen(true)
  }

  function openEditModal(client: Client) {
    setEditingClient(client)
    setModalOpen(true)
  }

  function confirmDelete(client: Client) {
    modals.openConfirmModal({
      title: 'Eliminar cliente',
      children: <Text size="sm">¿Seguro que querés eliminar a {client.full_name}?</Text>,
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteMutation.mutate(client.id)
    })
  }

  function handleSubmit(values: ClientInput) {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, input: values })
    } else {
      createMutation.mutate(values)
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Clientes</Title>
        <Button onClick={openCreateModal}>Nuevo cliente</Button>
      </Group>

      {clientsQuery.isLoading && <Loader />}
      {clientsQuery.isError && (
        <Text c="red">Error al cargar clientes: {getErrorMessage(clientsQuery.error)}</Text>
      )}
      {clientsQuery.data && (
        <ClientTable clients={clientsQuery.data} onEdit={openEditModal} onDelete={confirmDelete} />
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClient ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <ClientForm
          initialValues={editingClient ?? undefined}
          submitLabel={editingClient ? 'Guardar cambios' : 'Crear cliente'}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </Stack>
  )
}

export default ClientsView
