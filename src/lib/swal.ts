import Swal from 'sweetalert2'

// Base toast — fires from top-right, no confirm button
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  },
})

export const successToast = (title: string, text?: string) =>
  Toast.fire({ icon: 'success', title, text })

export const errorToast = (title: string, text?: string) =>
  Toast.fire({ icon: 'error', title, text, timer: 4500 })

export const infoToast = (title: string, text?: string) =>
  Toast.fire({ icon: 'info', title, text })

// Blocking confirm dialog — returns true if the user clicked "Confirm"
export const confirmDialog = async (opts: {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  icon?: 'warning' | 'question' | 'info'
  danger?: boolean
}) => {
  const result = await Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: opts.icon ?? 'question',
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Yes',
    cancelButtonText: opts.cancelText ?? 'Cancel',
    confirmButtonColor: opts.danger ? '#dc2626' : '#2563eb',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    customClass: {
      popup: '!rounded-2xl',
      confirmButton: '!rounded-xl !text-sm !font-semibold !px-5 !py-2.5',
      cancelButton: '!rounded-xl !text-sm !font-semibold !px-5 !py-2.5',
      title: '!text-lg !font-bold',
    },
  })
  return result.isConfirmed
}

// Input dialog — returns the string or null if cancelled
export const inputDialog = async (opts: {
  title: string
  text?: string
  placeholder?: string
  inputType?: 'text' | 'textarea'
  required?: boolean
  confirmText?: string
}) => {
  const result = await Swal.fire({
    title: opts.title,
    text: opts.text,
    input: opts.inputType ?? 'textarea',
    inputPlaceholder: opts.placeholder ?? '',
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Submit',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    preConfirm: (value: string) => {
      if (opts.required && !value.trim()) {
        Swal.showValidationMessage('This field is required')
        return false
      }
      return value
    },
    customClass: {
      popup: '!rounded-2xl',
      confirmButton: '!rounded-xl !text-sm !font-semibold !px-5 !py-2.5',
      cancelButton: '!rounded-xl !text-sm !font-semibold !px-5 !py-2.5',
      input: '!rounded-xl !text-sm !border-gray-300',
      title: '!text-lg !font-bold',
    },
  })
  return result.isConfirmed ? (result.value as string) : null
}
