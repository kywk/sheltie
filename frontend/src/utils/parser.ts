// Markdown parser for Sheltie project format
// Parses project markdown into structured data for slides

export interface Project {
    name: string
    status: '綠' | '黃' | '紅' | string
    currentState: string
    progress: number
    contact: string
    phases: Phase[]
    departments: {
        主辦: string[]
        協辦: string[]
    }
    category: string
    meetings: MeetingEntry[]
    notes: string[]
    lineNumber: number  // Line number where this project starts (0-indexed)
}

export interface Phase {
    name: string
    startDate: string
    endDate: string
}


// Meeting entry - just date and raw content lines
export interface MeetingEntry {
    date: string
    lines: MeetingLine[]
    isOld: boolean  // 超過一個月
}

// Each line in meeting content
export interface MeetingLine {
    text: string
    isTracking: boolean  // _待追蹤_ 開頭
    isPlanned: boolean   // _預計_ 開頭
}

export interface Slide {
    type: 'summary' | 'project'
    projects?: Project[]
    project?: Project
}

export function parseMarkdown(content: string): Project[] {
    const projects: Project[] = []
    const lines = content.split('\n')

    // Find section boundaries (--- separators)
    let sectionStart = 0
    let currentSection: string[] = []

    for (let i = 0; i <= lines.length; i++) {
        const line = lines[i]

        if (i === lines.length || line === '---') {
            if (currentSection.length > 0) {
                const project = parseProjectSection(currentSection.join('\n'), sectionStart)
                if (project) {
                    projects.push(project)
                }
            }
            currentSection = []
            sectionStart = i + 1
        } else {
            currentSection.push(line)
        }
    }

    return projects
}

function parseProjectSection(section: string, lineOffset: number = 0): Project | null {
    const lines = section.trim().split('\n')

    // Find project name (# heading)
    const nameMatch = lines.find(l => l.startsWith('# '))
    if (!nameMatch) return null

    const project: Project = {
        name: nameMatch.replace('# ', '').trim(),
        status: '綠',
        currentState: '',
        progress: 0,
        contact: '',
        phases: [],
        departments: { 主辦: [], 協辦: [] },
        category: '',
        meetings: [],
        notes: [],
        lineNumber: lineOffset
    }

    let currentSection = ''
    let currentMeeting: MeetingEntry | null = null
    let inTimeline = false

    let inDepartments = false
    let currentDeptType = ''

    for (const line of lines) {
        if (line.startsWith('## ')) {
            currentSection = line.replace('## ', '').trim()
            currentMeeting = null
            inTimeline = false
            inDepartments = false
            continue
        }

        if (currentSection === '基本資訊') {
            parseBasicInfo(line, project, inTimeline, inDepartments, currentDeptType, 
                (v) => { inTimeline = v }, 
                (v) => { inDepartments = v },
                (v) => { currentDeptType = v }
            )
        } else if (currentSection.includes('會辦狀況')) {
            parseMeeting(line, project, currentMeeting, (m) => { currentMeeting = m })
        } else if (currentSection === '其他補充') {
            if (line.match(/^[\*\-]\s+/) && line.length > 2) {
                project.notes.push(line.replace(/^[\*\-]\s+/, '').trim())
            }
        }
    }

    return project
}

function parseBasicInfo(
    line: string,
    project: Project,
    inTimeline: boolean,
    inDepartments: boolean,
    currentDeptType: string,
    setInTimeline: (v: boolean) => void,
    setInDepartments: (v: boolean) => void,
    setCurrentDeptType: (v: string) => void
) {
    const trimmed = line.trim()

    if (trimmed.match(/^[\*\-]\s*燈號:/)) {
        const value = trimmed.replace(/^[\*\-]\s*燈號:/, '').trim()
        project.status = value
    } else if (trimmed.match(/^[\*\-]\s*(目前)?狀態:/)) {
        project.currentState = trimmed.replace(/^[\*\-]\s*(目前)?狀態:/, '').trim()
    } else if (trimmed.match(/^[\*\-]\s*進度:/)) {
        const value = trimmed.replace(/^[\*\-]\s*進度:/, '').trim().replace('%', '')
        project.progress = parseInt(value) || 0
    } else if (trimmed.match(/^[\*\-]\s*窗口:/)) {
        project.contact = trimmed.replace(/^[\*\-]\s*窗口:/, '').trim()
    } else if (trimmed.match(/^[\*\-]\s*分類:/)) {
        project.category = trimmed.replace(/^[\*\-]\s*分類:/, '').trim()
    } else if (trimmed.match(/^[\*\-]\s*時程:/)) {
        setInTimeline(true)
        setInDepartments(false)
    } else if (trimmed.match(/^[\*\-]\s*相關單位:/)) {
        setInTimeline(false)
        setInDepartments(true)
    } else if (trimmed.match(/^[\*\-]\s*主辦:/)) {
        const value = trimmed.replace(/^[\*\-]\s*主辦:/, '').trim()
        if (value) {
            project.departments.主辦 = value.split(',').map(s => s.trim()).filter(s => s)
        }
        setCurrentDeptType('主辦')
        setInDepartments(true)
    } else if (trimmed.match(/^[\*\-]\s*協辦/)) {
        const value = trimmed.replace(/^[\*\-]\s*協辦[^:]*:/, '').trim()
        if (value) {
            project.departments.協辦 = value.split(',').map(s => s.trim()).filter(s => s)
        }
        setCurrentDeptType('協辦')
        setInDepartments(true)
    } else if (inTimeline) {
        // Parse any phase format: - 階段名: YYYY-MM-DD ~ YYYY-MM-DD
        const phaseMatch = trimmed.match(/^[\*\-]\s*([^:]+):\s*(\d{4}-\d{2}-\d{2})(?:\s*~\s*(\d{4}-\d{2}-\d{2}))?$/)
        if (phaseMatch) {
            const phaseName = phaseMatch[1].trim()
            const startDate = phaseMatch[2]
            const endDate = phaseMatch[3] || startDate

            project.phases.push({
                name: phaseName,
                startDate,
                endDate
            })
        }
    } else if (line.match(/^[\s\t]+[\*\-]\s*(.+)$/)) {
        // Parse indented list items (departments or timeline)
        const indentMatch = line.match(/^[\s\t]+[\*\-]\s*(.+)$/)
        if (indentMatch && inDepartments && currentDeptType) {
            const dept = indentMatch[1].trim()
            if (currentDeptType === '主辦') {
                project.departments.主辦.push(dept)
            } else if (currentDeptType === '協辦') {
                project.departments.協辦.push(dept)
            }
        } else if (indentMatch && inTimeline) {
            // Parse timeline items (indented)
            const timelineMatch = indentMatch[1].match(/^([^:]+):\s*(\d{4}-\d{2}-\d{2})(?:\s*~\s*(\d{4}-\d{2}-\d{2}))?$/)
            if (timelineMatch) {
                const phaseName = timelineMatch[1].trim()
                const startDate = timelineMatch[2]
                const endDate = timelineMatch[3] || startDate

                project.phases.push({
                    name: phaseName,
                    startDate,
                    endDate
                })
            }
        }
    }
}

function parseMeeting(
    line: string,
    project: Project,
    currentMeeting: MeetingEntry | null,
    setCurrentMeeting: (m: MeetingEntry) => void
) {
    const trimmed = line.trim()

    // Date line: - YYYY-MM-DD (must be exactly a date, nothing else)
    const dateMatch = trimmed.match(/^[\*\-]\s*(\d{4}-\d{2}-\d{2})$/)
    if (dateMatch) {
        const date = dateMatch[1]
        const entry: MeetingEntry = {
            date,
            lines: [],
            isOld: isOverOneMonth(date)
        }
        project.meetings.push(entry)
        setCurrentMeeting(entry)
        return
    }

    // Content line: must be indented (spaces or tabs) followed by - or *
    // Format:   - 會辦內容 or \t* 會辦內容
    const isIndented = line.match(/^[\s\t]+[\*\-].+/)
    if (currentMeeting && isIndented) {
        const content = trimmed.replace(/^[\*\-]\s*/, '').trim()
        if (content) {
            const meetingLine: MeetingLine = {
                text: content,
                isTracking: content.startsWith('_待追蹤_'),
                isPlanned: content.startsWith('_預計_')
            }
            currentMeeting.lines.push(meetingLine)
        }
    }
}

function isOverOneMonth(dateStr: string): boolean {
    const date = new Date(dateStr)
    const now = new Date()
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    return date < oneMonthAgo
}

export function sortProjects(projects: Project[]): Project[] {
    return [...projects].sort((a, b) => {
        // 1. Status priority: 紅 > 黃 > 綠
        const statusOrder: Record<string, number> = { '紅': 0, '黃': 1, '綠': 2 }
        const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
        if (statusDiff !== 0) return statusDiff

        // 2. Category alphabetically
        const categoryDiff = a.category.localeCompare(b.category)
        if (categoryDiff !== 0) return categoryDiff

        // 3. Earliest end date (production date)
        const aEndDate = getLatestEndDate(a.phases)
        const bEndDate = getLatestEndDate(b.phases)
        return aEndDate.localeCompare(bEndDate)
    })
}

function getLatestEndDate(phases: Phase[]): string {
    const dates = phases.map(p => p.endDate).filter(d => d)
    if (dates.length === 0) return '9999-99-99'
    return dates.sort()[dates.length - 1] || '9999-99-99'
}

export function generateSlides(projects: Project[]): Slide[] {
    const sorted = sortProjects(projects)
    const slides: Slide[] = []

    // Summary slides (10 projects per page)
    for (let i = 0; i < sorted.length; i += 10) {
        slides.push({
            type: 'summary',
            projects: sorted.slice(i, i + 10)
        })
    }

    // Individual project slides
    for (const project of sorted) {
        slides.push({
            type: 'project',
            project
        })
    }

    return slides
}

// Utility: Get today's date string
export function getTodayString(): string {
    const now = new Date()
    return now.toISOString().split('T')[0]
}
