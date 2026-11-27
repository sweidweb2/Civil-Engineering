export type ProjectProductivityHourEntry = {
  id: string
  projectId: string
  /** Calendar day `YYYY-MM-DD`. */
  date: string
  /** Hours as decimal string with up to 1 place (e.g. `"8"`, `"8.5"`). */
  hours: string
  createdAt: string
  updatedAt: string
}
