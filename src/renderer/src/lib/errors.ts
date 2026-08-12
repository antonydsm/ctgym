// Electron antepone "Error invoking remote method 'canal':\n" (a veces
// también "Error: ") al mensaje real cuando un handler de ipcMain.handle
// lanza una excepción. Lo sacamos para mostrarle al usuario solo el mensaje
// que nosotros escribimos.
export function getErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const withoutInvokePrefix = raw.replace(/^Error invoking remote method '[^']*':\s*/, '')
  return withoutInvokePrefix.replace(/^Error:\s*/, '')
}
