export interface Client {
  id: string
  full_name: string
  phone: string
  notes: string | null
  active: boolean
  created_at: string
}

export type ClientInput = Pick<Client, 'full_name' | 'phone' | 'notes'>

export interface Exercise {
  id: string
  name: string
  muscle_groups: string[]
  default_sets: number | null
  default_reps: string | null
  video_url: string | null
  image_url: string | null
  created_at: string
}

export type ExerciseInput = Pick<
  Exercise,
  'name' | 'muscle_groups' | 'default_sets' | 'default_reps' | 'video_url' | 'image_url'
>

export interface Routine {
  id: string
  client_id: string | null
  name: string | null
  notes: string | null
  created_at: string
}

export interface RoutineExercise {
  id: string
  routine_id: string
  exercise_id: string | null
  order_index: number
  sets: number | null
  reps: string | null
  notes: string | null
}

export interface RoutineWithExercises extends Routine {
  routine_exercises: (RoutineExercise & { exercise: Exercise | null })[]
}

export interface RoutineExerciseSaveInput {
  exercise_id: string
  sets: number | null
  reps: string | null
  notes: string | null
}

export interface RoutineSaveInput {
  id?: string
  client_id: string
  name: string
  notes: string
  exercises: RoutineExerciseSaveInput[]
}

export type WhatsappStatus =
  | 'idle'
  | 'initializing'
  | 'qr'
  | 'authenticated'
  | 'ready'
  | 'disconnected'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'not-available'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'
