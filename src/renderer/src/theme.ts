import { createTheme, type MantineColorsTuple } from '@mantine/core'

const ctRed: MantineColorsTuple = [
  '#ffe9ea',
  '#ffd1d3',
  '#f8a2a6',
  '#f26f75',
  '#ec454c',
  '#e92b33',
  '#e51e26', // primary shade, close to the CT GYM logo red
  '#c8121a',
  '#b30913',
  '#9c0009'
]

export const theme = createTheme({
  primaryColor: 'ctRed',
  colors: {
    ctRed
  },
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  defaultRadius: 'md'
})
