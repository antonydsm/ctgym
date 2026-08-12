import { useEffect, useState } from 'react'
import { Badge, Button, Divider, Group, Image, Progress, Stack, Text, Title } from '@mantine/core'
import { api } from '@renderer/lib/api'
import logo from '@renderer/assets/logo.png'
import type { UpdateStatus, WhatsappStatus } from '@shared/types'

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

const UPDATE_STATUS_LABEL: Record<UpdateStatus, string> = {
  idle: 'Sin chequear',
  checking: 'Buscando actualizaciones...',
  'not-available': 'Al día',
  available: 'Descargando actualización...',
  downloading: 'Descargando actualización...',
  downloaded: 'Actualización lista para instalar',
  error: 'No se pudo chequear actualizaciones'
}

function SettingsView() {
  const [status, setStatus] = useState<WhatsappStatus>('idle')
  const [qr, setQr] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateProgress, setUpdateProgress] = useState(0)

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

  useEffect(() => {
    api.updater.getAppVersion().then(setAppVersion)
    api.updater.getStatus().then((s) => setUpdateStatus(s.status))

    const unsubStatus = api.updater.onStatus(setUpdateStatus)
    const unsubProgress = api.updater.onProgress(setUpdateProgress)

    return () => {
      unsubStatus()
      unsubProgress()
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

      <Stack gap="xs">
        <Text fw={500}>Versión</Text>
        <Group>
          <Text size="sm">{appVersion ? `v${appVersion}` : '—'}</Text>
          <Badge color={updateStatus === 'downloaded' ? 'green' : 'gray'} variant="light">
            {UPDATE_STATUS_LABEL[updateStatus]}
          </Badge>
        </Group>
        {(updateStatus === 'downloading' || updateStatus === 'available') && (
          <Progress value={updateProgress} size="sm" maw={260} color="ctRed" />
        )}
        {updateStatus === 'downloaded' && (
          <Button
            onClick={() => api.updater.quitAndInstall()}
            size="xs"
            variant="light"
            color="ctRed"
          >
            Reiniciar e instalar ahora
          </Button>
        )}
      </Stack>

      <Divider />

      <Stack gap={4}>
        <Text fw={500}>Acerca de</Text>
        <Group gap="sm" wrap="nowrap">
          <Image src={logo} alt="CT GYM" w={40} h={40} fit="contain" />
          <Stack gap={0}>
            <Text size="sm" fw={600}>
              CT GYM — Centro de Entrenamiento
            </Text>
            <Text size="xs" c="dimmed">
              Gestión de rutinas y envío por WhatsApp
            </Text>
          </Stack>
        </Group>
      </Stack>
    </Stack>
  )
}

export default SettingsView
