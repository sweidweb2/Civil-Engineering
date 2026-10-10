import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectProgressTimeline } from '@/features/admin/components/ProjectProgressTimeline'
import { listProjects, type Project } from '@/services/projects'

vi.mock('@/services/projects', () => ({
  listProjects: vi.fn(),
}))

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Team 2 stage',
    description: null,
    code: null,
    ownerId: 'owner',
    address: null,
    city: null,
    country: null,
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2027-02-01T00:00:00.000Z',
    actualStartDate: null,
    actualEndDate: null,
    status: 'IN_PROGRESS',
    progress: 40,
    budget: null,
    currency: 'USD',
    actualCost: null,
    type: 'COMMERCIAL',
    isPublic: false,
    tags: null,
    attachments: null,
    notes: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  }
}

function renderTimeline() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <ProjectProgressTimeline /> },
      { path: '/admin/projects/:id', element: <p>Project detail</p> },
    ],
    { initialEntries: ['/'] },
  )
  const view = render(<RouterProvider router={router} />)
  return { router, ...view }
}

describe('ProjectProgressTimeline', () => {
  beforeEach(() => {
    vi.mocked(listProjects).mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows in-progress projects on a shared axis and folds the chart', async () => {
    vi.mocked(listProjects).mockResolvedValue({
      data: [
        project(),
        project({
          id: 'draft',
          name: 'Draft site',
          status: 'DRAFT',
          progress: 0,
        }),
      ],
      meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
    })

    const user = userEvent.setup()
    renderTimeline()

    expect(await screen.findByText('Today')).toBeInTheDocument()
    expect(screen.getAllByText('Team 2 stage').length).toBeGreaterThan(0)
    expect(screen.getAllByText('40%').length).toBeGreaterThan(0)
    expect(screen.queryByText('Draft site')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: /in progress timeline/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('in-progress-timeline')).toHaveClass('grid-rows-[0fr]')
  })

  it('opens the project when a bar is chosen', async () => {
    vi.mocked(listProjects).mockResolvedValue({
      data: [project()],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    })

    const { router, container } = renderTimeline()

    const [projectButton] = await within(container).findAllByRole('button', { name: /Team 2 stage/i })
    fireEvent.click(projectButton!)
    expect(router.state.location.pathname).toBe('/admin/projects/p1')
  })

  it('explains when nothing is in progress', async () => {
    vi.mocked(listProjects).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
    })

    renderTimeline()
    expect(await screen.findByText('No projects are currently in progress.')).toBeInTheDocument()
  })
})
