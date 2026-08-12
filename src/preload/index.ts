import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  Client,
  ClientInput,
  Exercise,
  ExerciseInput,
  Routine,
  RoutineSaveInput,
  RoutineWithExercises,
  WhatsappStatus
} from '../shared/types'

const api = {
  clients: {
    list: (): Promise<Client[]> => ipcRenderer.invoke('clients:list'),
    create: (input: ClientInput): Promise<Client> => ipcRenderer.invoke('clients:create', input),
    update: (id: string, input: Partial<ClientInput>): Promise<Client> =>
      ipcRenderer.invoke('clients:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('clients:delete', id)
  },
  exercises: {
    list: (): Promise<Exercise[]> => ipcRenderer.invoke('exercises:list'),
    create: (input: ExerciseInput): Promise<Exercise> =>
      ipcRenderer.invoke('exercises:create', input),
    update: (id: string, input: Partial<ExerciseInput>): Promise<Exercise> =>
      ipcRenderer.invoke('exercises:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('exercises:delete', id),
    uploadImage: (): Promise<string | null> => ipcRenderer.invoke('exercises:upload-image')
  },
  routines: {
    listByClient: (clientId: string): Promise<Routine[]> =>
      ipcRenderer.invoke('routines:listByClient', clientId),
    get: (id: string): Promise<RoutineWithExercises> => ipcRenderer.invoke('routines:get', id),
    save: (input: RoutineSaveInput): Promise<string> => ipcRenderer.invoke('routines:save', input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('routines:delete', id),
    exportPdf: (id: string): Promise<string> => ipcRenderer.invoke('routines:export-pdf', id),
    sendWhatsapp: (id: string): Promise<void> => ipcRenderer.invoke('routines:send-whatsapp', id)
  },
  whatsapp: {
    init: (): Promise<void> => ipcRenderer.invoke('whatsapp:init'),
    getStatus: (): Promise<WhatsappStatus> => ipcRenderer.invoke('whatsapp:get-status'),
    onQr: (callback: (dataUrl: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, dataUrl: string): void => callback(dataUrl)
      ipcRenderer.on('whatsapp:qr', listener)
      return () => ipcRenderer.removeListener('whatsapp:qr', listener)
    },
    onStatus: (callback: (status: WhatsappStatus) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: WhatsappStatus): void =>
        callback(status)
      ipcRenderer.on('whatsapp:status', listener)
      return () => ipcRenderer.removeListener('whatsapp:status', listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
