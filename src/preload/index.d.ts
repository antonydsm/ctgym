import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Client,
  ClientInput,
  ClientPayment,
  ClientPaymentInput,
  Exercise,
  ExerciseInput,
  Routine,
  RoutineSaveInput,
  RoutineWithExercises,
  UpdateStatus,
  WhatsappStatus
} from '../shared/types'

interface Api {
  clients: {
    list: () => Promise<Client[]>
    create: (input: ClientInput) => Promise<Client>
    update: (id: string, input: Partial<ClientInput>) => Promise<Client>
    delete: (id: string) => Promise<void>
  }
  payments: {
    listByClient: (clientId: string) => Promise<ClientPayment[]>
    listLatest: () => Promise<ClientPayment[]>
    create: (input: ClientPaymentInput) => Promise<ClientPayment>
    exportReceipt: (paymentId: string) => Promise<string>
  }
  exercises: {
    list: () => Promise<Exercise[]>
    create: (input: ExerciseInput) => Promise<Exercise>
    update: (id: string, input: Partial<ExerciseInput>) => Promise<Exercise>
    delete: (id: string) => Promise<void>
    uploadImage: () => Promise<string | null>
  }
  routines: {
    listByClient: (clientId: string) => Promise<Routine[]>
    get: (id: string) => Promise<RoutineWithExercises>
    save: (input: RoutineSaveInput) => Promise<string>
    delete: (id: string) => Promise<void>
    exportPdf: (id: string) => Promise<string>
    sendWhatsapp: (id: string) => Promise<void>
  }
  whatsapp: {
    init: () => Promise<void>
    getStatus: () => Promise<WhatsappStatus>
    onQr: (callback: (dataUrl: string) => void) => () => void
    onStatus: (callback: (status: WhatsappStatus) => void) => () => void
  }
  updater: {
    getStatus: () => Promise<{ status: UpdateStatus; version: string | null }>
    getAppVersion: () => Promise<string>
    quitAndInstall: () => Promise<void>
    onStatus: (callback: (status: UpdateStatus) => void) => () => void
    onProgress: (callback: (percent: number) => void) => () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
