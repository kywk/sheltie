import { parseMarkdown, sortProjects } from './parser'
import { getStatusIcon } from './status'

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
        bg: 'f9fafb'
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

        // Header with status
        slide.addText(`${getStatusIcon(project.status)} ${project.name}`, {
            x: 0.5,
            y: 0.3,
            w: '90%',
            h: 0.6,
            fontSize: 22,
            bold: true,
            color: colors.text
        })

        // Basic info table (top 1/3)
        const infoData: any[] = [
            [
                { text: '狀態', options: { bold: true, fill: { color: colors.bg } } },
                { text: project.currentState },
                { text: '進度', options: { bold: true, fill: { color: colors.bg } } },
                { text: `${project.progress}%` }
            ],
            [
                { text: '窗口', options: { bold: true, fill: { color: colors.bg } } },
                { text: project.contact },
                { text: '分類', options: { bold: true, fill: { color: colors.bg } } },
                { text: project.category || '-' }
            ]
        ]

        if (project.phases.length > 0) {
            const phasesText = project.phases
                .map(p => `${p.name}: ${p.startDate} ~ ${p.endDate}`)
                .join(' | ')
            infoData.push([
                { text: '時程', options: { bold: true, fill: { color: colors.bg } } },
                { text: phasesText, options: { colspan: 3 } }
            ])
        }

        slide.addTable(infoData, {
            x: 0.5,
            y: 1.0,
            w: 9.0,
            colW: [1.0, 3.5, 1.0, 3.5],
            fontSize: 11,
            border: { type: 'solid', color: colors.border, pt: 0.5 },
            fontFace: 'Arial'
        })

        // Meetings section (bottom 2/3)
        let yPos = 2.5

        slide.addText('會辦狀況', {
            x: 0.5,
            y: yPos,
            w: 9.0,
            h: 0.4,
            fontSize: 14,
            bold: true,
            color: colors.text
        })
        yPos += 0.5

        for (const meeting of project.meetings.slice(0, 5)) {
            // Add date header
            slide.addText(meeting.date, {
                x: 0.5,
                y: yPos,
                w: 1.0,
                h: 0.35,
                fontSize: 11,
                color: meeting.isOld ? colors.muted : colors.text,
                bold: true,
                fontFace: 'Arial'
            })

            // Add meeting lines
            for (const line of meeting.lines.slice(0, 2)) {
                const textColor = line.isPlanned ? colors.primary :
                    line.isTracking ? colors.danger :
                        meeting.isOld ? colors.muted : colors.text

                slide.addText(line.text, {
                    x: 1.5,
                    y: yPos,
                    w: 8.0,
                    h: 0.35,
                    fontSize: 11,
                    color: textColor,
                    bold: line.isTracking,
                    italic: line.isPlanned,
                    fontFace: 'Arial'
                })
                yPos += 0.35
            }
        }

        // Other notes
        if (project.notes.length > 0) {
            yPos += 0.2
            slide.addText('其他補充', {
                x: 0.5,
                y: yPos,
                w: 9.0,
                h: 0.4,
                fontSize: 14,
                bold: true,
                color: colors.text
            })
            yPos += 0.5

            for (const note of project.notes.slice(0, 3)) {
                slide.addText(`• ${note}`, {
                    x: 0.5,
                    y: yPos,
                    w: 9.0,
                    h: 0.35,
                    fontSize: 11,
                    color: colors.text,
                    fontFace: 'Arial'
                })
                yPos += 0.35
            }
        }
    }

    // Save file
    pptx.writeFile({ fileName: `${title}.pptx` })
}

