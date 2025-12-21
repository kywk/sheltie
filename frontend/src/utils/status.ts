// Status utilities for project status display
// Shared between SlidePreview.vue, PresentationView.vue, and pptx-export.ts

export type StatusType = '綠' | '黃' | '紅' | string

// Get status CSS class based on status string
export function getStatusClass(status?: string): string {
    if (!status) return ''
    if (status === '紅' || status.includes('紅')) return 'red'
    if (status === '黃' || status.includes('黃')) return 'yellow'
    return 'green'
}

// Get status emoji icon based on status string
export function getStatusIcon(status?: string): string {
    if (!status) return '●'
    if (status === '紅' || status.includes('紅')) return '🔴'
    if (status === '黃' || status.includes('黃')) return '🟡'
    return '🟢'
}
