declare module 'pdfmake' {
  interface PdfMakeFontFiles {
    normal: string
    bold?: string
    italics?: string
    bolditalics?: string
  }

  interface PdfMakeFonts {
    [fontName: string]: PdfMakeFontFiles
  }

  interface PdfDocument {
    write(filename: string): Promise<void>
  }

  interface PdfMake {
    addFonts(fonts: PdfMakeFonts): void
    setLocalAccessPolicy(callback: (path: string) => boolean): void
    setUrlAccessPolicy(callback: (url: string) => boolean): void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createPdf(docDefinition: Record<string, any>): PdfDocument
  }

  const pdfMake: PdfMake
  export default pdfMake
}
