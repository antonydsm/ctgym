import { useEffect, useState } from 'react'
import { AppShell, Group, Image, NavLink, Stack, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import banner from './assets/banner.png'
import xeraLogo from './assets/logo-xera-blanco.png'
import { api } from './lib/api'
import ClientsView from './views/ClientsView'
import CatalogView from './views/CatalogView'
import RoutineBuilderView from './views/RoutineBuilderView'
import SettingsView from './views/SettingsView'

const NAV_ITEMS = [
  { key: 'clients', label: 'Clientes', view: ClientsView },
  { key: 'catalog', label: 'Catálogo', view: CatalogView },
  { key: 'routines', label: 'Rutinas', view: RoutineBuilderView },
  { key: 'settings', label: 'Configuración', view: SettingsView }
] as const

type NavKey = (typeof NAV_ITEMS)[number]['key']

function App() {
  const [active, setActive] = useState<NavKey>('clients')
  const ActiveView = NAV_ITEMS.find((item) => item.key === active)?.view ?? ClientsView

  useEffect(() => {
    const unsubStatus = api.updater.onStatus((status) => {
      if (status !== 'downloaded') return
      modals.openConfirmModal({
        title: 'Actualización lista',
        children: (
          <Text size="sm">
            Hay una nueva versión de CT GYM descargada. Se puede instalar ahora (la app se
            reinicia) o más tarde, la próxima vez que abras el programa.
          </Text>
        ),
        labels: { confirm: 'Reiniciar e instalar', cancel: 'Más tarde' },
        confirmProps: { color: 'ctRed' },
        onConfirm: () => api.updater.quitAndInstall()
      })
    })
    return unsubStatus
  }, [])

  return (
    <AppShell header={{ height: 64 }} navbar={{ width: 220, breakpoint: 0 }} padding="lg">
      <AppShell.Header>
        <Group h="100%" px="md">
          <Image src={banner} alt="CT GYM - Centro de Entrenamiento" h={48} w="auto" fit="contain" />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Stack h="100%" justify="space-between">
          <Stack gap={4}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.key}
                label={item.label}
                active={active === item.key}
                onClick={() => setActive(item.key)}
              />
            ))}
          </Stack>
          <Group justify="flex-start" px="xs" pb="xs">
            <Image src={xeraLogo} alt="XERA" h={24} w="auto" fit="contain" />
          </Group>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <ActiveView />
      </AppShell.Main>
    </AppShell>
  )
}

export default App
