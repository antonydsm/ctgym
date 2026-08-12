import { useEffect, useState } from 'react'
import { Badge, Button, Group, Image, Stack, Text, Title } from '@mantine/core'
import { api } from '@renderer/lib/api'
import type { WhatsappStatus } from '@shared/types'

const STATUS_LABEL: Record<WhatsappStatus, string> = {
  idle: 'Sin vincular',
  initializing: 'Iniciando...',
  qr: 'Escaneá el código QR',
  authenticated: 'Autenticando...',
  ready: 'Conectado',
  disconnected: 'Desconectado'
}

const STATUS_COLOR: Record<WhatsappStatus, string> = {
  idle: 'gray',
  initializing: 'yellow',
  qr: 'yellow',
  authenticated: 'yellow',
  ready: 'green',
  disconnected: 'red'
}

function SettingsView() {
  const [status, setStatus] = useState<WhatsappStatus>('idle')
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    api.whatsapp.getStatus().then(setStatus)

    const unsubStatus = api.whatsapp.onStatus((next) => {
      setStatus(next)
      if (next !== 'qr') setQr(null)
    })
    const unsubQr = api.whatsapp.onQr(setQr)

    return () => {
      unsubStatus()
      unsubQr()
    }
  }, [])

  function handleLink() {
    api.whatsapp.init()
  }

  return (
    <Stack>
      <Title order={2}>Configuración</Title>

      <Stack gap="xs">
        <Text fw={500}>WhatsApp</Text>
        <Group>
          <Badge color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Badge>
          {(status === 'idle' || status === 'disconnected') && (
            <Button onClick={handleLink} size="xs" variant="light">
              Vincular WhatsApp
            </Button>
          )}
        </Group>

        {qr && status === 'qr' && (
          <Stack gap={4} maw={260} mt="xs">
            <Text size="sm" c="dimmed">
              Abrí WhatsApp en tu celular → Configuración → Dispositivos vinculados → Vincular un
              dispositivo, y escaneá este código:
            </Text>
            <Image src={qr} alt="Código QR de WhatsApp" />
          </Stack>
        )}

        {status === 'ready' && (
          <Text size="sm" c="dimmed">
            El WhatsApp del gimnasio ya está vinculado. Las rutinas se pueden enviar directamente
            desde la pestaña Rutinas.
          </Text>
        )}
      </Stack>
    </Stack>
  )
}

export default SettingsView
