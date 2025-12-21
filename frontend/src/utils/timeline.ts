// Timeline/Phase utilities for Gantt-style displays
// Shared between SlidePreview.vue and PresentationView.vue

import type { Phase } from './parser'
import { getTodayString } from './parser'

// 7 phase colors that cycle (8th = 1st)
export const PHASE_COLORS = [
    { from: '#60a5fa', to: '#3b82f6' }, // 藍
    { from: '#34d399', to: '#10b981' }, // 綠
    { from: '#fbbf24', to: '#f59e0b' }, // 黃
    { from: '#f472b6', to: '#ec4899' }, // 粉紅
    { from: '#a78bfa', to: '#8b5cf6' }, // 紫
    { from: '#fb923c', to: '#ea580c' }, // 橙
    { from: '#22d3ee', to: '#06b6d4' }  // 青
] as const

// Get phase color by index (cycles through 7 colors)
export function getPhaseColors(index: number) {
    return PHASE_COLORS[index % PHASE_COLORS.length]
}

// Get phase arrow style with dynamic gradient colors
// Note: phaseName and total are unused but kept for backward compatibility with templates
export function getPhaseArrowStyle(_phaseName: string, index: number, _total: number) {
    const colors = getPhaseColors(index)
    return {
        background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`
    }
}

// Calculate phase position and width based on actual date proportions
export function getPhaseStyle(phases: Phase[], index: number) {
    const totalPhases = phases.length
    if (totalPhases === 0) return {}

    // Calculate total duration (sum of all phase durations, no gaps)
    let totalDays = 0
    const phaseDurations: number[] = []

    for (const phase of phases) {
        const start = new Date(phase.startDate).getTime()
        const end = new Date(phase.endDate || phase.startDate).getTime()
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)
        phaseDurations.push(days)
        totalDays += days
    }

    if (totalDays <= 0) {
        const width = 100 / totalPhases
        const left = index * width
        const overlap = index > 0 ? 8 : 0
        return {
            left: `calc(${left}% - ${overlap}px)`,
            width: `calc(${width}% + ${overlap}px)`,
            zIndex: totalPhases - index
        }
    }

    // Calculate left position (sum of previous phase widths)
    let leftPercent = 0
    for (let i = 0; i < index; i++) {
        leftPercent += (phaseDurations[i] / totalDays) * 100
    }

    const widthPercent = (phaseDurations[index] / totalDays) * 100
    const overlap = index > 0 ? 8 : 0

    return {
        left: `calc(${leftPercent}% - ${overlap}px)`,
        width: `calc(${Math.max(widthPercent, 5)}% + ${overlap}px)`,
        zIndex: totalPhases - index
    }
}

// Format phase date for display
export function formatPhaseDate(phase: Phase) {
    if (!phase.startDate) return ''
    const start = phase.startDate.slice(5) // MM-DD
    const end = phase.endDate ? phase.endDate.slice(5) : ''
    return end && end !== start ? `${start}~${end}` : start
}

// Check if today falls within the project timeline
export function showTodayPin(phases: Phase[]): boolean {
    if (!phases.length) return false
    const today = getTodayString()
    const firstStart = phases[0]?.startDate
    const lastEnd = phases[phases.length - 1]?.endDate || phases[phases.length - 1]?.startDate
    return today >= firstStart && today <= lastEnd
}

// Calculate today pin position
export function getTodayPinStyle(phases: Phase[]) {
    const today = getTodayString()
    const firstStart = phases[0]?.startDate
    const lastEnd = phases[phases.length - 1]?.endDate || phases[phases.length - 1]?.startDate

    const start = new Date(firstStart).getTime()
    const end = new Date(lastEnd).getTime()
    const now = new Date(today).getTime()

    if (end === start) return { left: '0%' }
    const position = ((now - start) / (end - start)) * 100
    return { left: `${Math.min(100, Math.max(0, position))}%` }
}
