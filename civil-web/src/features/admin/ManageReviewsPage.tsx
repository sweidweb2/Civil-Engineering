import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock, Eye, Pencil, Plus, Star, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import {
  deleteReview,
  listReviews,
  type Review,
  type ReviewStatus,
  type ReviewStatusCounts,
  reviewStatusLabel,
  updateReview,
} from '@/services/reviews'

import { DataPanel, RowActions, ToolbarCard } from './components/DataPanel'
import { ReviewFormDialog } from './components/ReviewFormDialog'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { ellipsis, PAGE_SIZE, pageCount } from './lib/text'

const TABS: Array<{ value: ReviewStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
]

const EMPTY_COUNTS: ReviewStatusCounts = { PENDING: 0, ACCEPTED: 0, REJECTED: 0 }

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge variant={status === 'ACCEPTED' ? 'default' : 'outline'}>{reviewStatusLabel(status)}</Badge>
}

function formatWhen(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function ReadOnlyField({
  id,
  label,
  value,
  multiline = false,
}: {
  id: string
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea id={id} readOnly rows={4} value={value} />
      ) : (
        <Input id={id} readOnly value={value} />
      )}
    </div>
  )
}

export function ManageReviewsPage() {
  useDocumentTitle('Manage reviews')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<ReviewStatus | 'all'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Review | null>(null)
  const [viewing, setViewing] = useState<Review | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const load = useCallback(
    () =>
      listReviews(page, PAGE_SIZE, {
        q: debouncedQuery || undefined,
        status: tab === 'all' ? undefined : tab,
      }),
    [debouncedQuery, page, tab],
  )
  const remote = useRemoteData(load)
  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const counts = remote.status === 'success' ? remote.data.meta.statusCounts : EMPTY_COUNTS
  const totalPages = pageCount(total)
  const reviewTotal = counts.PENDING + counts.ACCEPTED + counts.REJECTED

  async function setStatus(id: string, status: ReviewStatus) {
    setBusyId(id)
    try {
      await updateReview(id, { status })
      toast.message(status === 'ACCEPTED' ? 'Review accepted' : 'Review rejected')
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update review')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setBusyId(id)
    try {
      await deleteReview(id)
      toast.message('Review removed')
      setPendingDelete(null)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove review')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Manage reviews"
        description="Directory reviews and ratings. Accept to publish, reject to hide."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus />
            Create
          </Button>
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Star} label="Reviews" value={reviewTotal} />
        <StatCard icon={Clock} label="Pending" value={counts.PENDING} />
        <StatCard icon={CheckCircle2} label="Accepted" value={counts.ACCEPTED} />
        <StatCard icon={XCircle} label="Rejected" value={counts.REJECTED} />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === 'all' || value === 'PENDING' || value === 'ACCEPTED' || value === 'REJECTED') {
            setTab(value)
            setPage(1)
          }
        }}
        className="min-w-0 gap-3"
      >
        <ToolbarCard>
          <TabsList>
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter reviews…"
            aria-label="Filter reviews"
            className="max-w-sm"
          />
        </ToolbarCard>

        <TabsContent value={tab}>
          <AsyncState
            isLoading={remote.isLoading}
            error={remote.isError ? remote.error : undefined}
            onRetry={() => void remote.refetch()}
            loadingFallback={<TableSkeleton columns={5} />}
          >
            <DataPanel
              footer={
                <TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
              }
            >
              <Table startIndex={(page - 1) * PAGE_SIZE}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Author</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No reviews match.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-40" title={row.author.email}>
                          <div className="min-w-0">
                            <p className="truncate">{ellipsis(row.author.displayName, 22)}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {ellipsis(row.author.email, 24)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-56">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate" title={row.targetName}>
                              {ellipsis(row.targetName, 22)}
                            </p>
                            <Badge variant="outline" className="shrink-0">
                              {row.targetType.toLowerCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{row.rating}/5</TableCell>
                        <TableCell>
                          <ReviewStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busyId === row.id}
                              onClick={() => setViewing(row)}
                            >
                              <Eye />
                              View
                            </Button>
                            {row.status !== 'ACCEPTED' ? (
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyId === row.id}
                                onClick={() => void setStatus(row.id, 'ACCEPTED')}
                              >
                                Accept
                              </Button>
                            ) : null}
                            {row.status !== 'REJECTED' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busyId === row.id}
                                onClick={() => void setStatus(row.id, 'REJECTED')}
                              >
                                Reject
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              aria-label={`Edit review by ${row.author.displayName}`}
                              disabled={busyId === row.id}
                              onClick={() => setEditing(row)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
                              aria-label={`Remove review by ${row.author.displayName}`}
                              disabled={busyId === row.id}
                              onClick={() => setPendingDelete(row)}
                            >
                              <Trash2 />
                            </Button>
                          </RowActions>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DataPanel>
          </AsyncState>
        </TabsContent>
      </Tabs>

      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review details</DialogTitle>
            <DialogDescription>
              {viewing ? `Review by ${viewing.author.displayName}.` : 'Review details.'}
            </DialogDescription>
          </DialogHeader>
          {viewing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyField id="review-view-author" label="Author" value={viewing.author.displayName} />
              <ReadOnlyField id="review-view-email" label="Email" value={viewing.author.email} />
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="review-view-target">Target</Label>
                <div className="flex min-w-0 items-center gap-2">
                  <Input id="review-view-target" readOnly value={viewing.targetName} />
                  <Badge variant="outline" className="shrink-0">
                    {viewing.targetType.toLowerCase()}
                  </Badge>
                </div>
              </div>
              <ReadOnlyField id="review-view-rating" label="Rating" value={`${viewing.rating}/5`} />
              <ReadOnlyField id="review-view-status" label="Status" value={reviewStatusLabel(viewing.status)} />
              <ReadOnlyField id="review-view-created" label="Created" value={formatWhen(viewing.createdAt)} />
              <ReadOnlyField id="review-view-updated" label="Updated" value={formatWhen(viewing.updatedAt)} />
              <div className="sm:col-span-2">
                <ReadOnlyField id="review-view-comment" label="Comment" value={viewing.comment} multiline />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewFormDialog
        open={createOpen}
        mode="create"
        onOpenChange={setCreateOpen}
        onSaved={() => {
          setPage(1)
          void remote.refetch()
        }}
      />
      <ReviewFormDialog
        open={editing !== null}
        mode="edit"
        review={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        onSaved={() => void remote.refetch()}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove review</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the review from {pendingDelete?.author.displayName ?? 'this author'}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
