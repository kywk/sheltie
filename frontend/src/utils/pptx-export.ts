import { parseMarkdown, sortProjects, type Phase } from './parser'
import { getStatusIcon } from './status'
import { PHASE_COLORS } from './timeline'

// Lazy load pptxgenjs to avoid large initial bundle
export async function exportToPPTX(content: string, title: string = 'Sheltie Export') {
    const projects = sortProjects(parseMarkdown(content))
    if (projects.length === 0) {
        alert('沒有可匯出的專案')
        return
    }

    // Dynamic import for code splitting
    const PptxGenJS = (await import('pptxgenjs')).default

    const pptx = new PptxGenJS()
    pptx.title = title
    pptx.author = 'Sheltie'
    pptx.layout = 'LAYOUT_16x9'

    // Define colors
    const colors = {
        primary: '2563eb',
        success: '22c55e',
        warning: 'f59e0b',
        danger: 'ef4444',
        text: '1f2937',
        muted: '6b7280',
        border: 'e5e7eb',
        bg: 'f9fafb',
        tagState: { bg: 'dbeafe', text: '1e40af' },
        tagProgress: { bg: 'dcfce7', text: '166534' },
        tagContact: { bg: 'fef3c7', text: '92400e' },
        tagCategory: { bg: 'f3e8ff', text: '7c3aed' }
    }

    // Generate summary slides (10 projects per slide)
    for (let i = 0; i < projects.length; i += 10) {
        const slideProjects = projects.slice(i, i + 10)
        const slide = pptx.addSlide()

        // Title
        slide.addText(`專案進展彙整 ${Math.floor(i / 10) + 1}`, {
            x: 0.5,
            y: 0.3,
            w: '90%',
            h: 0.5,
            fontSize: 24,
            bold: true,
            color: colors.text
        })

        // Table
        const tableData: any[] = [
            // Header row
            [
                { text: '燈號', options: { bold: true, fill: { color: colors.bg } } },
                { text: '專案名稱', options: { bold: true, fill: { color: colors.bg } } },
                { text: '狀態', options: { bold: true, fill: { color: colors.bg } } },
                { text: '進度', options: { bold: true, fill: { color: colors.bg } } },
                { text: '窗口', options: { bold: true, fill: { color: colors.bg } } }
            ]
        ]

        for (const project of slideProjects) {
            tableData.push([
                { text: getStatusIcon(project.status), options: { align: 'center' } },
                { text: project.name },
                { text: project.currentState },
                { text: `${project.progress}%`, options: { align: 'center' } },
                { text: project.contact }
            ])
        }

        slide.addTable(tableData, {
            x: 0.5,
            y: 1.0,
            w: 9.0,
            colW: [0.8, 3.0, 2.0, 1.0, 2.2],
            fontSize: 11,
            border: { type: 'solid', color: colors.border, pt: 0.5 },
            fontFace: 'Arial'
        })
    }

    // Generate individual project slides
    for (const project of projects) {
        const slide = pptx.addSlide()

        // === Header with Status Icon and Title ===
        slide.addText(`${getStatusIcon(project.status)} ${project.name}`, {
            x: 0.5,
            y: 0.25,
            w: 5.5,
            h: 0.5,
            fontSize: 22,
            bold: true,
            color: colors.text
        })

        // === Header Tags ===
        let tagX = 6.0
        const tagY = 0.3
        const tagH = 0.35
        const tagFontSize = 10

        // Tag: State
        if (project.currentState) {
            const tagWidth = Math.max(0.8, project.currentState.length * 0.12 + 0.3)
            slide.addShape('roundRect' as any, {
                x: tagX,
                y: tagY,
                w: tagWidth,
                h: tagH,
                fill: { color: colors.tagState.bg },
                line: { color: colors.tagState.bg }
            })
            slide.addText(project.currentState, {
                x: tagX,
                y: tagY,
                w: tagWidth,
                h: tagH,
                fontSize: tagFontSize,
                color: colors.tagState.text,
                align: 'center',
                valign: 'middle'
            })
            tagX += tagWidth + 0.1
        }

        // Tag: Progress
        const progressText = `${project.progress}%`
        slide.addShape('roundRect' as any, {
            x: tagX,
            y: tagY,
            w: 0.6,
            h: tagH,
            fill: { color: colors.tagProgress.bg },
            line: { color: colors.tagProgress.bg }
        })
        slide.addText(progressText, {
            x: tagX,
            y: tagY,
            w: 0.6,
            h: tagH,
            fontSize: tagFontSize,
            color: colors.tagProgress.text,
            align: 'center',
            valign: 'middle'
        })
        tagX += 0.7

        // Tag: Contact
        if (project.contact) {
            const contactWidth = Math.max(0.8, project.contact.length * 0.12 + 0.3)
            slide.addShape('roundRect' as any, {
                x: tagX,
                y: tagY,
                w: contactWidth,
                h: tagH,
                fill: { color: colors.tagContact.bg },
                line: { color: colors.tagContact.bg }
            })
            slide.addText(project.contact, {
                x: tagX,
                y: tagY,
                w: contactWidth,
                h: tagH,
                fontSize: tagFontSize,
                color: colors.tagContact.text,
                align: 'center',
                valign: 'middle'
            })
            tagX += contactWidth + 0.1
        }

        // Tag: Category
        if (project.category) {
            const catWidth = Math.max(0.8, project.category.length * 0.12 + 0.3)
            slide.addShape('roundRect' as any, {
                x: tagX,
                y: tagY,
                w: catWidth,
                h: tagH,
                fill: { color: colors.tagCategory.bg },
                line: { color: colors.tagCategory.bg }
            })
            slide.addText(project.category, {
                x: tagX,
                y: tagY,
                w: catWidth,
                h: tagH,
                fontSize: tagFontSize,
                color: colors.tagCategory.text,
                align: 'center',
                valign: 'middle'
            })
        }

        // === Header divider line ===
        slide.addShape('line', {
            x: 0.5,
            y: 0.8,
            w: 9.0,
            h: 0,
            line: { color: colors.border, width: 1 }
        })

        // === Departments Row ===
        const hostDepts = project.departments?.主辦?.join(', ') || '-'
        const partnerDepts = project.departments?.協辦?.join(', ') || '-'
        slide.addText([
            { text: '主辦：', options: { color: colors.muted, bold: true } },
            { text: hostDepts, options: { color: colors.text } },
            { text: '  │  ', options: { color: 'd1d5db' } },
            { text: '協辦：', options: { color: colors.muted, bold: true } },
            { text: partnerDepts, options: { color: colors.text } }
        ], {
            x: 0.5,
            y: 0.9,
            w: 9.0,
            h: 0.35,
            fontSize: 11,
            fontFace: 'Arial'
        })

        // === Timeline Gantt Chart with Chevron Arrows ===
        let yPos = 1.35
        if (project.phases.length > 0) {
            slide.addText('時程', {
                x: 0.5,
                y: yPos,
                w: 9.0,
                h: 0.3,
                fontSize: 12,
                bold: true,
                color: colors.muted
            })
            yPos += 0.35

            // Calculate phase positions
            const ganttX = 0.5
            const ganttWidth = 9.0
            const arrowHeight = 0.45
            const phases = project.phases
            const phaseWidths = calculatePhaseWidths(phases, ganttWidth)

            let currentX = ganttX
            for (let i = 0; i < phases.length; i++) {
                const phase = phases[i]
                const phaseWidth = phaseWidths[i]
                const colorIndex = i % PHASE_COLORS.length
                const phaseColor = PHASE_COLORS[colorIndex].to.replace('#', '')

                // Add chevron arrow shape
                slide.addShape('chevron' as any, {
                    x: currentX,
                    y: yPos,
                    w: phaseWidth,
                    h: arrowHeight,
                    fill: { color: phaseColor },
                    line: { color: phaseColor }
                })

                // Add phase text
                const dateText = formatPhaseDateShort(phase)
                slide.addText([
                    { text: phase.name, options: { bold: true } },
                    { text: `\n${dateText}`, options: { fontSize: 8 } }
                ], {
                    x: currentX,
                    y: yPos,
                    w: phaseWidth,
                    h: arrowHeight,
                    fontSize: 9,
                    color: 'FFFFFF',
                    align: 'center',
                    valign: 'middle'
                })

                currentX += phaseWidth - 0.1 // Slight overlap
            }
            yPos += arrowHeight + 0.25
        }

        // === Bottom Section: Meetings (2/3) + Notes (1/3) ===
        const bottomY = yPos + 0.1
        const meetingsWidth = 6.0
        const notesWidth = 2.8
        const notesX = 0.5 + meetingsWidth + 0.2

        // Meetings Column
        slide.addText('會辦狀況', {
            x: 0.5,
            y: bottomY,
            w: meetingsWidth,
            h: 0.3,
            fontSize: 12,
            bold: true,
            color: colors.muted
        })

        let meetingY = bottomY + 0.35
        for (const meeting of project.meetings.slice(0, 5)) {
            // Date
            slide.addText(meeting.date, {
                x: 0.5,
                y: meetingY,
                w: 1.0,
                h: 0.28,
                fontSize: 9,
                color: meeting.isOld ? colors.muted : colors.text,
                bold: true,
                fontFace: 'Arial'
            })

            // Meeting lines (up to 3 lines per meeting)
            for (const line of meeting.lines.slice(0, 3)) {
                const textColor = line.isPlanned ? colors.primary :
                    line.isTracking ? colors.danger :
                        meeting.isOld ? colors.muted : colors.text

                slide.addText(line.text, {
                    x: 1.5,
                    y: meetingY,
                    w: 4.5,
                    h: 0.28,
                    fontSize: 10,
                    color: textColor,
                    bold: line.isTracking,
                    italic: line.isPlanned,
                    fontFace: 'Arial'
                })
                meetingY += 0.28
            }
            meetingY += 0.05 // Gap between meetings
        }

        // Notes Column (if any notes exist)
        if (project.notes.length > 0) {
            // Vertical divider
            slide.addShape('line', {
                x: notesX - 0.15,
                y: bottomY,
                w: 0,
                h: 2.5,
                line: { color: colors.border, width: 1 }
            })

            slide.addText('其他補充事項', {
                x: notesX,
                y: bottomY,
                w: notesWidth,
                h: 0.3,
                fontSize: 12,
                bold: true,
                color: colors.muted
            })

            let noteY = bottomY + 0.35
            for (const note of project.notes.slice(0, 5)) {
                const noteColor = note.isPlanned ? colors.primary :
                    note.isTracking ? colors.danger : colors.text

                slide.addText(`• ${note.text}`, {
                    x: notesX,
                    y: noteY,
                    w: notesWidth,
                    h: 0.28,
                    fontSize: 10,
                    color: noteColor,
                    bold: note.isTracking,
                    italic: note.isPlanned,
                    fontFace: 'Arial'
                })
                noteY += 0.3
            }
        }
    }

    // Save file
    pptx.writeFile({ fileName: `${title}.pptx` })
}

// Helper: Calculate phase widths based on duration proportions
function calculatePhaseWidths(phases: Phase[], totalWidth: number): number[] {
    if (phases.length === 0) return []

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
        // Equal widths fallback
        return phases.map(() => totalWidth / phases.length)
    }

    // Add overlap adjustment for chevron arrows
    const overlapPerArrow = 0.1
    const effectiveWidth = totalWidth + overlapPerArrow * (phases.length - 1)

    return phaseDurations.map(days => (days / totalDays) * effectiveWidth)
}

// Helper: Format phase date for display (MM-DD~MM-DD)
function formatPhaseDateShort(phase: Phase): string {
    if (!phase.startDate) return ''
    const start = phase.startDate.slice(5) // MM-DD
    const end = phase.endDate ? phase.endDate.slice(5) : ''
    return end && end !== start ? `${start}~${end}` : start
}
