'use client'

import { useState } from 'react'
import { Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InvoicePDFDownloadProps {
  invoiceId: string
  invoiceNumber: string
  className?: string
}

export default function InvoicePDFDownload({ 
  invoiceId, 
  invoiceNumber, 
  className = '' 
}: InvoicePDFDownloadProps) {
  const [printing, setPrinting] = useState(false)

  const printInvoice = async () => {
    try {
      setPrinting(true)
      
      console.log('Opening invoice for printing:', invoiceId)
      
      // Open the invoice in a new window with auto-print enabled
      const printWindow = window.open(
        `/api/invoice/${invoiceId}?format=html&auto_print=true`,
        '_blank',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      )
      
      if (printWindow) {
        printWindow.focus()
        console.log('Print window opened successfully')
      } else {
        throw new Error('Failed to open print window - popup might be blocked')
      }
      
    } catch (error) {
      console.error('Error opening print window:', error)
      
      // Fallback: Try to open in same tab
      try {
        window.open(`/api/invoice/${invoiceId}?format=html&auto_print=true`, '_blank')
      } catch (fallbackError) {
        console.error('Fallback print failed:', fallbackError)
        alert('Unable to open print dialog. Please check if popups are blocked.')
      }
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Button
      onClick={printInvoice}
      disabled={printing}
      className={`flex items-center gap-2 ${className}`}
    >
      {printing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Printer className="w-4 h-4" />
      )}
      {printing ? 'Opening Print...' : 'Print Invoice'}
    </Button>
  )
}